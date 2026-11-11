BEGIN;
INSERT INTO auth.users(id, email, raw_user_meta_data, raw_app_meta_data) VALUES
  ('70fbc100-0000-4000-8000-000000000001', 'non-deliberation-owner@example.invalid', '{"full_name":"Investigadora de prueba"}', '{}'),
  ('70fbc100-0000-4000-8000-000000000002', 'non-deliberation-secretary@example.invalid', '{"full_name":"Secretaría de prueba"}', '{"seed_initial_role":"secretario"}'),
  ('70fbc100-0000-4000-8000-000000000003', 'non-deliberation-member@example.invalid', '{"full_name":"Integrante con conflicto"}', '{"seed_initial_role":"integrante_comite"}');
INSERT INTO public.application_types(id, code, name)
VALUES ('70fbc100-0000-4000-8000-000000000010', 'TEST-NON-DELIBERATION', 'Prueba de constancias');
INSERT INTO public.research_groups(id, code, name, faculty)
VALUES ('70fbc100-0000-4000-8000-000000000011', 'TEST-NON-DELIBERATION', 'Grupo de prueba', 'Pruebas');
UPDATE public.profiles SET research_group_id = '70fbc100-0000-4000-8000-000000000011'
WHERE id = '70fbc100-0000-4000-8000-000000000003';
INSERT INTO public.applications(id, filing_number, application_type_id, applicant_id, title, current_status, research_group_id)
SELECT ('70fbc100-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'TEST-NON-DELIBERATION-' || n, '70fbc100-0000-4000-8000-000000000010',
  '70fbc100-0000-4000-8000-000000000001', 'Solicitud de prueba ' || n, 'LISTA_COMITE',
  CASE WHEN n = 21 THEN '70fbc100-0000-4000-8000-000000000011'::uuid ELSE NULL END
FROM generate_series(20, 21) n;
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_session uuid;
  v_second_session uuid;
  v_record jsonb;
  v_minute jsonb;
  v_blocked boolean;
  v_test record;
  v_payload jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"70fbc100-0000-4000-8000-000000000002","role":"authenticated"}', true);
  v_session := (public.manage_committee_session('create', '{"session_type":"ORDINARIA","scheduled_at":"2028-02-01T09:00:00-05:00","location_or_url":"Sala de prueba","quorum_required":2}')#>>'{session,id}')::uuid;
  FOR n IN 20..21 LOOP
    PERFORM public.manage_committee_session('add', jsonb_build_object('session_id', v_session,
      'application_id', ('70fbc100-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid));
  END LOOP;
  v_payload := jsonb_build_object('session_id', v_session, 'application_id', '70fbc100-0000-4000-8000-000000000021',
    'reason', 'No se alcanzó el mínimo de participantes habilitados.');
  v_blocked := false;
  BEGIN PERFORM public.manage_committee_session('not_deliberated', v_payload);
  EXCEPTION WHEN raise_exception THEN
    IF position('Cierre la agenda' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Constancy accepted before closing the agenda'; END IF;
  PERFORM public.manage_committee_session('close', jsonb_build_object('session_id', v_session));
  PERFORM public.manage_committee_session('attendance', jsonb_build_object('session_id', v_session,
    'user_id', '70fbc100-0000-4000-8000-000000000002', 'attended', true));
  PERFORM public.manage_committee_session('attendance', jsonb_build_object('session_id', v_session,
    'user_id', '70fbc100-0000-4000-8000-000000000003', 'attended', true));
  FOR v_test IN SELECT * FROM (VALUES
    ('not_deliberated', v_payload || '{"reason":" "}', 'motivo'),
    ('not_deliberated', v_payload || '{"application_id":"70fbc100-0000-4000-8000-000000000020"}', 'suficientes asistentes'),
    ('finalize', jsonb_build_object('session_id', v_session), 'decisión o una constancia')
  ) AS checks(action, payload, message) LOOP
    v_blocked := false;
    BEGIN PERFORM public.manage_committee_session(v_test.action, v_test.payload);
    EXCEPTION WHEN raise_exception THEN
      IF position(v_test.message IN SQLERRM) = 0 THEN RAISE; END IF;
      v_blocked := true;
    END;
    IF NOT v_blocked THEN RAISE EXCEPTION 'Expected guard failed: %', v_test.message; END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '{"sub":"70fbc100-0000-4000-8000-000000000001","role":"authenticated"}', true);
  BEGIN
    PERFORM public.manage_committee_session('not_deliberated', v_payload);
    RAISE EXCEPTION 'Researcher registered a constancy';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims', '{"sub":"70fbc100-0000-4000-8000-000000000002","role":"authenticated"}', true);
  v_record := public.manage_committee_session('not_deliberated', v_payload)->'nonDeliberation';
  IF (v_record->>'eligible_count')::int <> 1 OR (v_record->>'required_count')::int <> 2 THEN
    RAISE EXCEPTION 'Wrong eligibility snapshot';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_record->'attendance_snapshot') participant
    WHERE participant->>'name' = 'Integrante con conflicto' AND participant->>'exclusion_reason' LIKE '%mismo grupo%') THEN
    RAISE EXCEPTION 'Conflict was not captured in the snapshot';
  END IF;
  IF v_record->>'id' IS DISTINCT FROM public.manage_committee_session('not_deliberated', v_payload)#>>'{nonDeliberation,id}' THEN
    RAISE EXCEPTION 'Retry duplicated the constancy';
  END IF;
  IF (SELECT count(*) FROM public.audit_history WHERE application_id = '70fbc100-0000-4000-8000-000000000021'
    AND action = 'SOLICITUD_NO_DELIBERADA') <> 1 THEN RAISE EXCEPTION 'Constancy audit was duplicated'; END IF;
  v_blocked := false;
  BEGIN
    PERFORM public.manage_committee_session('decision', v_payload || '{"decision":"APROBADA","justification":"Intento"}');
  EXCEPTION WHEN raise_exception THEN
    IF position('ya tiene una constancia' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'A constancy and a decision were registered for the same item'; END IF;
  PERFORM public.manage_committee_session('decision', jsonb_build_object('session_id', v_session,
    'application_id', '70fbc100-0000-4000-8000-000000000020', 'decision', 'APROBADA', 'justification', 'Decisión válida'));
  v_blocked := false;
  BEGIN
    PERFORM public.manage_committee_session('not_deliberated', v_payload || '{"application_id":"70fbc100-0000-4000-8000-000000000020"}');
  EXCEPTION WHEN raise_exception THEN
    IF position('ya tiene una decisión' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'A decision was overwritten by a constancy'; END IF;
  PERFORM public.manage_committee_session('finalize', jsonb_build_object('session_id', v_session));
  IF (SELECT current_status FROM public.applications WHERE id = '70fbc100-0000-4000-8000-000000000021') <> 'LISTA_COMITE' THEN
    RAISE EXCEPTION 'The non-deliberated request lost eligibility';
  END IF;
  v_minute := public.manage_committee_minutes('generate', jsonb_build_object('session_id', v_session));
  IF position('No deliberada por falta de quórum' IN v_minute->>'draft_content') = 0
    OR position('mismo grupo' IN v_minute->>'draft_content') = 0
    OR position('Decisión válida' IN v_minute->>'draft_content') = 0 THEN
    RAISE EXCEPTION 'The minutes omitted a decision or constancy';
  END IF;
  v_second_session := (public.manage_committee_session('create', '{"session_type":"ORDINARIA","scheduled_at":"2028-02-15T09:00:00-05:00","location_or_url":"Sala de prueba","quorum_required":2}')#>>'{session,id}')::uuid;
  PERFORM public.manage_committee_session('add', jsonb_build_object('session_id', v_second_session,
    'application_id', '70fbc100-0000-4000-8000-000000000021'));
  PERFORM public.manage_committee_session('close', jsonb_build_object('session_id', v_second_session));
  -- A session with no attendance can be administratively closed once every point has a constancy.
  PERFORM public.manage_committee_session('not_deliberated', v_payload || jsonb_build_object('session_id', v_second_session));
  PERFORM public.manage_committee_session('finalize', jsonb_build_object('session_id', v_second_session));
  PERFORM set_config('test.non_deliberation_id', v_record->>'id', true);
END;
$$;
RESET ROLE;
DO $$
DECLARE v_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.session_non_deliberations SET reason = 'Cambio'
      WHERE id = current_setting('test.non_deliberation_id')::uuid;
  EXCEPTION WHEN raise_exception THEN
    IF position('no se puede modificar' IN SQLERRM) = 0 THEN RAISE; END IF;
    v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'Constancy was mutable'; END IF;
  IF has_table_privilege('authenticated', 'public.session_non_deliberations', 'INSERT')
    OR has_function_privilege('anon', 'public.manage_committee_session(text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Workflow writes could bypass authorization';
  END IF;
END;
$$;
ROLLBACK;
