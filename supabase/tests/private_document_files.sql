BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('d0130000-0000-4000-8000-000000000001','files-owner@example.invalid','{}'),
 ('d0130000-0000-4000-8000-000000000002','files-reviewer@example.invalid','{"seed_initial_role":"integrante_comite"}'),
 ('d0130000-0000-4000-8000-000000000003','files-other-reviewer@example.invalid','{"seed_initial_role":"integrante_comite"}'),
 ('d0130000-0000-4000-8000-000000000004','files-secretary@example.invalid','{"seed_initial_role":"secretario"}');
INSERT INTO public.application_types(id,code,name) VALUES
 ('d0130000-0000-4000-8000-000000000010','TEST-PRIVATE-FILES','Prueba documentos privados');
INSERT INTO public.requirements(id,application_type_id,name,is_subsanable,allowed_formats) VALUES
 ('d0130000-0000-4000-8000-000000000011','d0130000-0000-4000-8000-000000000010','PDF subsanable',true,ARRAY['application/pdf']),
 ('d0130000-0000-4000-8000-000000000012','d0130000-0000-4000-8000-000000000010','Faltante',true,ARRAY['pdf']),
 ('d0130000-0000-4000-8000-000000000013','d0130000-0000-4000-8000-000000000010','No subsanable',false,ARRAY['pdf']);
INSERT INTO public.applications(id,filing_number,application_type_id,applicant_id,title,current_status) VALUES
 ('d0130000-0000-4000-8000-000000000020','TEST-PRIVATE-FILES','d0130000-0000-4000-8000-000000000010',
  'd0130000-0000-4000-8000-000000000001','Expediente documental privado','PENDIENTE_DOCUMENTOS');
INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES
 ('documents','legacy-original.pdf','d0130000-0000-4000-8000-000000000001','{"size":10,"mimetype":"application/pdf"}'),
 ('documents','d0130000-0000-4000-8000-000000000001/correction/corrected.pdf','d0130000-0000-4000-8000-000000000001','{"size":20,"mimetype":"application/pdf"}'),
 ('documents','d0130000-0000-4000-8000-000000000001/missing/missing.pdf','d0130000-0000-4000-8000-000000000001','{"size":20,"mimetype":"application/pdf"}'),
 ('documents','d0130000-0000-4000-8000-000000000003/foreign/foreign.pdf','d0130000-0000-4000-8000-000000000003','{"size":20,"mimetype":"application/pdf"}');
INSERT INTO public.application_documents(id,application_id,requirement_id,file_name,file_path,file_size_bytes,file_hash_sha256,mime_type,validation_status) VALUES
 ('d0130000-0000-4000-8000-000000000030','d0130000-0000-4000-8000-000000000020','d0130000-0000-4000-8000-000000000011',
  'legacy-original.pdf','https://example.supabase.co/storage/v1/object/public/documents/legacy-original.pdf',10,repeat('a',64),'application/pdf','RECHAZADO');
INSERT INTO public.reviewer_assignments(application_id,reviewer_id,deadline_date,assigned_by) VALUES
 ('d0130000-0000-4000-8000-000000000020','d0130000-0000-4000-8000-000000000002',current_date+7,'d0130000-0000-4000-8000-000000000004');

SET LOCAL ROLE authenticated;
DO $$
DECLARE
 v_app uuid := 'd0130000-0000-4000-8000-000000000020';
 v_req uuid := 'd0130000-0000-4000-8000-000000000011';
 v_result jsonb;
 v_payload jsonb := jsonb_build_object('file_name','corrected.pdf','file_path',
  'd0130000-0000-4000-8000-000000000001/correction/corrected.pdf','file_size_bytes',20,'file_hash_sha256',repeat('b',64),'mime_type','application/pdf');
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"d0130000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 IF EXISTS(SELECT 1 FROM public.application_documents WHERE application_id=v_app) THEN RAISE EXCEPTION 'Unassigned reviewer can read metadata'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE name='legacy-original.pdf') THEN RAISE EXCEPTION 'Unassigned reviewer can read original'; END IF;
 BEGIN PERFORM public.cure_application_document(v_app,v_req,repeat('a',64),v_payload);
   RAISE EXCEPTION 'Foreign correction accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES ('documents','d0130000-0000-4000-8000-000000000001/forged/file.pdf');
   RAISE EXCEPTION 'Upload in another owner folder accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0130000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 IF (SELECT count(*) FROM public.application_documents WHERE application_id=v_app) <> 1 THEN RAISE EXCEPTION 'Assigned reviewer cannot read metadata'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE name='legacy-original.pdf') THEN RAISE EXCEPTION 'Assigned reviewer cannot read legacy original'; END IF;
 BEGIN UPDATE storage.objects SET metadata='{}' WHERE name='legacy-original.pdf';
   IF FOUND THEN RAISE EXCEPTION 'Reviewer overwrote original'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM storage.objects WHERE name='legacy-original.pdf';
   IF FOUND THEN RAISE EXCEPTION 'Reviewer deleted original'; END IF; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0130000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE name='legacy-original.pdf') THEN RAISE EXCEPTION 'Owner cannot read original'; END IF;
 BEGIN INSERT INTO public.audit_history(application_id,actor_id,action,details)
   VALUES(v_app,auth.uid(),'SUBSANACION_DOCUMENTO','{}');
   RAISE EXCEPTION 'Client forged a correction audit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.cure_application_document(v_app,v_req,'stale',v_payload);
   RAISE EXCEPTION 'Stale correction accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.cure_application_document(v_app,v_req,repeat('a',64),v_payload||'{"file_path":"not-uploaded.pdf"}');
   RAISE EXCEPTION 'Invented file accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.cure_application_document(v_app,v_req,repeat('a',64),v_payload||'{"file_path":"d0130000-0000-4000-8000-000000000003/foreign/foreign.pdf"}');
   RAISE EXCEPTION 'Foreign file accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.cure_application_document(v_app,v_req,repeat('a',64),v_payload||'{"file_size_bytes":999}');
   RAISE EXCEPTION 'False size accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.cure_application_document(v_app,'d0130000-0000-4000-8000-000000000013',NULL,v_payload);
   RAISE EXCEPTION 'Non-correctable requirement accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT count(*) FROM public.audit_history WHERE application_id=v_app AND action='SUBSANACION_DOCUMENTO') <> 0 THEN RAISE EXCEPTION 'Failed correction left audit'; END IF;
 v_result := public.cure_application_document(v_app,v_req,repeat('a',64),v_payload);
 IF v_result#>>'{document,validation_status}' <> 'PENDIENTE' THEN RAISE EXCEPTION 'Correction not pending validation'; END IF;
 IF v_result#>>'{audit,actor_id}' <> auth.uid()::text THEN RAISE EXCEPTION 'Audit actor not authenticated owner'; END IF;
 IF v_result#>>'{audit,details,previous_document,file_hash_sha256}' <> repeat('a',64) THEN RAISE EXCEPTION 'Previous version not preserved'; END IF;
 PERFORM public.cure_application_document(v_app,v_req,repeat('a',64),v_payload);
 IF (SELECT count(*) FROM public.audit_history WHERE application_id=v_app AND action='SUBSANACION_DOCUMENTO') <> 1 THEN RAISE EXCEPTION 'Retry duplicated audit'; END IF;
 PERFORM public.cure_application_document(v_app,'d0130000-0000-4000-8000-000000000012',NULL,
   v_payload||'{"file_path":"d0130000-0000-4000-8000-000000000001/missing/missing.pdf","file_name":"missing.pdf"}');
 IF (SELECT count(*) FROM public.application_documents WHERE application_id=v_app) <> 2 THEN RAISE EXCEPTION 'Missing requirement was not attached'; END IF;
END $$;
RESET ROLE;
UPDATE public.reviewer_assignments SET is_active=false WHERE application_id='d0130000-0000-4000-8000-000000000020';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"d0130000-0000-4000-8000-000000000002","role":"authenticated"}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.application_documents WHERE application_id='d0130000-0000-4000-8000-000000000020') THEN RAISE EXCEPTION 'Revoked reviewer still sees documents'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE name='d0130000-0000-4000-8000-000000000001/correction/corrected.pdf') THEN RAISE EXCEPTION 'Revoked reviewer still reads original'; END IF;
END $$;
RESET ROLE;
-- Committee access during a closed, ongoing agenda is separate from a review assignment.
INSERT INTO public.committee_sessions(id,session_number,session_type,scheduled_at,location_or_url,is_agenda_closed)
VALUES ('d0130000-0000-4000-8000-000000000040','TEST-PRIVATE-FILES','ORDINARIA',now(),'Prueba',true);
INSERT INTO public.session_agenda(session_id,application_id,agenda_order)
VALUES ('d0130000-0000-4000-8000-000000000040','d0130000-0000-4000-8000-000000000020',1);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"d0130000-0000-4000-8000-000000000003","role":"authenticated"}';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.application_documents WHERE application_id='d0130000-0000-4000-8000-000000000020') THEN RAISE EXCEPTION 'Eligible committee member cannot read ongoing agenda documents'; END IF;
END $$;
RESET ROLE;
UPDATE public.committee_sessions SET is_completed=true WHERE id='d0130000-0000-4000-8000-000000000040';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.application_documents WHERE application_id='d0130000-0000-4000-8000-000000000020') THEN RAISE EXCEPTION 'Completed session still grants unassigned access'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET is_active=false WHERE id='d0130000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"d0130000-0000-4000-8000-000000000001","role":"authenticated"}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.application_documents WHERE application_id='d0130000-0000-4000-8000-000000000020') THEN RAISE EXCEPTION 'Inactive owner still sees documents'; END IF;
END $$;
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims='{"role":"anon"}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.objects WHERE name='legacy-original.pdf') THEN RAISE EXCEPTION 'Anonymous reads private original'; END IF;
 BEGIN PERFORM public.cure_application_document('d0130000-0000-4000-8000-000000000020','d0130000-0000-4000-8000-000000000011',NULL,'{}');
   RAISE EXCEPTION 'Anonymous correction accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
