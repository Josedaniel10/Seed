BEGIN;

CREATE FUNCTION public.assign_application_reviewer(
  p_application_id uuid, p_reviewer_id uuid, p_deadline date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_reviewer public.profiles;
  v_assignment public.reviewer_assignments;
  v_audit public.audit_history;
  v_deactivated int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor AND is_active)
    OR NOT (public.auth_user_has_role('secretary') OR public.auth_user_has_role('secretario')
      OR public.auth_user_has_role('admin')) THEN
    RAISE EXCEPTION 'La cuenta no tiene permiso para asignar evaluadores.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_application FROM public.applications
  WHERE id = p_application_id AND current_status IN ('EN_REVISION', 'UNDER_REVIEW') FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud debe estar en revisión técnica.' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_reviewer FROM public.profiles WHERE id = p_reviewer_id AND is_active;
  IF NOT FOUND OR NOT (
    v_reviewer.role IN ('committee_member', 'integrante_comite', 'admin', 'secretary', 'secretario')
    OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = p_reviewer_id AND is_active
        AND role IN ('committee_member', 'integrante_comite', 'admin', 'secretary', 'secretario')
    )
  ) THEN
    RAISE EXCEPTION 'El evaluador debe tener un perfil y un rol habilitados.' USING ERRCODE = '22023';
  END IF;

  IF v_application.applicant_id = p_reviewer_id OR v_application.research_group_id = v_reviewer.research_group_id THEN
    RAISE EXCEPTION 'El evaluador tiene un conflicto de interés con la solicitud.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reviewer_assignments SET is_active = false
  WHERE application_id = p_application_id AND is_active;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  INSERT INTO public.reviewer_assignments (application_id, reviewer_id, deadline_date, assigned_by)
  VALUES (p_application_id, p_reviewer_id, p_deadline, v_actor) RETURNING * INTO v_assignment;

  INSERT INTO public.audit_history (application_id, actor_id, action, details)
  VALUES (p_application_id, v_actor,
    CASE WHEN v_deactivated > 0 THEN 'REASIGNACION_EVALUADOR' ELSE 'ASIGNACION_EVALUADOR' END,
    jsonb_build_object('reviewer_id', p_reviewer_id, 'reviewer_name', v_reviewer.full_name,
      'assigner_name', (SELECT full_name FROM public.profiles WHERE id = v_actor),
      'deadline_date', p_deadline, 'previous_deactivated_count', v_deactivated,
      'timestamp', v_assignment.created_at))
  RETURNING * INTO v_audit;

  RETURN jsonb_build_object('assignment', to_jsonb(v_assignment), 'audit', to_jsonb(v_audit));
END;
$$;

CREATE FUNCTION public.submit_application_review(
  p_application_id uuid, p_assignment_id uuid, p_concept text, p_justification text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_assignment public.reviewer_assignments;
  v_audit public.audit_history;
  v_concept text := CASE p_concept WHEN 'UNFAVORABLE' THEN 'NO_FAVORABLE'
    WHEN 'FAVORABLE_WITH_ADJUSTMENTS' THEN 'FAVORABLE_CON_AJUSTES' ELSE p_concept END;
  v_previous text;
  v_next text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor AND is_active) THEN
    RAISE EXCEPTION 'La cuenta necesita un perfil activo para emitir un concepto.' USING ERRCODE = '42501';
  END IF;

  IF v_concept IS NULL OR v_concept NOT IN ('FAVORABLE', 'FAVORABLE_CON_AJUSTES', 'NO_FAVORABLE')
    OR NULLIF(btrim(p_justification), '') IS NULL THEN
    RAISE EXCEPTION 'Seleccione un concepto válido y escriba su justificación.' USING ERRCODE = '22023';
  END IF;

  SELECT current_status INTO v_previous FROM public.applications
  WHERE id = p_application_id AND current_status IN ('EN_REVISION', 'UNDER_REVIEW') FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud ya no está en revisión técnica.' USING ERRCODE = '40001';
  END IF;

  UPDATE public.reviewer_assignments SET concept = v_concept, concept_date = statement_timestamp()
  WHERE id = p_assignment_id AND application_id = p_application_id AND reviewer_id = v_actor AND is_active
  RETURNING * INTO v_assignment;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La sesión no tiene una asignación activa para este expediente.' USING ERRCODE = '42501';
  END IF;

  v_next := CASE WHEN v_concept = 'NO_FAVORABLE' THEN 'RECHAZADA' ELSE 'LISTA_COMITE' END;
  UPDATE public.applications SET current_status = v_next, updated_at = v_assignment.concept_date
  WHERE id = p_application_id RETURNING * INTO v_application;

  INSERT INTO public.audit_history (application_id, actor_id, action, previous_status, new_status, details)
  VALUES (p_application_id, v_actor, 'TRANSICION_ESTADO_' || v_next, v_previous, v_next,
    jsonb_build_object('actor_name', (SELECT full_name FROM public.profiles WHERE id = v_actor),
      'reason', btrim(p_justification), 'reviewer_concept', v_concept,
      'concept_date', v_assignment.concept_date, 'timestamp', v_assignment.concept_date))
  RETURNING * INTO v_audit;

  RETURN jsonb_build_object('application', to_jsonb(v_application),
    'assignment', to_jsonb(v_assignment), 'audit', to_jsonb(v_audit));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_application_reviewer(uuid, uuid, date),
  public.submit_application_review(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_application_reviewer(uuid, uuid, date),
  public.submit_application_review(uuid, uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
