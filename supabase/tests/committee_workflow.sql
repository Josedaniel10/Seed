-- Execute against a migrated test database. All fixtures are rolled back.
BEGIN;

INSERT INTO auth.users(id, email, raw_user_meta_data, raw_app_meta_data) VALUES
  ('60fbc100-0000-4000-8000-000000000001', 'committee-owner@example.invalid', '{"full_name":"Investigadora de prueba"}', '{}'),
  ('60fbc100-0000-4000-8000-000000000002', 'committee-secretary@example.invalid', '{"full_name":"Secretaría de prueba"}', '{"seed_initial_role":"secretario"}'),
  ('60fbc100-0000-4000-8000-000000000003', 'committee-member@example.invalid', '{"full_name":"Integrante de prueba"}', '{"seed_initial_role":"integrante_comite"}');

INSERT INTO public.application_types(id, code, name)
VALUES ('60fbc100-0000-4000-8000-000000000010', 'TEST-COMMITTEE', 'Trámite de prueba de comité');
INSERT INTO public.research_groups(id, code, name, faculty)
VALUES ('60fbc100-0000-4000-8000-000000000011', 'TEST-COMMITTEE', 'Grupo de prueba', 'Pruebas');
UPDATE public.profiles SET research_group_id = '60fbc100-0000-4000-8000-000000000011'
WHERE id IN ('60fbc100-0000-4000-8000-000000000001', '60fbc100-0000-4000-8000-000000000003');
INSERT INTO public.applications(id, filing_number, application_type_id, applicant_id, title, current_status, research_group_id)
SELECT ('60fbc100-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'TEST-COMMITTEE-' || n, '60fbc100-0000-4000-8000-000000000010',
  '60fbc100-0000-4000-8000-000000000001', 'Solicitud de prueba ' || n,
  CASE WHEN n = 25 THEN 'RADICADA' WHEN n = 21 THEN 'COMMITTEE_READY' ELSE 'LISTA_COMITE' END,
  CASE WHEN n = 24 THEN '60fbc100-0000-4000-8000-000000000011'::uuid ELSE NULL END
FROM generate_series(20, 25) n;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_session uuid;
  v_other uuid;
  v_result jsonb;
  v_minute uuid;
  v_app uuid;
  v_blocked boolean;
  v_test record;
  v_ids jsonb;
  v_count int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"60fbc100-0000-4000-8000-000000000001","role":"authenticated"}', true);
  BEGIN
    PERFORM public.manage_committee_session('create', '{"session_type":"ORDINARIA","scheduled_at":"2028-01-01T09:00:00-05:00","location_or_url":"Prueba","quorum_required":1}');
    RAISE EXCEPTION 'Researcher created a session';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims', '{"sub":"60fbc100-0000-4000-8000-000000000002","role":"authenticated"}', true);
  v_result := public.manage_committee_session('create', '{"session_type":"ORDINARY","scheduled_at":"2028-01-01T09:00:00-05:00","location_or_url":"Sala de prueba","quorum_required":2}');
  v_session := (v_result#>>'{session,id}')::uuid;
  IF v_result#>>'{session,session_type}' <> 'ORDINARIA' THEN RAISE EXCEPTION 'Session type was not normalized'; END IF;
  IF EXISTS (SELECT 1 FROM public.session_attendance WHERE session_id = v_session AND attended) THEN
    RAISE EXCEPTION 'Attendance was preconfirmed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.session_attendance WHERE session_id = v_session
    AND user_id = '60fbc100-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Member missing from attendance'; END IF;
  BEGIN
    UPDATE public.committee_sessions SET is_completed = true WHERE id = v_session;
    RAISE EXCEPTION 'Direct session write bypassed workflow';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  v_other := (public.manage_committee_session('create', '{"session_type":"EXTRAORDINARIA","scheduled_at":"2028-01-02T09:00:00-05:00","location_or_url":"Sala de prueba","quorum_required":2}')#>>'{session,id}')::uuid;

  FOR n IN 20..24 LOOP
    v_app := ('60fbc100-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    PERFORM public.manage_committee_session('add', jsonb_build_object('session_id', v_session, 'application_id', v_app));
  END LOOP;
  SELECT jsonb_agg(id ORDER BY agenda_order DESC) INTO v_ids FROM public.session_agenda WHERE session_id = v_session;
  PERFORM public.manage_committee_session('reorder', jsonb_build_object('session_id', v_session, 'ordered_ids', v_ids));
  IF (SELECT application_id FROM public.session_agenda WHERE session_id = v_session AND agenda_order = 1) <>
    '60fbc100-0000-4000-8000-000000000024'::uuid THEN RAISE EXCEPTION 'Reordering did not persist'; END IF;
  PERFORM public.manage_committee_session('speaker', jsonb_build_object('session_id', v_session,
    'application_id', '60fbc100-0000-4000-8000-000000000020', 'speaker_id', '60fbc100-0000-4000-8000-000000000003'));

  FOR v_test IN SELECT * FROM (VALUES
    ('add', jsonb_build_object('session_id', v_session, 'application_id', '60fbc100-0000-4000-8000-000000000025'), 'listas para comité'),
    ('add', jsonb_build_object('session_id', v_other, 'application_id', '60fbc100-0000-4000-8000-000000000020'), 'sesión pendiente'),
    ('speaker', jsonb_build_object('session_id', v_session, 'application_id', '60fbc100-0000-4000-8000-000000000024', 'speaker_id', '60fbc100-0000-4000-8000-000000000003'), 'conflicto de interés'),
    ('decision', jsonb_build_object('session_id', v_session, 'application_id', '60fbc100-0000-4000-8000-000000000020', 'decision', 'APROBADA', 'justification', 'Prueba'), 'Cierre la agenda')
  ) AS checks(action, payload, message) LOOP
    v_blocked := false;
    BEGIN PERFORM public.manage_committee_session(v_test.action, v_test.payload);
    EXCEPTION WHEN raise_exception THEN
      IF position(v_test.message IN SQLERRM) = 0 THEN RAISE; END IF;
      v_blocked := true;
    END;
    IF NOT v_blocked THEN RAISE EXCEPTION 'Expected guard failed: %', v_test.message; END IF;
  END LOOP;
  PERFORM public.manage_committee_session('remove', jsonb_build_object('session_id', v_session,
    'application_id', '60fbc100-0000-4000-8000-000000000024'));
  PERFORM public.manage_committee_session('add', jsonb_build_object('session_id', v_session,
    'application_id', '60fbc100-0000-4000-8000-000000000024'));
  PERFORM public.manage_committee_session('close', jsonb_build_object('session_id', v_session));
  v_blocked := false;
  BEGIN
    PERFORM public.manage_committee_session('decision', jsonb_build_object('session_id', v_session,
      'application_id', '60fbc100-0000-4000-8000-000000000020', 'decision', 'APROBADA', 'justification', 'Prueba'));
  EXCEPTION WHEN raise_exception THEN
    IF position('quórum' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Decision without quorum succeeded'; END IF;

  PERFORM public.manage_committee_session('attendance', jsonb_build_object('session_id', v_session,
    'user_id', '60fbc100-0000-4000-8000-000000000002', 'attended', true));
  PERFORM public.manage_committee_session('attendance', jsonb_build_object('session_id', v_session,
    'user_id', '60fbc100-0000-4000-8000-000000000003', 'attended', true));
  FOR v_test IN SELECT * FROM (VALUES
    ('add', jsonb_build_object('session_id', v_session, 'application_id', '60fbc100-0000-4000-8000-000000000025'), 'cerrada'),
    ('decision', jsonb_build_object('session_id', v_session, 'application_id', '60fbc100-0000-4000-8000-000000000024', 'decision', 'APROBADA', 'justification', 'Prueba'), 'conflicto de interés'),
    ('decision', jsonb_build_object('session_id', v_session, 'application_id', '60fbc100-0000-4000-8000-000000000020', 'decision', 'RECHAZADA', 'justification', '  '), 'justificación'),
    ('finalize', jsonb_build_object('session_id', v_session), 'todos los expedientes')
  ) AS checks(action, payload, message) LOOP
    v_blocked := false;
    BEGIN PERFORM public.manage_committee_session(v_test.action, v_test.payload);
    EXCEPTION WHEN raise_exception THEN
      IF position(v_test.message IN SQLERRM) = 0 THEN RAISE; END IF;
      v_blocked := true;
    END;
    IF NOT v_blocked THEN RAISE EXCEPTION 'Expected guard failed: %', v_test.message; END IF;
  END LOOP;

  FOR v_test IN SELECT * FROM (VALUES (20, 'APPROVED'), (21, 'APPROVED_WITH_ADJUSTMENTS'),
    (22, 'REJECTED'), (23, 'POSTPONED')) AS decisions(n, decision) LOOP
    v_app := ('60fbc100-0000-4000-8000-' || lpad(v_test.n::text, 12, '0'))::uuid;
    PERFORM public.manage_committee_session('decision', jsonb_build_object('session_id', v_session,
      'application_id', v_app, 'decision', v_test.decision, 'justification', 'Fundamento de prueba con acentos áéíóú'));
  END LOOP;
  IF (SELECT current_status FROM public.applications WHERE filing_number = 'TEST-COMMITTEE-23') <> 'LISTA_COMITE' THEN
    RAISE EXCEPTION 'Postponed request lost eligibility';
  END IF;
  IF (SELECT current_status FROM public.applications WHERE filing_number = 'TEST-COMMITTEE-21') <> 'APROBADA_CON_AJUSTES' THEN
    RAISE EXCEPTION 'Decision did not update the request';
  END IF;
  v_blocked := false;
  BEGIN
    PERFORM public.manage_committee_session('decision', jsonb_build_object('session_id', v_session,
      'application_id', '60fbc100-0000-4000-8000-000000000020', 'decision', 'RECHAZADA', 'justification', 'Otro resultado'));
  EXCEPTION WHEN raise_exception THEN
    IF position('ya está registrada' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Decision was overwritten'; END IF;

  -- The conflicted group can be addressed in a later session with sufficient eligible attendance.
  -- For this fixture, end membership in the group before recording its decision.
  PERFORM set_config('test.committee_session', v_session::text, true);
END;
$$;
RESET ROLE;
UPDATE public.profiles SET research_group_id = NULL WHERE id = '60fbc100-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_session uuid := current_setting('test.committee_session')::uuid;
  v_minute jsonb;
  v_blocked boolean := false;
BEGIN
  PERFORM public.manage_committee_session('decision', jsonb_build_object('session_id', v_session,
    'application_id', '60fbc100-0000-4000-8000-000000000024', 'decision', 'APROBADA', 'justification', 'Sin conflicto de grupo'));
  PERFORM public.manage_committee_session('finalize', jsonb_build_object('session_id', v_session));
  v_minute := public.manage_committee_minutes('generate', jsonb_build_object('session_id', v_session));
  IF position('Investigadora de prueba' IN v_minute->>'draft_content') = 0 THEN RAISE EXCEPTION 'Applicant missing from minutes'; END IF;
  IF position('Fundamento de prueba' IN v_minute->>'draft_content') = 0 THEN RAISE EXCEPTION 'Justification missing from minutes'; END IF;
  IF v_minute->>'id' IS DISTINCT FROM public.manage_committee_minutes('generate', jsonb_build_object('session_id', v_session))->>'id' THEN
    RAISE EXCEPTION 'Generating the draft twice created duplicates';
  END IF;
  v_minute := public.manage_committee_minutes('update', jsonb_build_object('minute_id', v_minute->>'id',
    'draft_content', v_minute->>'draft_content' || E'\nCompromiso adicional de seguimiento.'));
  v_minute := public.manage_committee_minutes('approve', jsonb_build_object('minute_id', v_minute->>'id'));
  IF (v_minute->>'is_approved')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Approval not saved'; END IF;
  BEGIN
    PERFORM public.manage_committee_minutes('update', jsonb_build_object('minute_id', v_minute->>'id', 'draft_content', 'Cambio'));
  EXCEPTION WHEN raise_exception THEN
    IF position('inmutable' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Approved minutes were edited'; END IF;

  PERFORM set_config('request.jwt.claims', '{"sub":"60fbc100-0000-4000-8000-000000000001","role":"authenticated"}', true);
  IF (SELECT count(*) FROM public.session_decisions WHERE session_id = v_session) <> 5 THEN
    RAISE EXCEPTION 'Applicant cannot read decisions for owned requests';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_history WHERE application_id = '60fbc100-0000-4000-8000-000000000020'
    AND action = 'DECISION_COMITE_APROBADA' AND details->>'justification' IS NOT NULL) THEN
    RAISE EXCEPTION 'Decision and audit were not committed together';
  END IF;
END;
$$;
ROLLBACK;
