BEGIN;

CREATE TABLE public.session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.committee_sessions(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  user_name text NOT NULL,
  user_role text NOT NULL,
  attended boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_read ON public.session_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY agenda_read ON public.session_agenda FOR SELECT TO authenticated USING (true);
CREATE POLICY decisions_read ON public.session_decisions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id));
GRANT SELECT ON public.session_attendance TO authenticated;
CREATE UNIQUE INDEX session_decision_once ON public.session_decisions(session_id, application_id);
CREATE INDEX session_attendance_user ON public.session_attendance(user_id);

-- All workflow writes go through atomic, authenticated operations.
REVOKE INSERT, UPDATE, DELETE ON public.committee_sessions, public.session_agenda,
  public.session_attendance, public.session_decisions, public.committee_minutes FROM authenticated, anon;

CREATE FUNCTION public.committee_member_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id FROM public.profiles p WHERE p.is_active AND (
    p.role IN ('committee_member', 'integrante_comite', 'secretary', 'secretario')
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.is_active
      AND r.role IN ('committee_member', 'integrante_comite', 'secretary', 'secretario'))
  );
$$;
REVOKE ALL ON FUNCTION public.committee_member_ids() FROM PUBLIC;

CREATE FUNCTION public.manage_committee_session(p_action text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_session public.committee_sessions;
  v_application public.applications;
  v_item public.session_agenda;
  v_decision public.session_decisions;
  v_attendance public.session_attendance;
  v_audit public.audit_history;
  v_year int;
  v_number int;
  v_count int;
  v_previous text;
  v_next text;
  v_type text;
  v_app_id uuid := (p_payload->>'application_id')::uuid;
  v_speaker uuid := (p_payload->>'speaker_id')::uuid;
BEGIN
  IF NOT (public.auth_user_has_role('secretary') OR public.auth_user_has_role('secretario')
    OR public.auth_user_has_role('admin')) THEN
    RAISE EXCEPTION 'La cuenta no tiene permiso para gestionar sesiones.' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'create' THEN
    v_type := CASE p_payload->>'session_type' WHEN 'ORDINARY' THEN 'ORDINARIA'
      WHEN 'EXTRAORDINARY' THEN 'EXTRAORDINARIA' ELSE p_payload->>'session_type' END;
    IF v_type IS NULL OR v_type NOT IN ('ORDINARIA', 'EXTRAORDINARIA')
      OR NULLIF(btrim(p_payload->>'location_or_url'), '') IS NULL
      OR (p_payload->>'scheduled_at')::timestamptz IS NULL THEN
      RAISE EXCEPTION 'Indique tipo, fecha, hora y lugar de la sesión.';
    END IF;
    SELECT count(*) INTO v_count FROM public.committee_member_ids();
    v_number := COALESCE((p_payload->>'quorum_required')::int, 4);
    IF v_number < 1 OR v_number > v_count THEN
      RAISE EXCEPTION 'El quórum debe estar entre 1 y % integrantes activos.', v_count;
    END IF;
    v_year := extract(year FROM (p_payload->>'scheduled_at')::timestamptz AT TIME ZONE 'America/Bogota');
    PERFORM pg_advisory_xact_lock(701, v_year);
    SELECT COALESCE(max((substring(session_number FROM 'Nº ([0-9]+)'))::int), 0) + 1
      INTO v_number FROM public.committee_sessions
      WHERE extract(year FROM scheduled_at AT TIME ZONE 'America/Bogota') = v_year;
    INSERT INTO public.committee_sessions(session_number, session_type, scheduled_at, location_or_url, quorum_required)
    VALUES (format('Sesión %s Nº %s - %s', CASE v_type WHEN 'ORDINARIA' THEN 'Ordinaria' ELSE 'Extraordinaria' END,
      lpad(v_number::text, greatest(2, length(v_number::text)), '0'), v_year), v_type, (p_payload->>'scheduled_at')::timestamptz,
      btrim(p_payload->>'location_or_url'), COALESCE((p_payload->>'quorum_required')::int, 4))
    RETURNING * INTO v_session;
    INSERT INTO public.session_attendance(session_id, user_id, user_name, user_role)
      SELECT v_session.id, p.id, p.full_name, 'Integrante del comité' FROM public.profiles p
      WHERE p.id IN (SELECT public.committee_member_ids());
    RETURN jsonb_build_object('session', to_jsonb(v_session));
  END IF;

  SELECT * INTO v_session FROM public.committee_sessions
    WHERE id = (p_payload->>'session_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no encontrada.'; END IF;
  IF v_session.is_completed THEN RAISE EXCEPTION 'La sesión ya está finalizada.'; END IF;

  IF p_action IN ('add', 'remove', 'reorder', 'speaker') THEN
    IF v_session.is_agenda_closed THEN RAISE EXCEPTION 'La agenda ya está cerrada.'; END IF;
    IF p_action = 'add' THEN
      SELECT * INTO v_application FROM public.applications WHERE id = v_app_id FOR UPDATE;
      IF NOT FOUND OR v_application.current_status NOT IN ('LISTA_COMITE', 'COMMITTEE_READY') THEN
        RAISE EXCEPTION 'Solo se pueden agendar solicitudes listas para comité.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.session_agenda a JOIN public.committee_sessions s ON s.id = a.session_id
        WHERE a.application_id = v_app_id AND NOT s.is_completed) THEN
        RAISE EXCEPTION 'La solicitud ya pertenece a una sesión pendiente.';
      END IF;
    END IF;
    IF p_action IN ('add', 'speaker') AND v_speaker IS NOT NULL THEN
      IF v_speaker NOT IN (SELECT public.committee_member_ids()) THEN
        RAISE EXCEPTION 'El ponente debe ser un integrante activo del comité.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.applications a JOIN public.profiles p ON p.id = v_speaker
        WHERE a.id = v_app_id AND (a.applicant_id = p.id OR a.research_group_id = p.research_group_id)) THEN
        RAISE EXCEPTION 'El ponente tiene un conflicto de interés con la solicitud.';
      END IF;
    END IF;
    IF p_action = 'add' THEN
      INSERT INTO public.session_agenda(session_id, application_id, agenda_order, speaker_id)
      SELECT v_session.id, v_app_id, COALESCE(max(agenda_order), 0) + 1, v_speaker
        FROM public.session_agenda WHERE session_id = v_session.id RETURNING * INTO v_item;
      INSERT INTO public.audit_history(application_id, actor_id, action, previous_status, new_status, details)
      VALUES (v_app_id, v_actor, 'INCORPORACION_AGENDA_COMITE', v_application.current_status,
        v_application.current_status, jsonb_build_object('session_id', v_session.id,
          'session_number', v_session.session_number, 'agenda_order', v_item.agenda_order));
    ELSIF p_action = 'remove' THEN
      DELETE FROM public.session_agenda WHERE session_id = v_session.id AND application_id = v_app_id;
      WITH ordered AS (SELECT id, row_number() OVER (ORDER BY agenda_order) n
        FROM public.session_agenda WHERE session_id = v_session.id)
      UPDATE public.session_agenda a SET agenda_order = o.n FROM ordered o WHERE a.id = o.id;
    ELSIF p_action = 'speaker' THEN
      UPDATE public.session_agenda SET speaker_id = v_speaker
        WHERE session_id = v_session.id AND application_id = v_app_id RETURNING * INTO v_item;
      IF NOT FOUND THEN RAISE EXCEPTION 'El expediente no está en la agenda.'; END IF;
    ELSE
      IF (SELECT count(*) FROM public.session_agenda WHERE session_id = v_session.id) <>
        jsonb_array_length(p_payload->'ordered_ids') OR
        (SELECT count(DISTINCT id) FROM jsonb_array_elements_text(p_payload->'ordered_ids') id) <>
        jsonb_array_length(p_payload->'ordered_ids') OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p_payload->'ordered_ids') o(id)
          WHERE NOT EXISTS (SELECT 1 FROM public.session_agenda a WHERE a.id = o.id::uuid AND a.session_id = v_session.id)) THEN
        RAISE EXCEPTION 'El orden debe incluir todos los temas de esta sesión una sola vez.';
      END IF;
      UPDATE public.session_agenda a SET agenda_order = o.n
        FROM jsonb_array_elements_text(p_payload->'ordered_ids') WITH ORDINALITY o(id, n)
        WHERE a.id = o.id::uuid AND a.session_id = v_session.id;
    END IF;
    RETURN jsonb_build_object('agendaItem', to_jsonb(v_item));
  ELSIF p_action = 'close' THEN
    IF v_session.is_agenda_closed THEN RAISE EXCEPTION 'La agenda ya está cerrada.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.session_agenda WHERE session_id = v_session.id) THEN
      RAISE EXCEPTION 'Agregue al menos una solicitud antes de cerrar la agenda.';
    END IF;
    UPDATE public.committee_sessions SET is_agenda_closed = true WHERE id = v_session.id RETURNING * INTO v_session;
    RETURN jsonb_build_object('session', to_jsonb(v_session));
  ELSIF p_action = 'attendance' THEN
    UPDATE public.session_attendance SET attended = (p_payload->>'attended')::boolean,
      notes = COALESCE(p_payload->>'notes', notes), updated_at = now()
      WHERE session_id = v_session.id AND user_id = (p_payload->>'user_id')::uuid
      RETURNING * INTO v_attendance;
    IF NOT FOUND THEN RAISE EXCEPTION 'El integrante no pertenece a esta sesión.'; END IF;
    RETURN jsonb_build_object('attendance', to_jsonb(v_attendance));
  ELSIF p_action IN ('decision', 'finalize') THEN
    IF NOT v_session.is_agenda_closed THEN RAISE EXCEPTION 'Cierre la agenda antes de deliberar.'; END IF;
    SELECT count(*) INTO v_count FROM public.session_attendance a
      WHERE a.session_id = v_session.id AND a.attended AND a.user_id IN (SELECT public.committee_member_ids());
    IF v_count < v_session.quorum_required THEN RAISE EXCEPTION 'No hay quórum reglamentario.'; END IF;
    IF p_action = 'finalize' THEN
      IF EXISTS (SELECT 1 FROM public.session_agenda a WHERE a.session_id = v_session.id AND NOT EXISTS (
        SELECT 1 FROM public.session_decisions d WHERE d.session_id = a.session_id AND d.application_id = a.application_id)) THEN
        RAISE EXCEPTION 'Registre la decisión de todos los expedientes antes de finalizar.';
      END IF;
      UPDATE public.committee_sessions SET is_completed = true WHERE id = v_session.id RETURNING * INTO v_session;
      RETURN jsonb_build_object('session', to_jsonb(v_session));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.session_agenda WHERE session_id = v_session.id AND application_id = v_app_id) THEN
      RAISE EXCEPTION 'El expediente no está en la agenda.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.session_decisions WHERE session_id = v_session.id AND application_id = v_app_id) THEN
      RAISE EXCEPTION 'La decisión ya está registrada.';
    END IF;
    SELECT * INTO v_application FROM public.applications WHERE id = v_app_id FOR UPDATE;
    IF v_application.current_status NOT IN ('LISTA_COMITE', 'COMMITTEE_READY') THEN
      RAISE EXCEPTION 'La solicitud debe estar lista para comité.';
    END IF;
    -- Conflicted members do not count toward the quorum for this application.
    SELECT count(*) INTO v_count FROM public.session_attendance a JOIN public.profiles p ON p.id = a.user_id
      WHERE a.session_id = v_session.id AND a.attended AND a.user_id IN (SELECT public.committee_member_ids())
        AND p.id <> v_application.applicant_id
        AND (v_application.research_group_id IS NULL OR p.research_group_id IS DISTINCT FROM v_application.research_group_id);
    IF v_count < v_session.quorum_required THEN RAISE EXCEPTION 'No hay quórum sin conflicto de interés para esta solicitud.'; END IF;
    v_next := CASE p_payload->>'decision' WHEN 'APPROVED' THEN 'APROBADA'
      WHEN 'APPROVED_WITH_ADJUSTMENTS' THEN 'APROBADA_CON_AJUSTES'
      WHEN 'REJECTED' THEN 'RECHAZADA' WHEN 'POSTPONED' THEN 'APLAZADA' ELSE p_payload->>'decision' END;
    IF v_next IS NULL OR v_next NOT IN ('APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'APLAZADA')
      OR NULLIF(btrim(p_payload->>'justification'), '') IS NULL THEN
      RAISE EXCEPTION 'Seleccione una decisión y escriba su justificación.';
    END IF;
    v_previous := v_application.current_status;
    INSERT INTO public.session_decisions(session_id, application_id, decision, justification, registered_by)
      VALUES (v_session.id, v_app_id, v_next, btrim(p_payload->>'justification'), v_actor) RETURNING * INTO v_decision;
    UPDATE public.applications SET current_status = CASE WHEN v_next = 'APLAZADA' THEN current_status ELSE v_next END,
      updated_at = now() WHERE id = v_app_id;
    INSERT INTO public.audit_history(application_id, actor_id, action, previous_status, new_status, details)
    VALUES (v_app_id, v_actor, 'DECISION_COMITE_' || v_next, v_previous,
      CASE WHEN v_next = 'APLAZADA' THEN v_previous ELSE v_next END,
      jsonb_build_object('session_id', v_session.id, 'session_number', v_session.session_number,
        'decision', v_next, 'justification', v_decision.justification, 'quorum_attendees', v_count,
        'quorum_required', v_session.quorum_required)) RETURNING * INTO v_audit;
    RETURN jsonb_build_object('decision', to_jsonb(v_decision), 'audit', to_jsonb(v_audit));
  END IF;
  RAISE EXCEPTION 'Acción de sesión no reconocida.';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_committee_session(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_committee_session(text, jsonb) TO authenticated;

CREATE FUNCTION public.protect_approved_minutes()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.is_approved THEN RAISE EXCEPTION 'Las actas aprobadas son inmutables.'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER approved_minutes_immutable BEFORE UPDATE OR DELETE ON public.committee_minutes
  FOR EACH ROW EXECUTE FUNCTION public.protect_approved_minutes();

CREATE FUNCTION public.manage_committee_minutes(p_action text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_session public.committee_sessions;
  v_minute public.committee_minutes;
  v_year int;
  v_number int;
  v_content text;
  v_attendance text;
  v_agenda text;
BEGIN
  IF NOT (public.auth_user_has_role('secretary') OR public.auth_user_has_role('secretario')
    OR public.auth_user_has_role('admin')) THEN
    RAISE EXCEPTION 'La cuenta no tiene permiso para gestionar actas.' USING ERRCODE = '42501';
  END IF;
  IF p_action = 'generate' THEN
    SELECT * INTO v_session FROM public.committee_sessions WHERE id = (p_payload->>'session_id')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT v_session.is_completed THEN RAISE EXCEPTION 'Finalice la sesión antes de generar su acta.'; END IF;
    SELECT * INTO v_minute FROM public.committee_minutes WHERE session_id = v_session.id;
    IF FOUND THEN RETURN to_jsonb(v_minute); END IF;
    v_year := extract(year FROM v_session.scheduled_at AT TIME ZONE 'America/Bogota');
    PERFORM pg_advisory_xact_lock(702, v_year);
    SELECT COALESCE(max((substring(minute_number FROM 'Acta ([0-9]+)'))::int), 0) + 1 INTO v_number
      FROM public.committee_minutes WHERE year = v_year;
    SELECT string_agg(a.user_name || ' - ' || CASE WHEN a.attended THEN 'Presente' ELSE 'Ausente' END, E'\n' ORDER BY a.user_name)
      INTO v_attendance FROM public.session_attendance a WHERE a.session_id = v_session.id;
    SELECT string_agg(format('%s. %s - %s%sInvestigador solicitante %s%sPonente %s%sDecisión %s%sFundamento %s', a.agenda_order,
      r.filing_number, r.title, E'\n', applicant.full_name, E'\n', COALESCE(p.full_name, 'Sin ponente'), E'\n', d.decision,
      E'\n', d.justification), E'\n\n' ORDER BY a.agenda_order) INTO v_agenda
      FROM public.session_agenda a JOIN public.applications r ON r.id = a.application_id
      JOIN public.profiles applicant ON applicant.id = r.applicant_id
      LEFT JOIN public.profiles p ON p.id = a.speaker_id
      JOIN public.session_decisions d ON d.session_id = a.session_id AND d.application_id = a.application_id
      WHERE a.session_id = v_session.id;
    v_content := format('ACTA %s DE %s%s%s%sFecha y hora %s (Colombia)%sLugar %s%s%sASISTENCIA%s%s%s%sAGENDA Y DECISIONES%s%s',
      lpad(v_number::text, greatest(3, length(v_number::text)), '0'), v_year, E'\n', v_session.session_number, E'\n',
      to_char(v_session.scheduled_at AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI'), E'\n',
      v_session.location_or_url, E'\n', E'\n', E'\n', v_attendance, E'\n', E'\n', E'\n', v_agenda);
    INSERT INTO public.committee_minutes(minute_number, year, session_id, draft_content)
      VALUES (format('Acta %s de %s', lpad(v_number::text, greatest(3, length(v_number::text)), '0'), v_year), v_year, v_session.id, v_content)
      RETURNING * INTO v_minute;
  ELSE
    SELECT * INTO v_minute FROM public.committee_minutes WHERE id = (p_payload->>'minute_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Acta no encontrada.'; END IF;
    IF v_minute.is_approved THEN RAISE EXCEPTION 'El acta ya está aprobada y es inmutable.'; END IF;
    IF p_action = 'update' THEN
      IF NULLIF(btrim(p_payload->>'draft_content'), '') IS NULL THEN RAISE EXCEPTION 'El acta debe tener contenido.'; END IF;
      UPDATE public.committee_minutes SET draft_content = p_payload->>'draft_content'
        WHERE id = v_minute.id RETURNING * INTO v_minute;
    ELSIF p_action = 'approve' THEN
      UPDATE public.committee_minutes SET is_approved = true, approved_at = now()
        WHERE id = v_minute.id RETURNING * INTO v_minute;
      INSERT INTO public.audit_history(application_id, actor_id, action, details)
        SELECT a.application_id, auth.uid(), 'APROBACION_ACTA_COMITE',
          jsonb_build_object('minute_number', v_minute.minute_number, 'session_id', v_minute.session_id)
        FROM public.session_agenda a WHERE a.session_id = v_minute.session_id;
    ELSE RAISE EXCEPTION 'Acción de acta no reconocida.';
    END IF;
  END IF;
  RETURN to_jsonb(v_minute);
END;
$$;
REVOKE ALL ON FUNCTION public.manage_committee_minutes(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_committee_minutes(text, jsonb) TO authenticated;

COMMIT;
