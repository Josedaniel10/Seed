BEGIN;

CREATE FUNCTION public.finalize_documentary_validation(p_application_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_app public.applications;
  v_last public.audit_history;
  v_audit public.audit_history;
  v_requirement record;
  v_versions jsonb;
  v_audits jsonb := '[]'::jsonb;
  v_result jsonb;
  v_target text;
  v_reason text;
  v_rejected boolean := false;
  v_corrections boolean := false;
BEGIN
  IF NOT (public.auth_user_has_role('administrative') OR public.auth_user_has_role('administrativo')
    OR public.auth_user_has_role('secretary') OR public.auth_user_has_role('secretario') OR public.auth_user_has_role('admin')) THEN
    RAISE EXCEPTION 'La cuenta no tiene permiso para finalizar la validación documental.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_app FROM public.applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM public.application_documents WHERE application_id = p_application_id FOR UPDATE;
  SELECT COALESCE(jsonb_object_agg(d.id::text, d.file_hash_sha256 || ':' ||
    to_char(d.uploaded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), '{}'::jsonb)
    INTO v_versions FROM public.application_documents d WHERE d.application_id = p_application_id;
  SELECT * INTO v_last FROM public.audit_history WHERE application_id = p_application_id
    AND action = 'VALIDACION_DOCUMENTAL_FINALIZADA' ORDER BY created_at DESC, id DESC LIMIT 1;
  IF FOUND AND v_last.details->'document_versions' = v_versions THEN
    RETURN jsonb_build_object('application', to_jsonb(v_app), 'audits', jsonb_build_array(to_jsonb(v_last)));
  END IF;
  IF v_app.current_status NOT IN ('RADICADA', 'SUBMITTED', 'PENDIENTE_DOCUMENTOS', 'PENDING_DOCUMENTS') THEN
    RAISE EXCEPTION 'La solicitud ya no está disponible para validación documental.' USING ERRCODE = '40001';
  END IF;
  FOR v_requirement IN
    SELECT r.name, r.is_subsanable, d.id AS document_id, d.validation_status
    FROM public.requirements r LEFT JOIN public.application_documents d
      ON d.requirement_id = r.id AND d.application_id = p_application_id
    WHERE r.application_type_id = v_app.application_type_id AND r.is_mandatory
  LOOP
    IF v_requirement.document_id IS NOT NULL AND v_requirement.validation_status IN ('PENDING', 'PENDIENTE') THEN
      RAISE EXCEPTION 'El requisito obligatorio "%" aún no ha sido dictaminado como Válido o Rechazado.', v_requirement.name
        USING ERRCODE = '22023';
    END IF;
    IF v_requirement.document_id IS NULL OR v_requirement.validation_status IN ('REJECTED', 'RECHAZADO') THEN
      IF v_requirement.is_subsanable THEN v_corrections := true; ELSE v_rejected := true; END IF;
    END IF;
  END LOOP;
  v_target := CASE WHEN v_rejected THEN 'RECHAZADA' WHEN v_corrections THEN 'PENDIENTE_DOCUMENTOS' ELSE 'EN_REVISION' END;
  v_reason := CASE WHEN v_rejected THEN 'Rechazo directo en validación: requisito esencial no subsanable insatisfecho o rechazado.'
    WHEN v_corrections THEN 'Validación documental finalizada. Pendiente de correcciones del investigador.'
    ELSE 'Validación documental aprobada. Expediente habilitado para evaluación técnica.' END;
  IF public.notification_status_label(v_app.current_status) <> public.notification_status_label(v_target) THEN
    v_result := public.transition_application_status(v_app.id, v_app.current_status, v_target, v_reason,
      '{"validation_type":"ADMINISTRATIVA_DOCUMENTAL"}'::jsonb);
    v_audits := jsonb_build_array(v_result->'audit');
    SELECT * INTO v_app FROM public.applications WHERE id = p_application_id;
  END IF;
  INSERT INTO public.audit_history(application_id, actor_id, action, previous_status, new_status, details, created_at)
    VALUES (v_app.id, auth.uid(), 'VALIDACION_DOCUMENTAL_FINALIZADA', v_app.current_status, v_app.current_status,
      jsonb_build_object('document_versions', v_versions, 'reason', v_reason,
        'actor_name', (SELECT full_name FROM public.profiles WHERE id = auth.uid())), clock_timestamp())
    RETURNING * INTO v_audit;
  RETURN jsonb_build_object('application', to_jsonb(v_app), 'audits', v_audits || jsonb_build_array(to_jsonb(v_audit)));
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_documentary_validation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_documentary_validation(uuid) TO authenticated;
-- A client may not forge a closure to hide a request from the validation queue.
ALTER POLICY audit_insert_policy ON public.audit_history WITH CHECK (
  action NOT IN ('RADICACION_INICIAL', 'VALIDACION_DOCUMENTAL_FINALIZADA')
  AND actor_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = audit_history.application_id)
);
CREATE INDEX audit_documentary_closure ON public.audit_history(application_id, created_at DESC, id DESC)
  WHERE action = 'VALIDACION_DOCUMENTAL_FINALIZADA';
NOTIFY pgrst, 'reload schema';
COMMIT;
