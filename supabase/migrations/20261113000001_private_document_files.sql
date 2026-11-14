BEGIN;

-- Keep originals in one private bucket. Historical public URLs remain resolvable
-- through authenticated downloads; the public HTTP endpoint no longer serves them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE FUNCTION public.document_object_path(p_path text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN p_path LIKE '%/storage/v1/object/public/documents/%'
    THEN split_part(p_path, '/storage/v1/object/public/documents/', 2)
    ELSE p_path END;
$$;

CREATE FUNCTION public.can_read_application_documents(p_application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS actor, public.applications AS application
    WHERE actor.id = (SELECT auth.uid()) AND actor.is_active AND application.id = p_application_id
    AND (
      application.applicant_id = actor.id
      OR public.auth_user_has_role('administrative') OR public.auth_user_has_role('administrativo')
      OR public.auth_user_has_role('secretary') OR public.auth_user_has_role('secretario')
      OR public.auth_user_has_role('admin')
      OR ((public.auth_user_has_role('leader') OR public.auth_user_has_role('lider') OR public.auth_user_has_role('lider_grupo'))
        AND EXISTS (SELECT 1 FROM public.research_groups WHERE id = application.research_group_id AND leader_id = actor.id))
      OR ((public.auth_user_has_role('committee_member') OR public.auth_user_has_role('integrante_comite') OR public.auth_user_has_role('miembro_comite'))
        AND application.applicant_id <> actor.id
        AND (application.research_group_id IS NULL OR actor.research_group_id IS DISTINCT FROM application.research_group_id)
        AND (EXISTS (SELECT 1 FROM public.reviewer_assignments AS assignment
          WHERE assignment.application_id = application.id AND assignment.reviewer_id = actor.id AND assignment.is_active)
          OR EXISTS (SELECT 1 FROM public.session_agenda AS agenda
            JOIN public.committee_sessions AS session ON session.id = agenda.session_id
            WHERE agenda.application_id = application.id AND session.is_agenda_closed AND NOT session.is_completed)))
    )
  );
$$;

CREATE INDEX IF NOT EXISTS idx_app_documents_object_path ON public.application_documents(public.document_object_path(file_path));

CREATE FUNCTION public.can_read_document_object(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.application_documents AS document
    WHERE public.document_object_path(document.file_path) = p_name
      AND public.can_read_application_documents(document.application_id));
$$;

ALTER POLICY documents_select_policy ON public.application_documents
  USING (public.can_read_application_documents(application_id));
-- New document metadata is only written by filing/correction RPCs.
DROP POLICY documents_insert_policy ON public.application_documents;

-- Restrictive policies prevent pre-existing permissive bucket policies from
-- bypassing the access checks. Other buckets retain their current behavior.
CREATE POLICY seed_documents_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO public
  USING (bucket_id <> 'documents' OR public.can_read_document_object(name));
CREATE POLICY seed_documents_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.can_read_document_object(name));
CREATE POLICY seed_documents_upload_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (bucket_id <> 'documents' OR (
    split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND array_length(string_to_array(name, '/'), 1) = 3
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_active)));
CREATE POLICY seed_documents_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_active));
CREATE POLICY seed_documents_no_overwrite ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
  USING (bucket_id <> 'documents') WITH CHECK (bucket_id <> 'documents');
CREATE POLICY seed_documents_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO public
  USING (bucket_id <> 'documents');

-- Reject invented paths and another account's uploads even through definer RPCs.
CREATE FUNCTION public.enforce_real_document_file()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_requirement public.requirements;
  v_object storage.objects;
  v_extension text;
  v_mime text;
BEGIN
  -- Maintenance fixtures/migrations without an authenticated actor remain possible.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT requirement.* INTO v_requirement FROM public.requirements AS requirement
    JOIN public.applications AS application ON application.application_type_id = requirement.application_type_id
    WHERE requirement.id = NEW.requirement_id AND application.id = NEW.application_id AND application.applicant_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'El requisito no pertenece a su solicitud.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_object FROM storage.objects WHERE bucket_id = 'documents' AND name = NEW.file_path;
  IF NOT FOUND OR split_part(NEW.file_path, '/', 1) <> auth.uid()::text
    OR COALESCE(v_object.owner_id, v_object.owner::text) IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Debe cargar el archivo original en su almacenamiento antes de registrarlo.' USING ERRCODE = '22023';
  END IF;
  v_extension := lower(substring(NEW.file_name FROM '\.([^.]+)$'));
  v_mime := CASE v_extension WHEN 'pdf' THEN 'application/pdf' WHEN 'doc' THEN 'application/msword'
    WHEN 'docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' END;
  IF v_mime IS NULL OR NEW.mime_type IS DISTINCT FROM v_mime
    OR NEW.file_size_bytes IS NULL OR NEW.file_size_bytes <= 0
    OR NEW.file_size_bytes > LEAST(10485760, v_requirement.max_size_mb::bigint * 1048576)
    OR NEW.file_size_bytes IS DISTINCT FROM (v_object.metadata->>'size')::bigint
    OR NEW.mime_type IS DISTINCT FROM v_object.metadata->>'mimetype'
    OR NEW.file_hash_sha256 IS NULL OR NEW.file_hash_sha256 !~ '^[0-9a-f]{64}$'
    OR (cardinality(v_requirement.allowed_formats) > 0 AND NOT EXISTS (
      SELECT 1 FROM unnest(v_requirement.allowed_formats) AS format
      WHERE lower(ltrim(format, '.')) = v_extension OR lower(format) = v_mime)) THEN
    RAISE EXCEPTION 'El archivo no cumple el formato, tamaño o integridad del requisito.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.application_documents WHERE file_path = NEW.file_path AND id <> NEW.id) THEN
    RAISE EXCEPTION 'El archivo ya está vinculado a otro documento.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_require_real_document_file BEFORE INSERT OR UPDATE OF file_path, file_name, file_size_bytes, file_hash_sha256, mime_type
  ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.enforce_real_document_file();

CREATE FUNCTION public.cure_application_document(p_application_id uuid, p_requirement_id uuid, p_expected_hash text, p_document jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_application public.applications;
  v_document public.application_documents;
  v_previous public.application_documents;
  v_audit public.audit_history;
  v_name text;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = auth.uid() AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inicie sesión con una cuenta activa.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_application FROM public.applications WHERE id = p_application_id AND applicant_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No tiene permiso para subsanar esta solicitud.' USING ERRCODE = '42501'; END IF;
  IF v_application.current_status NOT IN ('RADICADA','SUBMITTED','PENDIENTE_DOCUMENTOS','PENDING_DOCUMENTS') THEN
    RAISE EXCEPTION 'La solicitud ya no admite correcciones documentales.' USING ERRCODE = '40001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.requirements WHERE id = p_requirement_id
    AND application_type_id = v_application.application_type_id AND is_subsanable) THEN
    RAISE EXCEPTION 'El requisito no admite subsanación.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_previous FROM public.application_documents
    WHERE application_id = p_application_id AND requirement_id = p_requirement_id FOR UPDATE;
  -- A retried successful upload is returned without duplicating the audit event.
  IF FOUND AND v_previous.file_path = p_document->>'file_path' THEN
    SELECT * INTO v_audit FROM public.audit_history WHERE application_id = p_application_id
      AND action = 'SUBSANACION_DOCUMENTO' AND details->>'file_path' = v_previous.file_path ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN RETURN jsonb_build_object('document',to_jsonb(v_previous),'audit',to_jsonb(v_audit)); END IF;
  END IF;
  IF v_previous.file_hash_sha256 IS DISTINCT FROM p_expected_hash THEN
    RAISE EXCEPTION 'El documento cambió. Recargue el expediente antes de subsanar.' USING ERRCODE = '40001'; END IF;
  IF v_previous.id IS NOT NULL AND v_previous.validation_status NOT IN ('RECHAZADO','REJECTED')
    AND v_application.current_status NOT IN ('PENDIENTE_DOCUMENTOS','PENDING_DOCUMENTS') THEN
    RAISE EXCEPTION 'Este documento no requiere corrección.' USING ERRCODE = '22023'; END IF;

  IF v_previous.id IS NULL THEN
    INSERT INTO public.application_documents(application_id,requirement_id,file_name,file_path,file_size_bytes,file_hash_sha256,mime_type,validation_status)
    VALUES (p_application_id,p_requirement_id,p_document->>'file_name',p_document->>'file_path',
      (p_document->>'file_size_bytes')::bigint,p_document->>'file_hash_sha256',p_document->>'mime_type','PENDIENTE')
    RETURNING * INTO v_document;
  ELSE
    UPDATE public.application_documents SET file_name = p_document->>'file_name',file_path = p_document->>'file_path',
      file_size_bytes = (p_document->>'file_size_bytes')::bigint,file_hash_sha256 = p_document->>'file_hash_sha256',
      mime_type = p_document->>'mime_type',validation_status = 'PENDIENTE',validation_observations = NULL,
      validated_by = NULL,validated_at = NULL,uploaded_at = clock_timestamp()
    WHERE id = v_previous.id RETURNING * INTO v_document;
  END IF;
  INSERT INTO public.audit_history(application_id,actor_id,action,previous_status,new_status,details)
  VALUES (p_application_id,auth.uid(),'SUBSANACION_DOCUMENTO',v_application.current_status,v_application.current_status,
    jsonb_build_object('requirement_id',p_requirement_id,'file_name',v_document.file_name,'file_path',v_document.file_path,
      'file_hash_sha256',v_document.file_hash_sha256,'actor_name',v_name,'previous_document',to_jsonb(v_previous)))
  RETURNING * INTO v_audit;
  RETURN jsonb_build_object('document',to_jsonb(v_document),'audit',to_jsonb(v_audit));
END;
$$;

REVOKE ALL ON FUNCTION public.document_object_path(text), public.can_read_application_documents(uuid),
  public.can_read_document_object(text), public.enforce_real_document_file(),
  public.cure_application_document(uuid,uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.document_object_path(text), public.can_read_application_documents(uuid),
  public.can_read_document_object(text), public.cure_application_document(uuid,uuid,text,jsonb) TO authenticated;
-- RLS guards also execute for anonymous reads and must evaluate to false.
GRANT EXECUTE ON FUNCTION public.can_read_application_documents(uuid), public.can_read_document_object(text) TO anon;

NOTIFY pgrst, 'reload schema';
COMMIT;
