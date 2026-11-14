BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('d0150000-0000-4000-8000-000000000001','call-student@example.invalid','{}'),
 ('d0150000-0000-4000-8000-000000000002','call-manager@example.invalid','{}'),
 ('d0150000-0000-4000-8000-000000000003','call-outsider@example.invalid','{}');
INSERT INTO public.research_groups(id,code,name,faculty) VALUES
 ('d0150000-0000-4000-8000-000000000010','TEST-CALL','Grupo prueba','Área prueba convocatorias');
UPDATE public.profiles SET research_group_id='d0150000-0000-4000-8000-000000000010',academic_link='Estudiante de pregrado'
 WHERE id='d0150000-0000-4000-8000-000000000001';
INSERT INTO public.application_types(id,code,name) VALUES ('d0150000-0000-4000-8000-000000000020','TEST-CALL','Aval y financiamiento');
INSERT INTO public.funding_call_managers(user_id,faculty,designation) VALUES
 ('d0150000-0000-4000-8000-000000000002','Área prueba convocatorias','decano');
SET LOCAL ROLE authenticated;
DO $$
DECLARE c uuid; result jsonb; a uuid := 'd0150000-0000-4000-8000-000000000030';
  owner_id uuid := 'd0150000-0000-4000-8000-000000000001';
  type_id uuid := 'd0150000-0000-4000-8000-000000000020';
  group_id uuid := 'd0150000-0000-4000-8000-000000000010';
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 BEGIN PERFORM public.create_funding_call('{"faculty":"Área prueba convocatorias"}');
   RAISE EXCEPTION 'Unauthorized creation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 c := public.create_funding_call(jsonb_build_object('title','Prueba de convocatoria','description','Requisitos de prueba suficientemente detallados',
   'faculty','Área prueba convocatorias','audience','students','type_ids',jsonb_build_array(type_id),
   'opens_at',now()-interval '1 day','closes_at',now()+interval '1 day','max_amount',1000));
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 IF EXISTS(SELECT 1 FROM public.funding_calls WHERE id=c) THEN RAISE EXCEPTION 'Draft visible to student'; END IF;
 BEGIN PERFORM public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',group_id,100,false,'[]',c);
   RAISE EXCEPTION 'Draft call accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Draft call accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',group_id,100,false,'[]');
   RAISE EXCEPTION 'Funding without call accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Funding without call accepted' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 PERFORM public.change_funding_call_status(c,'published','');
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 BEGIN PERFORM public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',group_id,1001,false,'[]',c);
   RAISE EXCEPTION 'Over budget accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Over budget accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',NULL,100,false,'[]',c);
   RAISE EXCEPTION 'Foreign scope accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Foreign scope accepted' THEN RAISE; END IF; END;
 result := public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',group_id,100,false,'[]',c);
 IF result#>>'{application,funding_call_id}' <> c::text THEN RAISE EXCEPTION 'Call not stored'; END IF;
 BEGIN UPDATE public.applications SET budget_requested=200 WHERE id=a;
   RAISE EXCEPTION 'Funding mutated'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Funding mutated' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 PERFORM public.change_funding_call_status(c,'closed','Fin del período');
 IF (SELECT count(*) FROM public.funding_call_events WHERE call_id=c) <> 3 THEN RAISE EXCEPTION 'Audit missing'; END IF;
 PERFORM set_config('request.jwt.claims','{"sub":"d0150000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 result := public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',group_id,100,false,'[]',c);
 IF result#>>'{application,id}' <> a::text THEN RAISE EXCEPTION 'Retry lost filed request'; END IF;
 a := 'd0150000-0000-4000-8000-000000000031';
 BEGIN PERFORM public.file_application(a,owner_id,type_id,'Solicitud de prueba','Justificación de prueba',group_id,100,false,'[]',c);
   RAISE EXCEPTION 'Closed call accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Closed call accepted' THEN RAISE; END IF; END;
 result := public.file_application(a,owner_id,type_id,'Solicitud solo aval','Justificación de prueba',group_id,0,false,'[]');
 IF result#>>'{application,funding_call_id}' IS NOT NULL THEN RAISE EXCEPTION 'Academic endorsement linked'; END IF;
END $$;
ROLLBACK;
