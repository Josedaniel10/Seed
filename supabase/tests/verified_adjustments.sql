BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('d0140000-0000-4000-8000-000000000001','adjust-owner@example.invalid','{}'),
 ('d0140000-0000-4000-8000-000000000002','adjust-reviewer@example.invalid','{"seed_initial_role":"integrante_comite"}'),
 ('d0140000-0000-4000-8000-000000000003','adjust-other@example.invalid','{"seed_initial_role":"integrante_comite"}'),
 ('d0140000-0000-4000-8000-000000000004','adjust-secretary@example.invalid','{"seed_initial_role":"secretario"}');
INSERT INTO public.application_types(id,code,name) VALUES
 ('d0140000-0000-4000-8000-000000000010','TEST-ADJUSTMENTS','Ajustes verificados');
INSERT INTO public.applications(id,filing_number,application_type_id,applicant_id,title,current_status) VALUES
 ('d0140000-0000-4000-8000-000000000020','TEST-ADJUSTMENTS','d0140000-0000-4000-8000-000000000010',
  'd0140000-0000-4000-8000-000000000001','Prueba de ajustes','EN_REVISION');
INSERT INTO public.reviewer_assignments(id,application_id,reviewer_id,deadline_date,assigned_by) VALUES
 ('d0140000-0000-4000-8000-000000000030','d0140000-0000-4000-8000-000000000020','d0140000-0000-4000-8000-000000000002',current_date+7,'d0140000-0000-4000-8000-000000000004');
SET LOCAL ROLE authenticated;
DO $$
DECLARE a uuid := 'd0140000-0000-4000-8000-000000000020'; o uuid; result jsonb;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"d0140000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 result := public.act_on_observation(a,'ADD',p_content=>'Corregir metodología',p_category=>'AJUSTE_OBLIGATORIO');
 o := (result#>>'{observation,id}')::uuid;
 BEGIN UPDATE public.observations SET is_resolved=true WHERE id=o;
   RAISE EXCEPTION 'Direct write accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.act_on_observation(a,'VERIFY',o,'Verificado',p_accept=>true,p_expected_response=>'Respuesta');
   RAISE EXCEPTION 'Verification without response accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.submit_application_review(a,'d0140000-0000-4000-8000-000000000030','FAVORABLE','Cumple');
   RAISE EXCEPTION 'Favorable with unresolved adjustment accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0140000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 IF EXISTS(SELECT 1 FROM public.observations WHERE id=o) THEN RAISE EXCEPTION 'Unassigned reviewer reads observations'; END IF;
 BEGIN PERFORM public.act_on_observation(a,'RESPOND',o,'Respuesta ajena');
   RAISE EXCEPTION 'Foreign response accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.act_on_observation(a,'VERIFY',o,'Verificado',p_accept=>true,p_expected_response=>'Respuesta');
   RAISE EXCEPTION 'Foreign verification accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0140000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 result := public.act_on_observation(a,'RESPOND',o,'Respuesta inicial');
 IF (result#>>'{observation,is_resolved}')::boolean THEN RAISE EXCEPTION 'Response resolved adjustment'; END IF;
 BEGIN PERFORM public.act_on_observation(a,'VERIFY',o,'Autoaceptación',p_accept=>true,p_expected_response=>'Respuesta inicial');
   RAISE EXCEPTION 'Owner accepted own adjustment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"d0140000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 BEGIN PERFORM public.act_on_observation(a,'VERIFY',o,'Verificado',p_accept=>true,p_expected_response=>'Versión antigua');
   RAISE EXCEPTION 'Stale verification accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 result := public.act_on_observation(a,'VERIFY',o,'Falta evidencia',p_accept=>false,p_expected_response=>'Respuesta inicial');
 IF (result#>>'{observation,is_resolved}')::boolean OR result#>>'{observation,verified_by}' <> auth.uid()::text THEN RAISE EXCEPTION 'Rejection not saved'; END IF;
 PERFORM set_config('request.jwt.claims','{"sub":"d0140000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 result := public.act_on_observation(a,'RESPOND',o,'Respuesta corregida');
 IF result#>>'{observation,verified_at}' IS NOT NULL THEN RAISE EXCEPTION 'Resubmission retained verification'; END IF;
 PERFORM set_config('request.jwt.claims','{"sub":"d0140000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 result := public.act_on_observation(a,'VERIFY',o,'Evidencia revisada',p_accept=>true,p_expected_response=>'Respuesta corregida');
 IF NOT (result#>>'{observation,is_resolved}')::boolean THEN RAISE EXCEPTION 'Acceptance not saved'; END IF;
 IF (SELECT count(*) FROM public.audit_history WHERE application_id=a AND action LIKE 'AJUSTE_%') <> 5 THEN RAISE EXCEPTION 'Audit count mismatch'; END IF;
 BEGIN INSERT INTO public.audit_history(application_id,actor_id,action,details) VALUES(a,auth.uid(),'AJUSTE_VERIFY','{}');
   RAISE EXCEPTION 'Forged audit accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 result := public.submit_application_review(a,'d0140000-0000-4000-8000-000000000030','FAVORABLE','Todos los ajustes verificados');
 IF result#>>'{application,current_status}' <> 'LISTA_COMITE' THEN RAISE EXCEPTION 'Verified concept did not advance'; END IF;
 BEGIN PERFORM public.act_on_observation(a,'ADD',p_content=>'Tardío',p_category=>'AJUSTE_OBLIGATORIO');
   RAISE EXCEPTION 'Closed review edited'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
ROLLBACK;
