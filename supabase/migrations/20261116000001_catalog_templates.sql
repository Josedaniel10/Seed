BEGIN;
ALTER TABLE public.requirements ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.requirements ADD COLUMN template_revision integer NOT NULL DEFAULT 0, ADD COLUMN template_updated_at timestamptz;
ALTER TABLE public.applications ADD COLUMN catalog_snapshot jsonb;
UPDATE public.applications a SET catalog_snapshot=jsonb_build_object('type',to_jsonb(t),'requirements',
 (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.id),'[]'::jsonb) FROM public.requirements r WHERE r.application_type_id=a.application_type_id))
FROM public.application_types t WHERE t.id=a.application_type_id;

CREATE FUNCTION public.freeze_application_catalog() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.catalog_snapshot IS DISTINCT FROM OLD.catalog_snapshot THEN RAISE EXCEPTION 'Las condiciones del expediente son inmutables' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 -- Serialize filing with catalog edits, then read the current authoritative version.
 PERFORM pg_advisory_xact_lock(16112026);
 NEW.catalog_snapshot:=jsonb_build_object('type',(SELECT to_jsonb(t) FROM public.application_types t WHERE t.id=NEW.application_type_id),
 'requirements',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.id),'[]'::jsonb) FROM public.requirements r WHERE r.application_type_id=NEW.application_type_id AND r.is_active));
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_catalog BEFORE INSERT OR UPDATE OF catalog_snapshot ON public.applications FOR EACH ROW EXECUTE FUNCTION public.freeze_application_catalog();
REVOKE ALL ON FUNCTION public.freeze_application_catalog() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.requirements_for_application(p_id uuid) RETURNS SETOF public.requirements
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT r.* FROM public.applications a CROSS JOIN LATERAL jsonb_populate_recordset(NULL::public.requirements,a.catalog_snapshot->'requirements') r WHERE a.id=p_id;
$$;
REVOKE ALL ON FUNCTION public.requirements_for_application(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.requirements_for_application(uuid) TO authenticated;

-- Existing workflow RPCs now evaluate frozen requirements, never today's catalog.
DO $$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND p.proname IN ('finalize_documentary_validation','transition_application_status','cure_application_document','enforce_real_document_file','file_application') LOOP
  definition:=pg_get_functiondef(f.oid);
  IF f.proname='enforce_real_document_file' THEN
   definition:=replace(definition,'FROM public.requirements AS requirement','FROM public.requirements_for_application(NEW.application_id) AS requirement');
  ELSIF f.proname='file_application' THEN
   definition:=replace(definition,'BEGIN',E'BEGIN\n PERFORM pg_advisory_xact_lock(16112026);');
   definition:=replace(definition,'public.requirements AS requirement','(SELECT * FROM public.requirements WHERE is_active) AS requirement');
  ELSE
   definition:=replace(definition,'FROM public.requirements ', 'FROM public.requirements_for_application(p_application_id) ');
  END IF;
  EXECUTE definition;
 END LOOP;
END $$;

CREATE TABLE public.catalog_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES public.profiles(id),action text NOT NULL,target_id uuid,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.catalog_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_events_admin ON public.catalog_events FOR SELECT TO authenticated USING(public.auth_user_has_role('admin'));
CREATE TRIGGER catalog_events_immutable BEFORE UPDATE OR DELETE ON public.catalog_events FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_history_immutability();

CREATE FUNCTION public.manage_catalog(p_action text,p_id uuid DEFAULT NULL,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.application_types; r public.requirements; obj storage.objects; result_id uuid:=p_id; removed boolean:=false; previous jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active) OR NOT public.auth_user_has_role('admin') THEN RAISE EXCEPTION 'Solo el administrador puede gestionar el catálogo' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(16112026);
 IF p_action LIKE 'TYPE_%' THEN
  IF p_action<>'TYPE_CREATE' THEN SELECT * INTO t FROM public.application_types WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Trámite inexistente' USING ERRCODE='22023'; END IF; previous:=to_jsonb(t); END IF;
  IF p_action='TYPE_CREATE' THEN
   INSERT INTO public.application_types(code,name,description,requires_committee,display_order) VALUES(upper(btrim(p_data->>'code')),btrim(p_data->>'name'),p_data->>'description',coalesce((p_data->>'requires_committee')::boolean,true),coalesce((p_data->>'display_order')::int,0)) RETURNING * INTO t;
  ELSIF p_action='TYPE_UPDATE' THEN
   UPDATE public.application_types SET code=upper(btrim(coalesce(p_data->>'code',code))),name=btrim(coalesce(p_data->>'name',name)),description=CASE WHEN p_data?'description' THEN p_data->>'description' ELSE description END,
    requires_committee=coalesce((p_data->>'requires_committee')::boolean,requires_committee),display_order=coalesce((p_data->>'display_order')::int,display_order),is_active=coalesce((p_data->>'is_active')::boolean,is_active) WHERE id=p_id RETURNING * INTO t;
  ELSIF p_action='TYPE_DELETE' THEN
   IF EXISTS(SELECT 1 FROM public.applications WHERE application_type_id=p_id) OR EXISTS(SELECT 1 FROM public.funding_calls WHERE p_id=ANY(type_ids)) THEN
    UPDATE public.application_types SET is_active=false WHERE id=p_id RETURNING * INTO t;
   ELSE DELETE FROM public.application_types WHERE id=p_id; removed:=true; END IF;
  ELSE RAISE EXCEPTION 'Acción inválida' USING ERRCODE='22023'; END IF;
  IF NOT removed AND (nullif(t.code,'') IS NULL OR nullif(t.name,'') IS NULL OR length(t.name)>200 OR length(t.code)>50 OR t.display_order<0) THEN RAISE EXCEPTION 'Complete nombre, código y orden válido' USING ERRCODE='22023'; END IF;
  result_id:=t.id;
 ELSIF p_action LIKE 'REQUIREMENT_%' THEN
  IF p_action<>'REQUIREMENT_CREATE' THEN SELECT * INTO r FROM public.requirements WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Requisito inexistente' USING ERRCODE='22023'; END IF; previous:=to_jsonb(r); END IF;
  IF p_action='REQUIREMENT_CREATE' THEN
   INSERT INTO public.requirements(application_type_id,name) VALUES((p_data->>'application_type_id')::uuid,btrim(p_data->>'name')) RETURNING * INTO r;
  END IF;
  IF p_action IN ('REQUIREMENT_CREATE','REQUIREMENT_UPDATE') THEN
   IF NOT r.is_active THEN RAISE EXCEPTION 'El requisito está archivado' USING ERRCODE='22023'; END IF;
   UPDATE public.requirements SET name=btrim(coalesce(p_data->>'name',name)),description=CASE WHEN p_data?'description' THEN p_data->>'description' ELSE description END,
    is_mandatory=coalesce((p_data->>'is_mandatory')::boolean,is_mandatory),is_subsanable=coalesce((p_data->>'is_subsanable')::boolean,is_subsanable),
    max_size_mb=coalesce((p_data->>'max_size_mb')::int,max_size_mb),cure_deadline_days=coalesce((p_data->>'cure_deadline_days')::int,cure_deadline_days),
    allowed_formats=CASE WHEN p_data?'allowed_formats' THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'allowed_formats')) ELSE allowed_formats END,
    template_url=CASE WHEN p_data?'template_url' THEN nullif(p_data->>'template_url','') ELSE template_url END WHERE id=r.id RETURNING * INTO r;
   IF NOT r.is_subsanable THEN UPDATE public.requirements SET cure_deadline_days=0 WHERE id=r.id RETURNING * INTO r; END IF;
   IF nullif(r.name,'') IS NULL OR length(r.name)>300 OR r.max_size_mb NOT BETWEEN 1 AND 10 OR r.cure_deadline_days NOT BETWEEN 0 AND 365 OR cardinality(r.allowed_formats)=0 THEN RAISE EXCEPTION 'Revise nombre, formatos, tamaño y plazo del requisito' USING ERRCODE='22023'; END IF;
   IF r.template_url IS NOT NULL THEN
    SELECT * INTO obj FROM storage.objects WHERE bucket_id='catalog-templates' AND name=r.template_url;
    IF NOT FOUND OR (p_data?'template_url' AND (previous->>'template_url') IS DISTINCT FROM r.template_url AND (coalesce(obj.owner_id,obj.owner::text) IS DISTINCT FROM auth.uid()::text)) THEN RAISE EXCEPTION 'Cargue la plantilla antes de guardarla' USING ERRCODE='22023'; END IF;
    IF (obj.metadata->>'size')::bigint NOT BETWEEN 1 AND 10485760 OR obj.metadata->>'mimetype' NOT IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') OR r.template_url !~* '\.(pdf|docx|xlsx)$' THEN RAISE EXCEPTION 'Formato o tamaño de plantilla inválido' USING ERRCODE='22023'; END IF;
   END IF;
   IF p_data?'template_url' AND (previous->>'template_url') IS DISTINCT FROM r.template_url THEN
    UPDATE public.requirements SET template_revision=template_revision+1,template_updated_at=clock_timestamp() WHERE id=r.id RETURNING * INTO r;
   END IF;
  ELSIF p_action='REQUIREMENT_DELETE' THEN
   IF EXISTS(SELECT 1 FROM public.applications a WHERE a.application_type_id=r.application_type_id) THEN
    UPDATE public.requirements SET is_active=false WHERE id=r.id RETURNING * INTO r;
   ELSE DELETE FROM public.requirements WHERE id=r.id; removed:=true; END IF;
  ELSE RAISE EXCEPTION 'Acción inválida' USING ERRCODE='22023'; END IF;
  result_id:=r.id;
 ELSE RAISE EXCEPTION 'Acción inválida' USING ERRCODE='22023'; END IF;
 INSERT INTO public.catalog_events(actor_id,action,target_id,details) VALUES(auth.uid(),p_action,result_id,jsonb_build_object('before',previous,'type',to_jsonb(t),'requirement',to_jsonb(r),'deleted',removed));
 RETURN jsonb_build_object('type',to_jsonb(t),'requirement',to_jsonb(r),'deleted',removed);
END $$;
REVOKE ALL ON FUNCTION public.manage_catalog(text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_catalog(text,uuid,jsonb) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.application_types,public.requirements,public.catalog_events FROM authenticated,anon;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('catalog-templates','catalog-templates',false,10485760,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY catalog_templates_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='catalog-templates' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active));
CREATE POLICY catalog_templates_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='catalog-templates' AND (storage.foldername(name))[1]=auth.uid()::text AND public.auth_user_has_role('admin') AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active));
-- Immutable object keys preserve historical template versions. Replacements get new keys.
CREATE POLICY catalog_templates_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'catalog-templates');
CREATE POLICY catalog_templates_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'catalog-templates');
NOTIFY pgrst,'reload schema';
COMMIT;
