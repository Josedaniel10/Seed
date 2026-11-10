BEGIN;

CREATE FUNCTION public.validate_application_document(
  p_application_id uuid, p_document_id uuid, p_file_hash text,
  p_status text, p_observations text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_document public.application_documents;
  v_audit public.audit_history;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_actor AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cuenta activa de Supabase Auth necesita un perfil activo con el mismo UUID.' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.auth_user_has_role('administrative') OR public.auth_user_has_role('administrativo')
    OR public.auth_user_has_role('secretary') OR public.auth_user_has_role('secretario')
    OR public.auth_user_has_role('admin')) THEN
    RAISE EXCEPTION 'La cuenta no tiene permiso para validar documentos.' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('VALIDO', 'VALID', 'RECHAZADO', 'REJECTED')
    OR (p_status IN ('RECHAZADO', 'REJECTED') AND NULLIF(btrim(p_observations), '') IS NULL) THEN
    RAISE EXCEPTION 'Indique un dictamen válido y justifique los rechazos.' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.applications WHERE id = p_application_id
    AND current_status IN ('RADICADA', 'SUBMITTED', 'PENDIENTE_DOCUMENTOS', 'PENDING_DOCUMENTS')
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud ya no está disponible para validación documental.' USING ERRCODE = '40001';
  END IF;

  UPDATE public.application_documents
  SET validation_status = p_status, validation_observations = NULLIF(btrim(p_observations), ''),
      validated_by = v_actor, validated_at = statement_timestamp()
  WHERE id = p_document_id AND application_id = p_application_id AND file_hash_sha256 = p_file_hash
  RETURNING * INTO v_document;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El documento cambió o ya no existe. Recargue el expediente.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.audit_history (application_id, actor_id, action, details)
  VALUES (p_application_id, v_actor,
    CASE WHEN p_status IN ('VALIDO', 'VALID') THEN 'DOCUMENTO_VALIDADO' ELSE 'DOCUMENTO_RECHAZADO' END,
    jsonb_build_object('requirement_id', v_document.requirement_id, 'file_name', v_document.file_name,
      'status', p_status, 'observations', v_document.validation_observations, 'validated_by_name', v_name,
      'timestamp', v_document.validated_at))
  RETURNING * INTO v_audit;

  RETURN jsonb_build_object('document', to_jsonb(v_document), 'audit', to_jsonb(v_audit));
END;
$$;

CREATE FUNCTION public.transition_application_status(
  p_application_id uuid, p_previous_status text, p_new_status text,
  p_reason text, p_details jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_application public.applications;
  v_audit public.audit_history;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_actor AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cuenta activa de Supabase Auth necesita un perfil activo con el mismo UUID.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_application FROM public.applications
  WHERE id = p_application_id AND current_status = p_previous_status FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El estado del expediente cambió o no tiene permiso para modificarlo. Recargue la solicitud.' USING ERRCODE = '40001';
  END IF;

  IF p_new_status IN ('RECHAZADA', 'REJECTED', 'APROBADA_CON_AJUSTES', 'APPROVED_WITH_ADJUSTMENTS')
    AND NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'La transición exige una justificación escrita.' USING ERRCODE = '22023';
  END IF;

  IF p_new_status IN ('EN_REVISION', 'UNDER_REVIEW') AND EXISTS (
    SELECT 1 FROM public.requirements AS requirement
    WHERE requirement.application_type_id = v_application.application_type_id AND requirement.is_mandatory
      AND NOT EXISTS (
        SELECT 1 FROM public.application_documents AS document
        WHERE document.application_id = p_application_id AND document.requirement_id = requirement.id
          AND document.validation_status IN ('VALIDO', 'VALID')
      )
  ) THEN
    RAISE EXCEPTION 'Hay requisitos obligatorios sin validar en Supabase.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.applications SET current_status = p_new_status, updated_at = statement_timestamp()
  WHERE id = p_application_id RETURNING * INTO v_application;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cuenta no tiene permiso para actualizar esta solicitud.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_history (application_id, actor_id, action, previous_status, new_status, details)
  VALUES (p_application_id, v_actor, 'TRANSICION_ESTADO_' || p_new_status, p_previous_status, p_new_status,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
      'actor_name', v_name, 'reason', p_reason, 'timestamp', v_application.updated_at))
  RETURNING * INTO v_audit;

  RETURN jsonb_build_object('application', to_jsonb(v_application), 'audit', to_jsonb(v_audit));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_application_document(uuid, uuid, text, text, text),
  public.transition_application_status(uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_application_document(uuid, uuid, text, text, text),
  public.transition_application_status(uuid, text, text, text, jsonb) TO authenticated;

COMMIT;
