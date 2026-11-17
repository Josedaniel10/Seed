BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('d0160000-0000-4000-8000-000000000001','catalog-admin@example.invalid','{"seed_initial_role":"admin"}'),
 ('d0160000-0000-4000-8000-000000000002','catalog-owner@example.invalid','{}');
INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES
 ('catalog-templates','d0160000-0000-4000-8000-000000000001/original.docx','d0160000-0000-4000-8000-000000000001','{"size":100,"mimetype":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'),
 ('catalog-templates','d0160000-0000-4000-8000-000000000001/replacement.docx','d0160000-0000-4000-8000-000000000001','{"size":120,"mimetype":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}');
SET LOCAL ROLE authenticated;
DO $$ DECLARE t uuid; r uuid; result jsonb; BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"d0160000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 BEGIN PERFORM public.manage_catalog('TYPE_CREATE',NULL,'{"code":"CAT-TEST","name":"Forbidden"}'); RAISE EXCEPTION 'Researcher wrote catalog'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='catalog-templates' AND name LIKE '%original.docx') THEN RAISE EXCEPTION 'Researcher cannot download template'; END IF;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('catalog-templates','d0160000-0000-4000-8000-000000000002/forged.docx'); RAISE EXCEPTION 'Researcher uploaded template'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0160000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 result:=public.manage_catalog('TYPE_CREATE',NULL,'{"code":"CAT-TEST","name":"Trámite de prueba"}'); t:=(result#>>'{type,id}')::uuid;
 result:=public.manage_catalog('REQUIREMENT_CREATE',NULL,jsonb_build_object('application_type_id',t,'name','Requisito original','max_size_mb',5)); r:=(result#>>'{requirement,id}')::uuid;
 PERFORM public.manage_catalog('REQUIREMENT_UPDATE',r,'{"is_subsanable":false,"cure_deadline_days":8}');
 IF (SELECT cure_deadline_days FROM public.requirements WHERE id=r)<>0 THEN RAISE EXCEPTION 'Cure days not normalized'; END IF;
 BEGIN PERFORM public.manage_catalog('REQUIREMENT_UPDATE',r,'{"template_url":"invented.docx"}'); RAISE EXCEPTION 'Invented template accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.manage_catalog('REQUIREMENT_UPDATE',r,'{"template_url":"d0160000-0000-4000-8000-000000000001/original.docx"}');
 BEGIN UPDATE public.application_types SET name='Forged' WHERE id=t; RAISE EXCEPTION 'Direct mutation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('seed.test_type',t::text,true); PERFORM set_config('seed.test_req',r::text,true);
END $$;
RESET ROLE;
INSERT INTO public.applications(id,filing_number,application_type_id,applicant_id,title,current_status) VALUES('d0160000-0000-4000-8000-000000000020','CATALOG-TEST',current_setting('seed.test_type')::uuid,'d0160000-0000-4000-8000-000000000002','Expediente','RADICADA');
SET LOCAL ROLE authenticated;
DO $$ DECLARE t uuid:=current_setting('seed.test_type')::uuid; r uuid:=current_setting('seed.test_req')::uuid; result jsonb; BEGIN
 PERFORM public.manage_catalog('REQUIREMENT_UPDATE',r,'{"name":"Requisito modificado","max_size_mb":10,"is_subsanable":true}');
 PERFORM public.manage_catalog('REQUIREMENT_UPDATE',r,'{"template_url":"d0160000-0000-4000-8000-000000000001/replacement.docx"}');
 IF (SELECT template_revision FROM public.requirements WHERE id=r)<>2 THEN RAISE EXCEPTION 'Template revision not incremented'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.requirements_for_application('d0160000-0000-4000-8000-000000000020') WHERE template_url LIKE '%original.docx') THEN RAISE EXCEPTION 'Historical template overwritten'; END IF;
 UPDATE storage.objects SET metadata='{}' WHERE bucket_id='catalog-templates';
 IF FOUND THEN RAISE EXCEPTION 'Immutable template overwritten'; END IF;
 PERFORM public.manage_catalog('REQUIREMENT_CREATE',NULL,jsonb_build_object('application_type_id',t,'name','Nuevo requisito obligatorio'));
 IF (SELECT count(*) FROM public.requirements_for_application('d0160000-0000-4000-8000-000000000020'))<>1 THEN RAISE EXCEPTION 'New requirement changed historical request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.requirements_for_application('d0160000-0000-4000-8000-000000000020') WHERE name='Requisito original' AND max_size_mb=5 AND NOT is_subsanable) THEN RAISE EXCEPTION 'Historical conditions changed'; END IF;
 result:=public.manage_catalog('REQUIREMENT_DELETE',r);
 IF (result->>'deleted')::boolean OR (SELECT is_active FROM public.requirements WHERE id=r) THEN RAISE EXCEPTION 'Linked requirement deleted instead of archived'; END IF;
 result:=public.manage_catalog('TYPE_DELETE',t);
 IF (result->>'deleted')::boolean OR (SELECT is_active FROM public.application_types WHERE id=t) THEN RAISE EXCEPTION 'Linked type deleted instead of archived'; END IF;
 BEGIN UPDATE public.applications SET catalog_snapshot='{}' WHERE id='d0160000-0000-4000-8000-000000000020'; RAISE EXCEPTION 'Frozen conditions overwritten'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 result:=public.manage_catalog('TYPE_CREATE',NULL,'{"code":"CAT-UNUSED","name":"Unused type"}');
 result:=public.manage_catalog('TYPE_DELETE',(result#>>'{type,id}')::uuid);
 IF NOT (result->>'deleted')::boolean THEN RAISE EXCEPTION 'Unused type was not deleted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.catalog_events WHERE action='TYPE_DELETE') THEN RAISE EXCEPTION 'No catalog audit'; END IF;
 result:=public.finalize_documentary_validation('d0160000-0000-4000-8000-000000000020');
 IF result#>>'{application,current_status}'<>'RECHAZADA' THEN RAISE EXCEPTION 'Validation used changed conditions instead of frozen non-curable requirement'; END IF;
END $$;
ROLLBACK;
