BEGIN;

CREATE FUNCTION public.file_application(
  p_id uuid,
  p_applicant_id uuid,
  p_type_id uuid,
  p_title text,
  p_abstract text,
  p_group_id uuid,
  p_budget numeric,
  p_tutor_endorsed boolean,
  p_documents jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_type public.application_types;
  v_audit public.audit_history;
  v_year int := EXTRACT(YEAR FROM statement_timestamp() AT TIME ZONE 'America/Bogota');
  v_prefix text := 'Radicado ' || v_year || '-';
  v_next text;
BEGIN
  IF v_actor IS NULL OR v_actor IS DISTINCT FROM p_applicant_id OR NOT (
    public.auth_user_has_role('researcher')
    OR public.auth_user_has_role('investigador')
    OR public.auth_user_has_role('admin')
  ) THEN
    RAISE EXCEPTION 'La sesión no tiene permiso para radicar esta solicitud.' USING ERRCODE = '42501';
  END IF;

  -- Serialize retries for the same submission, including across a year boundary.
  PERFORM pg_advisory_xact_lock(24001, hashtext(p_id::text));
  SELECT * INTO v_application FROM public.applications WHERE id = p_id;
  IF FOUND THEN
    IF v_application.applicant_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'La solicitud pertenece a otra cuenta.' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO STRICT v_audit FROM public.audit_history
    WHERE application_id = p_id AND action = 'RADICACION_INICIAL' AND actor_id = v_actor
    ORDER BY created_at, id LIMIT 1;
  ELSE
    SELECT * INTO v_type FROM public.application_types WHERE id = p_type_id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El tipo de solicitud no existe o está inactivo.' USING ERRCODE = '22023';
    END IF;

    IF NULLIF(btrim(p_title), '') IS NULL OR NULLIF(btrim(p_abstract), '') IS NULL
      OR p_budget IS NULL OR p_budget < 0 OR jsonb_typeof(p_documents) IS DISTINCT FROM 'array'
    THEN
      RAISE EXCEPTION 'Los datos de la solicitud son inválidos.' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_documents) AS document(requirement_id uuid)
      LEFT JOIN public.requirements AS requirement
        ON requirement.id = document.requirement_id AND requirement.application_type_id = p_type_id
      GROUP BY document.requirement_id, requirement.id
      HAVING requirement.id IS NULL OR count(*) > 1
    ) OR EXISTS (
      SELECT 1 FROM public.requirements AS requirement
      WHERE requirement.application_type_id = p_type_id AND requirement.is_mandatory
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_to_recordset(p_documents) AS document(requirement_id uuid)
          WHERE document.requirement_id = requirement.id
        )
    ) THEN
      RAISE EXCEPTION 'Revise los documentos obligatorios, duplicados o ajenos al trámite.' USING ERRCODE = '22023';
    END IF;

    -- Serialize numbering across applicants and continue the existing yearly series.
    PERFORM pg_advisory_xact_lock(24002, v_year);
    SELECT (COALESCE(max(substring(filing_number FROM length(v_prefix) + 1)::numeric), 0) + 1)::text
    INTO v_next
    FROM public.applications
    WHERE filing_number ~ ('^' || v_prefix || '[0-9]+$');

    INSERT INTO public.applications (
      id, filing_number, application_type_id, applicant_id, title, abstract,
      research_group_id, budget_requested, current_status, is_tutor_endorsed, requires_committee
    ) VALUES (
      p_id, v_prefix || lpad(v_next, greatest(3, length(v_next)), '0'), p_type_id, v_actor,
      btrim(p_title), btrim(p_abstract), p_group_id, p_budget, 'RADICADA', p_tutor_endorsed,
      v_type.requires_committee
    ) RETURNING * INTO v_application;

    INSERT INTO public.application_documents (
      application_id, requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256, mime_type,
      validation_status
    )
    SELECT p_id, requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256, mime_type, 'PENDIENTE'
    FROM jsonb_to_recordset(p_documents) AS document(
      requirement_id uuid, file_name text, file_path text, file_size_bytes bigint,
      file_hash_sha256 text, mime_type text
    );

    INSERT INTO public.audit_history (application_id, actor_id, action, new_status, details)
    VALUES (p_id, v_actor, 'RADICACION_INICIAL', 'RADICADA', jsonb_build_object(
      'filing_number', v_application.filing_number, 'title', v_application.title,
      'applicant_name', (SELECT full_name FROM public.profiles WHERE id = v_actor),
      'documents_count', jsonb_array_length(p_documents),
      'type_code', v_type.code, 'type_name', v_type.name, 'timestamp', v_application.created_at
    )) RETURNING * INTO v_audit;
  END IF;

  RETURN jsonb_build_object(
    'application', to_jsonb(v_application),
    'documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(document)) FROM public.application_documents AS document
      WHERE document.application_id = p_id
    ), '[]'::jsonb),
    'audit', to_jsonb(v_audit)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.file_application(uuid, uuid, uuid, text, text, uuid, numeric, boolean, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_application(uuid, uuid, uuid, text, text, uuid, numeric, boolean, jsonb)
  TO authenticated;

DROP POLICY applications_insert_policy ON public.applications;

ALTER POLICY audit_insert_policy ON public.audit_history
  WITH CHECK (
    action <> 'RADICACION_INICIAL'
    AND actor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.applications AS application
      WHERE application.id = audit_history.application_id
    )
  );

COMMIT;
