BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('a0fbc100-0000-4000-8000-000000000001','documentary-owner@example.invalid','{}'),
 ('a0fbc100-0000-4000-8000-000000000002','documentary-staff@example.invalid','{"seed_initial_role":"administrativo"}');
INSERT INTO public.application_types(id,code,name) VALUES
 ('a0fbc100-0000-4000-8000-000000000010','TEST-DOCUMENTARY-QUEUE','Prueba cola documental');
INSERT INTO public.requirements(id,application_type_id,name,is_subsanable) VALUES
 ('a0fbc100-0000-4000-8000-000000000011','a0fbc100-0000-4000-8000-000000000010','Documento subsanable',true);
INSERT INTO public.applications(id,filing_number,application_type_id,applicant_id,title,current_status) VALUES
 ('a0fbc100-0000-4000-8000-000000000020','TEST-DOCUMENTARY-QUEUE','a0fbc100-0000-4000-8000-000000000010',
  'a0fbc100-0000-4000-8000-000000000001','Prueba cierre persistente','RADICADA');
INSERT INTO public.application_documents(id,application_id,requirement_id,file_name,file_path,file_size_bytes,file_hash_sha256,mime_type) VALUES
 ('a0fbc100-0000-4000-8000-000000000030','a0fbc100-0000-4000-8000-000000000020',
  'a0fbc100-0000-4000-8000-000000000011','prueba.pdf','prueba.pdf',10,'hash','application/pdf');
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 v_app uuid := 'a0fbc100-0000-4000-8000-000000000020';
 v_doc uuid := 'a0fbc100-0000-4000-8000-000000000030';
 v_result jsonb; v_count int; v_versions jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"a0fbc100-0000-4000-8000-000000000001","role":"authenticated"}',true);
 BEGIN PERFORM public.finalize_documentary_validation(v_app);
   RAISE EXCEPTION 'Researcher finalized validation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"a0fbc100-0000-4000-8000-000000000002","role":"authenticated"}',true);
 BEGIN PERFORM public.finalize_documentary_validation(v_app);
   RAISE EXCEPTION 'Pending document was finalized'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.audit_history WHERE application_id=v_app AND action='VALIDACION_DOCUMENTAL_FINALIZADA') THEN
   RAISE EXCEPTION 'Failed finalization left a closure'; END IF;
 PERFORM public.validate_application_document(v_app,v_doc,'hash','RECHAZADO','Falta firma');
 v_result := public.finalize_documentary_validation(v_app);
 IF v_result#>>'{application,current_status}' <> 'PENDIENTE_DOCUMENTOS' THEN RAISE EXCEPTION 'Missing correction status'; END IF;
 IF jsonb_array_length(v_result->'audits') <> 2 THEN RAISE EXCEPTION 'Transition and closure were not returned'; END IF;
 v_versions := v_result#>'{audits,1,details,document_versions}';
 IF v_versions->>v_doc::text IS NULL THEN RAISE EXCEPTION 'Document version snapshot missing'; END IF;
 PERFORM public.finalize_documentary_validation(v_app);
 IF (SELECT count(*) FROM public.audit_history WHERE application_id=v_app AND action='VALIDACION_DOCUMENTAL_FINALIZADA') <> 1 THEN
   RAISE EXCEPTION 'Retry duplicated closure'; END IF;
 BEGIN INSERT INTO public.audit_history(application_id,actor_id,action) VALUES (v_app,auth.uid(),'VALIDACION_DOCUMENTAL_FINALIZADA');
   RAISE EXCEPTION 'Client forged documentary closure'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
-- Simulate a new version uploaded by the researcher, then another round with the same pending state.
UPDATE public.application_documents SET uploaded_at=clock_timestamp(),file_hash_sha256='correction',validation_status='PENDIENTE',validated_at=NULL
 WHERE id='a0fbc100-0000-4000-8000-000000000030';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"a0fbc100-0000-4000-8000-000000000002","role":"authenticated"}';
DO $$
DECLARE v_app uuid := 'a0fbc100-0000-4000-8000-000000000020'; v_result jsonb;
BEGIN
 PERFORM public.validate_application_document(v_app,'a0fbc100-0000-4000-8000-000000000030','correction','RECHAZADO','Aún falta firma');
 v_result := public.finalize_documentary_validation(v_app);
 IF jsonb_array_length(v_result->'audits') <> 1 THEN RAISE EXCEPTION 'Same-state completion must save exactly one closure'; END IF;
 IF (SELECT count(*) FROM public.audit_history WHERE application_id=v_app AND action='VALIDACION_DOCUMENTAL_FINALIZADA') <> 2 THEN
   RAISE EXCEPTION 'New correction round did not persist its closure'; END IF;
END $$;
RESET ROLE;
UPDATE public.application_documents SET uploaded_at=clock_timestamp(),file_hash_sha256='signed',validation_status='PENDING',validated_at=NULL
 WHERE id='a0fbc100-0000-4000-8000-000000000030';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"a0fbc100-0000-4000-8000-000000000002","role":"authenticated"}';
DO $$
DECLARE v_app uuid := 'a0fbc100-0000-4000-8000-000000000020'; v_count int;
BEGIN
 PERFORM public.validate_application_document(v_app,'a0fbc100-0000-4000-8000-000000000030','signed','VALID',NULL);
 PERFORM public.finalize_documentary_validation(v_app);
 IF (SELECT current_status FROM public.applications WHERE id=v_app) <> 'EN_REVISION' THEN RAISE EXCEPTION 'Valid documents did not advance'; END IF;
 SELECT count(*) INTO v_count FROM public.audit_history WHERE application_id=v_app;
 PERFORM public.finalize_documentary_validation(v_app);
 IF (SELECT count(*) FROM public.audit_history WHERE application_id=v_app) <> v_count THEN RAISE EXCEPTION 'Repeated completion was not idempotent'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 PERFORM set_config('request.jwt.claims','{"sub":"a0fbc100-0000-4000-8000-000000000001","role":"authenticated"}',true);
 IF (SELECT count(*) FROM public.notifications WHERE application_id=v_app AND type='CAMBIO_ESTADO') <> 2 THEN
   RAISE EXCEPTION 'Saved transitions did not notify the researcher exactly once each'; END IF;
END $$;
RESET ROLE;
UPDATE public.requirements SET is_subsanable=false WHERE id='a0fbc100-0000-4000-8000-000000000011';
INSERT INTO public.applications(id,filing_number,application_type_id,applicant_id,title,current_status) VALUES
 ('a0fbc100-0000-4000-8000-000000000021','TEST-DOCUMENTARY-MISSING','a0fbc100-0000-4000-8000-000000000010',
  'a0fbc100-0000-4000-8000-000000000001','Requisito esencial faltante','RADICADA');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"a0fbc100-0000-4000-8000-000000000002","role":"authenticated"}';
DO $$
DECLARE v_result jsonb;
BEGIN
 v_result := public.finalize_documentary_validation('a0fbc100-0000-4000-8000-000000000021');
 IF v_result#>>'{application,current_status}' <> 'RECHAZADA' THEN RAISE EXCEPTION 'Missing essential requirement was not rejected'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.finalize_documentary_validation('a0fbc100-0000-4000-8000-000000000021');
   RAISE EXCEPTION 'Anonymous completion was allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
