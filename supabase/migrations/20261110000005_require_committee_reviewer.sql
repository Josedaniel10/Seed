BEGIN;

CREATE OR REPLACE FUNCTION public.assign_application_reviewer(
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
    v_reviewer.role IN ('committee_member', 'integrante_comite')
    OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = p_reviewer_id AND is_active
        AND role IN ('committee_member', 'integrante_comite')
    )
  ) THEN
    RAISE EXCEPTION 'El evaluador debe ser integrante activo del comité.' USING ERRCODE = '22023';
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

NOTIFY pgrst, 'reload schema';

COMMIT;
