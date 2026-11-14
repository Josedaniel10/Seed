BEGIN;
CREATE TABLE public.funding_call_managers (
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  faculty text NOT NULL CHECK (length(btrim(faculty)) > 0),
  designation text NOT NULL CHECK (designation IN ('decano', 'lider')),
  PRIMARY KEY (user_id, faculty)
);
CREATE FUNCTION public.can_manage_funding_calls(p_faculty text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.auth_user_has_role('admin') OR EXISTS (
    SELECT 1 FROM public.funding_call_managers m JOIN public.profiles p ON p.id = m.user_id
    WHERE m.user_id = auth.uid() AND p.is_active AND m.faculty = p_faculty
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_funding_calls(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_funding_calls(text) TO authenticated;
ALTER TABLE public.funding_call_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY manager_read ON public.funding_call_managers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.auth_user_has_role('admin'));
CREATE POLICY manager_admin ON public.funding_call_managers FOR ALL TO authenticated
USING (public.auth_user_has_role('admin')) WITH CHECK (public.auth_user_has_role('admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_call_managers TO authenticated;
CREATE TABLE public.funding_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(btrim(description)) >= 20),
  faculty text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('all', 'students', 'teachers')),
  type_ids uuid[] NOT NULL CHECK (cardinality(type_ids) > 0),
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL CHECK (closes_at > opens_at),
  max_amount numeric(14,2) CHECK (max_amount > 0 AND max_amount <> 'NaN'::numeric),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX funding_calls_window ON public.funding_calls(status, closes_at);
ALTER TABLE public.funding_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY call_read ON public.funding_calls FOR SELECT TO authenticated
USING (public.can_manage_funding_calls(faculty) OR (status <> 'draft' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active)));
GRANT SELECT ON public.funding_calls TO authenticated;
CREATE TABLE public.funding_call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.funding_calls(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX funding_call_events_call ON public.funding_call_events(call_id);
ALTER TABLE public.funding_call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY call_event_read ON public.funding_call_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.funding_calls c WHERE c.id = call_id AND public.can_manage_funding_calls(c.faculty))
);
GRANT SELECT ON public.funding_call_events TO authenticated;
CREATE FUNCTION public.create_funding_call(p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.funding_calls; result uuid; previous public.funding_calls;
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
    UPDATE public.funding_calls SET title=btrim(c.title), description=btrim(c.description), faculty=c.faculty,
      audience=c.audience, type_ids=c.type_ids, opens_at=c.opens_at, closes_at=c.closes_at, max_amount=c.max_amount WHERE id=c.id;
    INSERT INTO public.funding_call_events(call_id, actor_id, action, reason) VALUES (c.id, auth.uid(), 'draft_updated', 'Actualización del borrador');
    RETURN c.id;
  END IF;
  INSERT INTO public.funding_calls(title, description, faculty, audience, type_ids, opens_at, closes_at, max_amount, created_by)
  VALUES (btrim(c.title), btrim(c.description), c.faculty, c.audience, c.type_ids, c.opens_at, c.closes_at, c.max_amount, auth.uid()) RETURNING id INTO result;
  INSERT INTO public.funding_call_events(call_id, actor_id, action, reason) VALUES (result, auth.uid(), 'draft', 'Creación del borrador');
  RETURN result;
END;
$$;
CREATE FUNCTION public.change_funding_call_status(p_id uuid, p_status text, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.funding_calls;
BEGIN
  SELECT * INTO c FROM public.funding_calls WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_funding_calls(c.faculty) THEN RAISE EXCEPTION 'No tiene permiso sobre esta convocatoria.' USING ERRCODE = '42501'; END IF;
  IF NOT ((c.status = 'draft' AND p_status IN ('published', 'cancelled')) OR (c.status = 'published' AND p_status IN ('closed', 'cancelled'))) THEN
    RAISE EXCEPTION 'La convocatoria cambió o la transición no está permitida.';
  END IF;
  IF p_status = 'published' AND c.closes_at <= clock_timestamp() THEN RAISE EXCEPTION 'No se puede publicar una convocatoria vencida.'; END IF;
  IF p_status <> 'published' AND NULLIF(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'Debe indicar el motivo.'; END IF;
  UPDATE public.funding_calls SET status = p_status WHERE id = p_id;
  INSERT INTO public.funding_call_events(call_id, actor_id, action, reason) VALUES (p_id, auth.uid(), p_status, COALESCE(NULLIF(btrim(p_reason), ''), 'Publicación'));
END;
$$;
REVOKE ALL ON FUNCTION public.create_funding_call(jsonb), public.change_funding_call_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_funding_call(jsonb), public.change_funding_call_status(uuid,text,text) TO authenticated;
ALTER TABLE public.applications ADD COLUMN funding_call_id uuid REFERENCES public.funding_calls(id);
CREATE INDEX applications_funding_call ON public.applications(funding_call_id);
-- Historical requests retain their budget and lack of a call. Future updates cannot
-- convert an academic endorsement or replace the terms accepted at filing.
CREATE FUNCTION public.guard_application_funding() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.funding_call_id IS DISTINCT FROM OLD.funding_call_id OR NEW.budget_requested IS DISTINCT FROM OLD.budget_requested
    OR (OLD.funding_call_id IS NOT NULL AND (NEW.application_type_id IS DISTINCT FROM OLD.application_type_id
      OR NEW.research_group_id IS DISTINCT FROM OLD.research_group_id OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id)) THEN
    RAISE EXCEPTION 'La modalidad, el monto y la convocatoria de una solicitud radicada no se pueden modificar.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_application_funding BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.guard_application_funding();
-- Updated atomic filing function follows below.
DROP FUNCTION public.file_application(uuid, uuid, uuid, text, text, uuid, numeric, boolean, jsonb);
CREATE FUNCTION public.file_application(
  p_id uuid,
  p_applicant_id uuid,
  p_type_id uuid,
  p_title text,
  p_abstract text,
  p_group_id uuid,
  p_budget numeric,
  p_tutor_endorsed boolean,
  p_documents jsonb,
  p_call_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_type public.application_types;
  v_audit public.audit_history;
  v_year int := EXTRACT(YEAR FROM statement_timestamp() AT TIME ZONE 'America/Bogota');
  v_prefix text := 'Radicado ' || v_year || '-';
  v_next text;
  v_call public.funding_calls;
  v_profile public.profiles;
  v_faculty text;
BEGIN
  IF v_actor IS NULL OR v_actor IS DISTINCT FROM p_applicant_id OR NOT (
    public.auth_user_has_role('researcher')
    OR public.auth_user_has_role('investigador')
    OR public.auth_user_has_role('admin')
  ) THEN
    RAISE EXCEPTION 'La sesión no tiene permiso para radicar esta solicitud.' USING ERRCODE = '42501';
  END IF;
  -- Serialize retries for the same submission, including across a year boundary.
  PERFORM pg_advisory_xact_lock(24001, hashtext(p_id::text));
  SELECT * INTO v_application FROM public.applications WHERE id = p_id;
  IF FOUND THEN
    IF v_application.applicant_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'La solicitud pertenece a otra cuenta.' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO STRICT v_audit FROM public.audit_history
    WHERE application_id = p_id AND action = 'RADICACION_INICIAL' AND actor_id = v_actor
    ORDER BY created_at, id LIMIT 1;
  ELSE
    SELECT * INTO v_type FROM public.application_types WHERE id = p_type_id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El tipo de solicitud no existe o está inactivo.' USING ERRCODE = '22023';
    END IF;
    IF NULLIF(btrim(p_title), '') IS NULL OR NULLIF(btrim(p_abstract), '') IS NULL
      OR p_budget IS NULL OR p_budget < 0 OR jsonb_typeof(p_documents) IS DISTINCT FROM 'array'
    THEN
      RAISE EXCEPTION 'Los datos de la solicitud son inválidos.' USING ERRCODE = '22023';
    END IF;
    IF p_budget = 'NaN'::numeric OR p_budget = 'Infinity'::numeric THEN RAISE EXCEPTION 'Monto inválido.'; END IF;
    IF p_budget = 0 AND p_call_id IS NOT NULL THEN RAISE EXCEPTION 'El aval académico no debe vincular financiamiento.'; END IF;
    IF p_budget > 0 THEN
      SELECT * INTO v_call FROM public.funding_calls WHERE id = p_call_id FOR SHARE;
      IF NOT FOUND OR v_call.status <> 'published' OR clock_timestamp() < v_call.opens_at OR clock_timestamp() >= v_call.closes_at THEN
        RAISE EXCEPTION 'No hay una convocatoria abierta válida para esta solicitud de financiamiento.';
      END IF;
      SELECT * INTO STRICT v_profile FROM public.profiles WHERE id = v_actor AND is_active;
      SELECT faculty INTO v_faculty FROM public.research_groups WHERE id = v_profile.research_group_id AND is_active;
      IF p_group_id IS DISTINCT FROM v_profile.research_group_id OR v_faculty IS DISTINCT FROM v_call.faculty
        OR NOT (p_type_id = ANY(v_call.type_ids)) THEN RAISE EXCEPTION 'La convocatoria no corresponde al área o tipo de solicitud.'; END IF;
      IF (v_call.audience = 'students' AND COALESCE(v_profile.academic_link, '') !~* '(estudiante|monitor)')
        OR (v_call.audience = 'teachers' AND COALESCE(v_profile.academic_link, '') !~* '(docente|profesor)') THEN
        RAISE EXCEPTION 'No pertenece a la población destinataria de la convocatoria.';
      END IF;
      IF v_call.max_amount IS NOT NULL AND p_budget > v_call.max_amount THEN RAISE EXCEPTION 'El monto supera el tope de la convocatoria.'; END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_documents) AS document(requirement_id uuid)
      LEFT JOIN public.requirements AS requirement
        ON requirement.id = document.requirement_id AND requirement.application_type_id = p_type_id
      GROUP BY document.requirement_id, requirement.id
      HAVING requirement.id IS NULL OR count(*) > 1
    ) OR EXISTS (
      SELECT 1 FROM public.requirements AS requirement
      WHERE requirement.application_type_id = p_type_id AND requirement.is_mandatory
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_to_recordset(p_documents) AS document(requirement_id uuid)
          WHERE document.requirement_id = requirement.id
        )
    ) THEN
      RAISE EXCEPTION 'Revise los documentos obligatorios, duplicados o ajenos al trámite.' USING ERRCODE = '22023';
    END IF;
    -- Serialize numbering across applicants and continue the existing yearly series.
    PERFORM pg_advisory_xact_lock(24002, v_year);
    SELECT (COALESCE(max(substring(filing_number FROM length(v_prefix) + 1)::numeric), 0) + 1)::text
    INTO v_next
    FROM public.applications
    WHERE filing_number ~ ('^' || v_prefix || '[0-9]+$');
    INSERT INTO public.applications (
      id, filing_number, application_type_id, applicant_id, title, abstract,
      research_group_id, budget_requested, current_status, is_tutor_endorsed, requires_committee, funding_call_id
    ) VALUES (
      p_id, v_prefix || lpad(v_next, greatest(3, length(v_next)), '0'), p_type_id, v_actor,
      btrim(p_title), btrim(p_abstract), p_group_id, p_budget, 'RADICADA', p_tutor_endorsed,
      v_type.requires_committee, p_call_id
    ) RETURNING * INTO v_application;
    INSERT INTO public.application_documents (
      application_id, requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256, mime_type,
      validation_status
    )
    SELECT p_id, requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256, mime_type, 'PENDIENTE'
    FROM jsonb_to_recordset(p_documents) AS document(
      requirement_id uuid, file_name text, file_path text, file_size_bytes bigint,
      file_hash_sha256 text, mime_type text
    );
    INSERT INTO public.audit_history (application_id, actor_id, action, new_status, details)
    VALUES (p_id, v_actor, 'RADICACION_INICIAL', 'RADICADA', jsonb_build_object(
      'filing_number', v_application.filing_number, 'title', v_application.title,
      'applicant_name', (SELECT full_name FROM public.profiles WHERE id = v_actor),
      'funding_call_id', p_call_id, 'budget_requested', p_budget,
      'documents_count', jsonb_array_length(p_documents),
      'type_code', v_type.code, 'type_name', v_type.name, 'timestamp', v_application.created_at
    )) RETURNING * INTO v_audit;
  END IF;
  RETURN jsonb_build_object(
    'application', to_jsonb(v_application),
    'documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(document)) FROM public.application_documents AS document
      WHERE document.application_id = p_id
    ), '[]'::jsonb),
    'audit', to_jsonb(v_audit)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.file_application(uuid, uuid, uuid, text, text, uuid, numeric, boolean, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_application(uuid, uuid, uuid, text, text, uuid, numeric, boolean, jsonb, uuid)
  TO authenticated;
COMMIT;
