BEGIN;
-- Null appearance values preserve automatic identities for the existing catalog.
ALTER TABLE public.application_types
 ADD COLUMN icon_key text CHECK (icon_key IN ('folder-check','calculator','calendar','chart','file-check','flask','megaphone','graduation','users','leaf')),
 ADD COLUMN accent_color text CHECK (accent_color IN ('forest','blue','violet','amber','rose','teal'));
ALTER TABLE public.funding_calls
 ADD COLUMN icon_key text NOT NULL DEFAULT 'megaphone' CHECK (icon_key IN ('folder-check','calculator','calendar','chart','file-check','flask','megaphone','graduation','users','leaf')),
 ADD COLUMN accent_color text NOT NULL DEFAULT 'forest' CHECK (accent_color IN ('forest','blue','violet','amber','rose','teal')),
 ADD COLUMN cover_image_path text CHECK (cover_image_path IS NULL OR (length(cover_image_path) <= 200 AND cover_image_path ~ '^[a-f0-9-]+/[a-f0-9-]+\.(jpg|png|webp)$'));

CREATE OR REPLACE FUNCTION public.manage_catalog(p_action text,p_id uuid DEFAULT NULL,p_data jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.application_types; r public.requirements; obj storage.objects; result_id uuid:=p_id; removed boolean:=false; previous jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active) OR NOT public.auth_user_has_role('admin') THEN RAISE EXCEPTION 'Solo el administrador puede gestionar el catálogo' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(16112026);
 IF p_action LIKE 'TYPE_%' THEN
  IF p_action<>'TYPE_CREATE' THEN SELECT * INTO t FROM public.application_types WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Trámite inexistente' USING ERRCODE='22023'; END IF; previous:=to_jsonb(t); END IF;
  IF p_action='TYPE_CREATE' THEN
   INSERT INTO public.application_types(code,name,description,requires_committee,display_order,is_active,icon_key,accent_color) VALUES(upper(btrim(p_data->>'code')),btrim(p_data->>'name'),p_data->>'description',coalesce((p_data->>'requires_committee')::boolean,true),coalesce((p_data->>'display_order')::int,0),coalesce((p_data->>'is_active')::boolean,true),p_data->>'icon_key',p_data->>'accent_color') RETURNING * INTO t;
  ELSIF p_action='TYPE_UPDATE' THEN
   UPDATE public.application_types SET code=upper(btrim(coalesce(p_data->>'code',code))),name=btrim(coalesce(p_data->>'name',name)),description=CASE WHEN p_data?'description' THEN p_data->>'description' ELSE description END,
    requires_committee=coalesce((p_data->>'requires_committee')::boolean,requires_committee),display_order=coalesce((p_data->>'display_order')::int,display_order),is_active=coalesce((p_data->>'is_active')::boolean,is_active),
    icon_key=CASE WHEN p_data?'icon_key' THEN p_data->>'icon_key' ELSE icon_key END,
    accent_color=CASE WHEN p_data?'accent_color' THEN p_data->>'accent_color' ELSE accent_color END WHERE id=p_id RETURNING * INTO t;
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

CREATE OR REPLACE FUNCTION public.create_funding_call(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.funding_calls; result uuid; previous public.funding_calls; cover storage.objects;
BEGIN
  c := jsonb_populate_record(NULL::public.funding_calls, p_data);
  IF NOT public.can_manage_funding_calls(c.faculty) OR NOT EXISTS (
    SELECT 1 FROM public.research_groups WHERE faculty = c.faculty AND is_active
  ) THEN RAISE EXCEPTION 'No tiene permiso para gestionar convocatorias en esta área.' USING ERRCODE = '42501'; END IF;
  IF c.type_ids IS NULL OR cardinality(c.type_ids) = 0 OR EXISTS (
    SELECT 1 FROM unnest(c.type_ids) t(id) WHERE NOT EXISTS (
      SELECT 1 FROM public.application_types a WHERE a.id = t.id AND a.is_active
    )
  ) THEN RAISE EXCEPTION 'Seleccione tipos de solicitud activos.'; END IF;
  IF c.id IS NOT NULL THEN
    SELECT * INTO previous FROM public.funding_calls WHERE id=c.id FOR UPDATE;
    IF NOT FOUND OR previous.status <> 'draft' OR NOT public.can_manage_funding_calls(previous.faculty) THEN
      RAISE EXCEPTION 'Solo puede editar borradores de su área.' USING ERRCODE = '42501';
    END IF;
    IF c.cover_image_path IS NOT NULL AND c.cover_image_path IS DISTINCT FROM previous.cover_image_path THEN
      SELECT * INTO cover FROM storage.objects WHERE bucket_id='call-covers' AND name=c.cover_image_path;
      IF NOT FOUND OR coalesce(cover.owner_id,cover.owner::text) IS DISTINCT FROM auth.uid()::text THEN
        RAISE EXCEPTION 'Cargue una portada propia antes de guardar.' USING ERRCODE='22023';
      END IF;
    END IF;
    UPDATE public.funding_calls SET title=btrim(c.title), description=btrim(c.description), faculty=c.faculty,
      audience=c.audience, type_ids=c.type_ids, opens_at=c.opens_at, closes_at=c.closes_at, max_amount=c.max_amount,
      icon_key=coalesce(c.icon_key,icon_key),accent_color=coalesce(c.accent_color,accent_color),
      cover_image_path=CASE WHEN p_data?'cover_image_path' THEN c.cover_image_path ELSE cover_image_path END WHERE id=c.id;
    INSERT INTO public.funding_call_events(call_id, actor_id, action, reason) VALUES (c.id, auth.uid(), 'draft_updated', 'Actualización del borrador');
    RETURN c.id;
  END IF;
  IF c.cover_image_path IS NOT NULL THEN
    SELECT * INTO cover FROM storage.objects WHERE bucket_id='call-covers' AND name=c.cover_image_path;
    IF NOT FOUND OR coalesce(cover.owner_id,cover.owner::text) IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'Cargue una portada propia antes de guardar.' USING ERRCODE='22023';
    END IF;
  END IF;
  INSERT INTO public.funding_calls(title, description, faculty, audience, type_ids, opens_at, closes_at, max_amount, created_by,icon_key,accent_color,cover_image_path)
  VALUES (btrim(c.title), btrim(c.description), c.faculty, c.audience, c.type_ids, c.opens_at, c.closes_at, c.max_amount, auth.uid(),coalesce(c.icon_key,'megaphone'),coalesce(c.accent_color,'forest'),c.cover_image_path) RETURNING id INTO result;
  INSERT INTO public.funding_call_events(call_id, actor_id, action, reason) VALUES (result, auth.uid(), 'draft', 'Creación del borrador');
  RETURN result;
END;
$$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('call-covers','call-covers',false,3145728,ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY call_covers_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='call-covers' AND (storage.foldername(name))[1]=auth.uid()::text
 AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active)
 AND (public.auth_user_has_role('admin') OR EXISTS(SELECT 1 FROM public.funding_call_managers WHERE user_id=auth.uid()))
);
CREATE POLICY call_covers_read ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='call-covers' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active)
 AND (coalesce(owner_id,owner::text)=auth.uid()::text OR EXISTS(
  SELECT 1 FROM public.funding_calls c WHERE c.cover_image_path=name
   AND (public.can_manage_funding_calls(c.faculty) OR c.status<>'draft')
 ))
);
-- Immutable image objects avoid replacing the media of other saved convocations.
CREATE POLICY call_covers_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'call-covers');
CREATE POLICY call_covers_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'call-covers');
REVOKE ALL ON FUNCTION public.manage_catalog(text,uuid,jsonb), public.create_funding_call(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_catalog(text,uuid,jsonb), public.create_funding_call(jsonb) TO authenticated;
COMMIT;
