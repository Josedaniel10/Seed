-- Run after 20261117000001_visual_identity.sql. Every fixture is rolled back.
BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('d0170000-0000-4000-8000-000000000001','identity-admin@example.invalid','{"seed_initial_role":"admin"}'),
 ('d0170000-0000-4000-8000-000000000002','identity-manager@example.invalid','{}'),
 ('d0170000-0000-4000-8000-000000000003','identity-viewer@example.invalid','{}');
INSERT INTO public.research_groups(id,code,name,faculty) VALUES
 ('d0170000-0000-4000-8000-000000000010','VISUAL-TEST','Grupo prueba visual','Área de identidad visual');
INSERT INTO public.funding_call_managers(user_id,faculty,designation) VALUES
 ('d0170000-0000-4000-8000-000000000002','Área de identidad visual','decano');
INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES
 ('call-covers','d0170000-0000-4000-8000-000000000002/d0170000-0000-4000-8000-000000000011.png','d0170000-0000-4000-8000-000000000002','{"size":100,"mimetype":"image/png"}'),
 ('call-covers','d0170000-0000-4000-8000-000000000001/d0170000-0000-4000-8000-000000000012.jpg','d0170000-0000-4000-8000-000000000001','{"size":100,"mimetype":"image/jpeg"}');
SET LOCAL ROLE authenticated;
DO $$
DECLARE result jsonb; type_id uuid; call_id uuid; call_data jsonb; affected integer;
 own_cover text := 'd0170000-0000-4000-8000-000000000002/d0170000-0000-4000-8000-000000000011.png';
 foreign_cover text := 'd0170000-0000-4000-8000-000000000001/d0170000-0000-4000-8000-000000000012.jpg';
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"d0170000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 result := public.manage_catalog('TYPE_CREATE',NULL,'{"code":"VISUAL-TEST","name":"Prueba de identidad visual","icon_key":"flask","accent_color":"violet"}');
 type_id := (result#>>'{type,id}')::uuid;
 IF result#>>'{type,icon_key}' <> 'flask' OR result#>>'{type,accent_color}' <> 'violet' THEN RAISE EXCEPTION 'Type appearance not persisted'; END IF;
 result := public.manage_catalog('TYPE_UPDATE',type_id,'{"name":"Nombre actualizado"}');
 IF result#>>'{type,icon_key}' <> 'flask' THEN RAISE EXCEPTION 'An unrelated edit erased appearance'; END IF;
 BEGIN PERFORM public.manage_catalog('TYPE_UPDATE',type_id,'{"icon_key":"unregistered-icon"}');
  RAISE EXCEPTION 'Invalid icon accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM public.catalog_events WHERE target_id=type_id AND details#>>'{type,accent_color}'='violet') THEN RAISE EXCEPTION 'Appearance audit missing'; END IF;

 PERFORM set_config('request.jwt.claims','{"sub":"d0170000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 call_data := jsonb_build_object('title','Convocatoria con portada','description','Requisitos suficientemente detallados para participar.',
  'faculty','Área de identidad visual','audience','all','type_ids',jsonb_build_array(type_id),
  'opens_at',now()-interval '1 day','closes_at',now()+interval '1 day','icon_key','leaf','accent_color','teal');
 BEGIN PERFORM public.create_funding_call(call_data || jsonb_build_object('cover_image_path',foreign_cover));
  RAISE EXCEPTION 'Foreign cover accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 call_id := public.create_funding_call(call_data || jsonb_build_object('cover_image_path',own_cover));
 IF NOT EXISTS(SELECT 1 FROM public.funding_calls WHERE id=call_id AND cover_image_path=own_cover AND icon_key='leaf' AND accent_color='teal') THEN RAISE EXCEPTION 'Call appearance not persisted'; END IF;
 PERFORM public.create_funding_call((call_data - 'icon_key' - 'accent_color') || jsonb_build_object('id',call_id));
 IF NOT EXISTS(SELECT 1 FROM public.funding_calls WHERE id=call_id AND cover_image_path=own_cover AND icon_key='leaf') THEN RAISE EXCEPTION 'Legacy edit erased appearance'; END IF;
 UPDATE storage.objects SET name='overwritten.png' WHERE bucket_id='call-covers' AND name=own_cover;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cover overwrite allowed'; END IF;

 PERFORM set_config('request.jwt.claims','{"sub":"d0170000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='call-covers' AND name=own_cover) THEN RAISE EXCEPTION 'Draft cover visible to unrelated viewer'; END IF;
 BEGIN INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('call-covers','d0170000-0000-4000-8000-000000000003/forbidden.png','d0170000-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Viewer uploaded a cover'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.manage_catalog('TYPE_UPDATE',type_id,'{"accent_color":"rose"}');
  RAISE EXCEPTION 'Viewer changed catalog appearance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 PERFORM set_config('request.jwt.claims','{"sub":"d0170000-0000-4000-8000-000000000002","role":"authenticated"}',true);
 PERFORM public.create_funding_call(call_data || jsonb_build_object('id',call_id,'cover_image_path',NULL));
 IF EXISTS(SELECT 1 FROM public.funding_calls WHERE id=call_id AND cover_image_path IS NOT NULL) THEN RAISE EXCEPTION 'Removing the cover did not persist'; END IF;
 PERFORM public.create_funding_call(call_data || jsonb_build_object('id',call_id,'cover_image_path',own_cover));
 PERFORM public.change_funding_call_status(call_id,'published','');
 PERFORM set_config('request.jwt.claims','{"sub":"d0170000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='call-covers' AND name=own_cover) THEN RAISE EXCEPTION 'Published cover unavailable to active viewer'; END IF;
END $$;
ROLLBACK;
