-- Run against a migrated test database. Fixtures and notifications are rolled back.
BEGIN;
INSERT INTO auth.users(id, email, raw_user_meta_data, raw_app_meta_data) VALUES
 ('80fbc100-0000-4000-8000-000000000001', 'notification-owner@example.invalid', '{"full_name":"Investigadora"}', '{}'),
 ('80fbc100-0000-4000-8000-000000000002', 'notification-other@example.invalid', '{"full_name":"Otra cuenta"}', '{}'),
 ('80fbc100-0000-4000-8000-000000000003', 'notification-secretary@example.invalid', '{"full_name":"Secretaría"}', '{"seed_initial_role":"secretario"}'),
 ('80fbc100-0000-4000-8000-000000000004', 'notification-reviewer@example.invalid', '{"full_name":"Evaluador"}', '{"seed_initial_role":"integrante_comite"}'),
 ('80fbc100-0000-4000-8000-000000000005', 'notification-reviewer2@example.invalid', '{"full_name":"Evaluador 2"}', '{"seed_initial_role":"integrante_comite"}');
INSERT INTO public.application_types(id, code, name) VALUES
 ('80fbc100-0000-4000-8000-000000000010', 'TEST-NOTIFICATIONS', 'Prueba de notificaciones');
-- A second role must not cause duplicate notifications.
INSERT INTO public.user_roles(user_id, role) VALUES ('80fbc100-0000-4000-8000-000000000003', 'secretary');

SET LOCAL ROLE authenticated;
DO $$
DECLARE
 v_app uuid := '80fbc100-0000-4000-8000-000000000020';
 v_owner uuid := '80fbc100-0000-4000-8000-000000000001';
 v_secretary uuid := '80fbc100-0000-4000-8000-000000000003';
 v_reviewer uuid := '80fbc100-0000-4000-8000-000000000004';
 v_reviewer2 uuid := '80fbc100-0000-4000-8000-000000000005';
 v_session uuid; v_assignment uuid; v_minute uuid; v_notification uuid; v_count int; v_result jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
 PERFORM public.file_application(v_app, v_owner, '80fbc100-0000-4000-8000-000000000010',
   'Investigación de prueba', 'Resumen de prueba', NULL, 0, false, '[]');
 SET CONSTRAINTS ALL IMMEDIATE;
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'SOLICITUD_RADICADA') <> 1 THEN
   RAISE EXCEPTION 'Filing did not notify its owner'; END IF;
 PERFORM public.file_application(v_app, v_owner, '80fbc100-0000-4000-8000-000000000010',
   'Investigación de prueba', 'Resumen de prueba', NULL, 0, false, '[]');
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app) <> 1 THEN
   RAISE EXCEPTION 'Filing retry duplicated notification'; END IF;
 SELECT id INTO v_notification FROM public.notifications WHERE application_id = v_app LIMIT 1;
 UPDATE public.notifications SET is_read = true WHERE id = v_notification;
 IF NOT (SELECT is_read FROM public.notifications WHERE id = v_notification) THEN RAISE EXCEPTION 'Read state not saved'; END IF;
 BEGIN UPDATE public.notifications SET title = 'Spoofed' WHERE id = v_notification;
   RAISE EXCEPTION 'Client changed notification content'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.notifications SET user_id = v_reviewer WHERE id = v_notification;
   RAISE EXCEPTION 'Client reassigned notification'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.notifications WHERE id = v_notification;
   RAISE EXCEPTION 'Client deleted notification'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.emit_notification(v_owner, 'spoof', 'FAKE', 'Fake', 'Fake');
   RAISE EXCEPTION 'Client emitted notification'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.notifications(user_id, event_key, type, title, message) VALUES (v_owner, 'fake', 'FAKE', 'Fake', 'Fake');
   RAISE EXCEPTION 'Client inserted notification'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000002","role":"authenticated"}', true);
 IF EXISTS (SELECT 1 FROM public.notifications) THEN RAISE EXCEPTION 'Second user read another inbox'; END IF;
 UPDATE public.notifications SET is_read = true;
 GET DIAGNOSTICS v_count = ROW_COUNT;
 IF v_count <> 0 THEN RAISE EXCEPTION 'Second user modified another inbox'; END IF;

 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_secretary, 'role', 'authenticated')::text, true);
 -- Secretaries do not validate documents, but can transition a request with no mandatory requirements.
 PERFORM public.transition_application_status(v_app, 'RADICADA', 'EN_REVISION', 'Documentación completa', '{}');
 v_result := public.assign_application_reviewer(v_app, v_reviewer, current_date + 5);
 v_result := public.assign_application_reviewer(v_app, v_reviewer2, current_date + 5);
 v_assignment := (v_result#>>'{assignment,id}')::uuid;
 v_session := (public.manage_committee_session('create',
   '{"session_type":"ORDINARIA","scheduled_at":"2028-01-01T09:00:00-05:00","location_or_url":"Sala de prueba","quorum_required":1}')#>>'{session,id}')::uuid;
 IF (SELECT count(*) FROM public.notifications WHERE session_id = v_session AND type = 'CONVOCATORIA_SESION') <> 1 THEN
   RAISE EXCEPTION 'Secretary received duplicate invitations for multiple roles'; END IF;

 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_reviewer, 'role', 'authenticated')::text, true);
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'REASIGNACION_REVISOR') <> 1 THEN
   RAISE EXCEPTION 'Previous reviewer not notified'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE session_id = v_session AND type = 'CONVOCATORIA_SESION') <> 1 THEN
   RAISE EXCEPTION 'Absent invitee not notified'; END IF;
 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_reviewer2, 'role', 'authenticated')::text, true);
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'ASIGNACION_REVISOR') <> 1 THEN
   RAISE EXCEPTION 'New reviewer not notified'; END IF;
 PERFORM public.submit_application_review(v_app, v_assignment, 'FAVORABLE', 'Concepto de prueba');
 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_secretary, 'role', 'authenticated')::text, true);
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'EVALUACION_ENTREGADA') <> 1 THEN
   RAISE EXCEPTION 'Review delivery not notified or duplicated by roles'; END IF;
 PERFORM public.manage_committee_session('add', jsonb_build_object('session_id', v_session, 'application_id', v_app, 'speaker_id', v_reviewer));
 PERFORM public.manage_committee_session('speaker', jsonb_build_object('session_id', v_session, 'application_id', v_app, 'speaker_id', v_reviewer));
 PERFORM public.manage_committee_session('speaker', jsonb_build_object('session_id', v_session, 'application_id', v_app, 'speaker_id', v_reviewer2));
 PERFORM public.manage_committee_session('close', jsonb_build_object('session_id', v_session));
 PERFORM public.manage_committee_session('attendance', jsonb_build_object('session_id', v_session, 'user_id', v_secretary, 'attended', true));
 -- Defer status notifications until the decision and its updated_at have both been saved.
 SET CONSTRAINTS ALL DEFERRED;
 PERFORM public.manage_committee_session('decision', jsonb_build_object('session_id', v_session, 'application_id', v_app,
   'decision', 'APROBADA', 'justification', 'Fundamento de prueba'));
 SET CONSTRAINTS ALL IMMEDIATE;
 PERFORM public.manage_committee_session('finalize', jsonb_build_object('session_id', v_session));
 v_minute := (public.manage_committee_minutes('generate', jsonb_build_object('session_id', v_session))->>'id')::uuid;
 PERFORM public.manage_committee_minutes('approve', jsonb_build_object('minute_id', v_minute));
 IF (SELECT count(*) FROM public.notifications WHERE session_id = v_session AND type = 'ACTA_PUBLICADA') <> 1 THEN
   RAISE EXCEPTION 'Approved minute not notified'; END IF;
 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_reviewer, 'role', 'authenticated')::text, true);
 IF (SELECT count(*) FROM public.notifications WHERE session_id = v_session AND type = 'ASIGNACION_PONENTE') <> 1 THEN
   RAISE EXCEPTION 'Unchanged speaker assignment duplicated notification'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE session_id = v_session AND type = 'REASIGNACION_PONENTE') <> 1 THEN
   RAISE EXCEPTION 'Previous speaker not notified'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE session_id = v_session AND type = 'AGENDA_DISPONIBLE') <> 1 THEN
   RAISE EXCEPTION 'Closed agenda not notified'; END IF;
 PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'CAMBIO_ESTADO') <> 2 THEN
   RAISE EXCEPTION 'Expected two generic status notifications; committee decision must not duplicate one'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'DECISION_COMITE'
   AND message LIKE '%Fundamento de prueba%') <> 1 THEN RAISE EXCEPTION 'Decision missing justification'; END IF;
 IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id <> v_owner) THEN RAISE EXCEPTION 'Owner read another inbox'; END IF;
 UPDATE public.notifications SET is_read = true WHERE NOT is_read;
 IF EXISTS (SELECT 1 FROM public.notifications WHERE NOT is_read) THEN RAISE EXCEPTION 'Bulk read failed'; END IF;
END;
$$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = '80fbc100-0000-4000-8000-000000000004' AND NOT is_read) THEN
   RAISE EXCEPTION 'Bulk read affected another user'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.notifications; RAISE EXCEPTION 'Anonymous inbox access allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Document changes, adjustment requests, unchanged writes, rollback and lack of quorum.
INSERT INTO auth.users(id, email, raw_app_meta_data) VALUES
 ('80fbc100-0000-4000-8000-000000000006', 'notification-validation@example.invalid', '{"seed_initial_role":"administrativo"}');
INSERT INTO public.requirements(id, application_type_id, name, is_mandatory) VALUES
 ('80fbc100-0000-4000-8000-000000000011', '80fbc100-0000-4000-8000-000000000010', 'Documento de prueba', false);
INSERT INTO public.applications(id, filing_number, application_type_id, applicant_id, title, current_status) VALUES
 ('80fbc100-0000-4000-8000-000000000021', 'NOTIFICATION-DOCUMENT-TEST', '80fbc100-0000-4000-8000-000000000010',
  '80fbc100-0000-4000-8000-000000000001', 'Documento de prueba', 'RADICADA'),
 ('80fbc100-0000-4000-8000-000000000022', 'NOTIFICATION-QUORUM-TEST', '80fbc100-0000-4000-8000-000000000010',
  '80fbc100-0000-4000-8000-000000000001', 'Quórum de prueba', 'LISTA_COMITE');
INSERT INTO public.application_documents(id, application_id, requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256, mime_type) VALUES
 ('80fbc100-0000-4000-8000-000000000030', '80fbc100-0000-4000-8000-000000000021',
  '80fbc100-0000-4000-8000-000000000011', 'prueba.pdf', 'prueba.pdf', 10, 'test-hash', 'application/pdf');
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_session uuid; v_app uuid := '80fbc100-0000-4000-8000-000000000021'; v_before int;
BEGIN
 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000006","role":"authenticated"}', true);
 PERFORM public.validate_application_document(v_app, '80fbc100-0000-4000-8000-000000000030', 'test-hash', 'RECHAZADO', 'Falta firma');
 PERFORM public.validate_application_document(v_app, '80fbc100-0000-4000-8000-000000000030', 'test-hash', 'RECHAZADO', 'Falta firma');
 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000001","role":"authenticated"}', true);
 IF (SELECT count(*) FROM public.notifications WHERE application_id = v_app AND type = 'REQUERIMIENTO_AJUSTES'
   AND message LIKE '%Falta firma%') <> 1 THEN RAISE EXCEPTION 'Document rejection missing or duplicated'; END IF;
 SELECT count(*) INTO v_before FROM public.notifications;
 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000006","role":"authenticated"}', true);
 BEGIN
   PERFORM public.validate_application_document(v_app, '80fbc100-0000-4000-8000-000000000030', 'test-hash', 'RECHAZADO', 'Cambio que se revierte');
   RAISE EXCEPTION 'Rollback fixture';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Rollback fixture' THEN RAISE; END IF;
 END;
 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000001","role":"authenticated"}', true);
 IF (SELECT count(*) FROM public.notifications) <> v_before THEN RAISE EXCEPTION 'Rolled-back operation left a notification'; END IF;
 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000003","role":"authenticated"}', true);
 v_session := (public.manage_committee_session('create',
   '{"session_type":"ORDINARIA","scheduled_at":"2028-01-02T09:00:00-05:00","location_or_url":"Sala","quorum_required":2}')#>>'{session,id}')::uuid;
 PERFORM public.manage_committee_session('add', jsonb_build_object('session_id', v_session, 'application_id', '80fbc100-0000-4000-8000-000000000022'));
 PERFORM public.manage_committee_session('close', jsonb_build_object('session_id', v_session));
 PERFORM public.manage_committee_session('not_deliberated', jsonb_build_object('session_id', v_session,
   'application_id', '80fbc100-0000-4000-8000-000000000022', 'reason', 'No hubo quórum'));
 PERFORM set_config('request.jwt.claims', '{"sub":"80fbc100-0000-4000-8000-000000000001","role":"authenticated"}', true);
 IF (SELECT count(*) FROM public.notifications WHERE type = 'SOLICITUD_NO_DELIBERADA' AND message LIKE '%No hubo quórum%') <> 1 THEN
   RAISE EXCEPTION 'Non-deliberation did not notify the applicant'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.observations(application_id, author_id, category, content) VALUES
 ('80fbc100-0000-4000-8000-000000000021', '80fbc100-0000-4000-8000-000000000004', 'AJUSTE_OBLIGATORIO', 'Ajustar metodología');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.notifications WHERE application_id = '80fbc100-0000-4000-8000-000000000021'
   AND message LIKE '%Ajustar metodología%' AND target_tab = 'observaciones') <> 1 THEN RAISE EXCEPTION 'Mandatory adjustment not notified'; END IF;
END $$;
-- Inactive accounts cannot read previously delivered notifications.
UPDATE public.profiles SET is_active = false WHERE id = '80fbc100-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"80fbc100-0000-4000-8000-000000000001","role":"authenticated"}';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.notifications) THEN RAISE EXCEPTION 'Inactive profile retained inbox access'; END IF;
END $$;
ROLLBACK;
