BEGIN;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.committee_sessions(id) ON DELETE SET NULL,
  target_tab text CHECK (target_tab IN ('resumen', 'documentos', 'observaciones', 'historial', 'agenda', 'acta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);
CREATE INDEX notifications_inbox ON public.notifications(user_id, created_at DESC, id DESC);
CREATE INDEX notifications_unread ON public.notifications(user_id) WHERE NOT is_read;
CREATE INDEX notifications_application ON public.notifications(application_id);
CREATE INDEX notifications_session ON public.notifications(session_id);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_active));
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_active))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Private entry point: clients cannot invent notifications or choose recipients.
CREATE FUNCTION public.emit_notification(
  p_user uuid, p_key text, p_type text, p_title text, p_message text,
  p_application uuid DEFAULT NULL, p_session uuid DEFAULT NULL, p_tab text DEFAULT NULL
)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.notifications(user_id, event_key, type, title, message, application_id, session_id, target_tab)
  SELECT p_user, p_key, p_type, p_title, p_message, p_application, p_session, p_tab
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND is_active)
  ON CONFLICT (user_id, event_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.emit_notification(uuid, text, text, text, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.notification_status_label(p_status text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE p_status
    WHEN 'SUBMITTED' THEN 'Radicada' WHEN 'RADICADA' THEN 'Radicada'
    WHEN 'PENDING_DOCUMENTS' THEN 'Pendiente de documentos' WHEN 'PENDIENTE_DOCUMENTOS' THEN 'Pendiente de documentos'
    WHEN 'UNDER_REVIEW' THEN 'En revisión' WHEN 'EN_REVISION' THEN 'En revisión'
    WHEN 'COMMITTEE_READY' THEN 'Lista para comité' WHEN 'LISTA_COMITE' THEN 'Lista para comité'
    WHEN 'APPROVED' THEN 'Aprobada' WHEN 'APROBADA' THEN 'Aprobada'
    WHEN 'APPROVED_WITH_ADJUSTMENTS' THEN 'Aprobada con ajustes' WHEN 'APROBADA_CON_AJUSTES' THEN 'Aprobada con ajustes'
    WHEN 'REJECTED' THEN 'Rechazada' WHEN 'RECHAZADA' THEN 'Rechazada'
    WHEN 'CLOSED' THEN 'Cerrada' WHEN 'CERRADA' THEN 'Cerrada'
    WHEN 'POSTPONED' THEN 'Aplazada' WHEN 'APLAZADA' THEN 'Aplazada' ELSE p_status END;
$$;
REVOKE ALL ON FUNCTION public.notification_status_label(text) FROM PUBLIC, anon, authenticated;

-- Deferred until the end of the transaction: a committee decision emits one complete
-- notification instead of another generic status notification for the same change.
CREATE FUNCTION public.notify_application_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_notification(NEW.applicant_id, 'filed:' || NEW.id, 'SOLICITUD_RADICADA',
      'Solicitud radicada', format('Su solicitud %s — %s fue radicada correctamente.', NEW.filing_number, NEW.title),
      NEW.id, NULL, 'resumen');
  ELSIF public.notification_status_label(OLD.current_status) IS DISTINCT FROM public.notification_status_label(NEW.current_status) THEN
    IF EXISTS (SELECT 1 FROM public.session_decisions d WHERE d.application_id = NEW.id
      AND d.created_at = NEW.updated_at
      AND public.notification_status_label(d.decision) = public.notification_status_label(NEW.current_status)) THEN
      RETURN NULL;
    END IF;
    PERFORM public.emit_notification(NEW.applicant_id,
      'status:' || NEW.id || ':' || gen_random_uuid(), 'CAMBIO_ESTADO', 'Estado de solicitud actualizado',
      format('La solicitud %s cambió de «%s» a «%s». Consulte el expediente para conocer el detalle.',
        NEW.filing_number, public.notification_status_label(OLD.current_status), public.notification_status_label(NEW.current_status)),
      NEW.id, NULL, 'historial');
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER notifications_application_change AFTER INSERT OR UPDATE ON public.applications
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();

CREATE FUNCTION public.notify_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications;
BEGIN
  IF NEW.validation_status IN ('REJECTED', 'RECHAZADO') AND
    (OLD.validation_status IS DISTINCT FROM NEW.validation_status OR
     OLD.validation_observations IS DISTINCT FROM NEW.validation_observations) THEN
    SELECT * INTO v_app FROM public.applications WHERE id = NEW.application_id;
    PERFORM public.emit_notification(v_app.applicant_id, 'document:' || NEW.id || ':' || gen_random_uuid(),
      'REQUERIMIENTO_AJUSTES', 'Documento requiere ajustes',
      format('%s: el documento «%s» requiere ajustes. %s', v_app.filing_number, NEW.file_name,
        COALESCE(NEW.validation_observations, 'Consulte las observaciones del expediente.')),
      v_app.id, NULL, 'documentos');
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_document_change AFTER UPDATE ON public.application_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_document_change();

CREATE FUNCTION public.notify_observation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications;
BEGIN
  IF NEW.category = 'AJUSTE_OBLIGATORIO' THEN
    SELECT * INTO v_app FROM public.applications WHERE id = NEW.application_id;
    PERFORM public.emit_notification(v_app.applicant_id, 'observation:' || NEW.id, 'REQUERIMIENTO_AJUSTES',
      'Ajuste obligatorio solicitado', format('%s: %s', v_app.filing_number, NEW.content), v_app.id, NULL, 'observaciones');
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_observation AFTER INSERT ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.notify_observation();

CREATE FUNCTION public.notify_reviewer_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications; v_user uuid;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = NEW.application_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_active THEN
      PERFORM public.emit_notification(NEW.reviewer_id, 'reviewer-assigned:' || NEW.id, 'ASIGNACION_REVISOR',
        'Evaluación asignada', format('Se le asignó evaluar %s — %s. Fecha límite: %s.',
          v_app.filing_number, v_app.title, to_char(NEW.deadline_date, 'DD/MM/YYYY')), v_app.id, NULL, 'resumen');
    END IF;
  ELSE
    IF OLD.is_active AND NOT NEW.is_active THEN
      PERFORM public.emit_notification(OLD.reviewer_id, 'reviewer-removed:' || NEW.id, 'REASIGNACION_REVISOR',
        'Evaluación reasignada', format('Su asignación de evaluación para %s dejó de estar activa.', v_app.filing_number),
        v_app.id, NULL, 'resumen');
    END IF;
    IF NEW.concept IS NOT NULL AND NEW.concept IS DISTINCT FROM OLD.concept THEN
      FOR v_user IN SELECT p.id FROM public.profiles p WHERE p.is_active AND (
        p.role IN ('secretary', 'secretario', 'administrative', 'administrativo') OR EXISTS (
          SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.is_active
            AND r.role IN ('secretary', 'secretario', 'administrative', 'administrativo')))
      LOOP
        PERFORM public.emit_notification(v_user, 'review-submitted:' || NEW.id || ':' || NEW.concept_date,
          'EVALUACION_ENTREGADA', 'Evaluación técnica entregada',
          format('La evaluación de %s está disponible. Concepto: %s.', v_app.filing_number, NEW.concept),
          v_app.id, NULL, 'historial');
      END LOOP;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_reviewer_change AFTER INSERT OR UPDATE ON public.reviewer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_reviewer_change();

CREATE FUNCTION public.notify_session_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_session public.committee_sessions;
BEGIN
  SELECT * INTO v_session FROM public.committee_sessions WHERE id = NEW.session_id;
  PERFORM public.emit_notification(NEW.user_id, 'session-invited:' || NEW.session_id,
    'CONVOCATORIA_SESION', 'Convocatoria a sesión de comité',
    format('%s. Fecha: %s (Colombia). Lugar o enlace: %s.', v_session.session_number,
      to_char(v_session.scheduled_at AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI'), v_session.location_or_url),
    NULL, v_session.id, 'agenda');
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_session_invitation AFTER INSERT ON public.session_attendance
  FOR EACH ROW EXECUTE FUNCTION public.notify_session_invitation();

CREATE FUNCTION public.notify_session_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid;
BEGIN
  IF (NOT OLD.is_agenda_closed AND NEW.is_agenda_closed) OR
    NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at OR NEW.location_or_url IS DISTINCT FROM OLD.location_or_url THEN
    FOR v_user IN SELECT user_id FROM public.session_attendance WHERE session_id = NEW.id LOOP
      PERFORM public.emit_notification(v_user, 'session-changed:' || NEW.id || ':' || gen_random_uuid(),
        CASE WHEN NOT OLD.is_agenda_closed AND NEW.is_agenda_closed THEN 'AGENDA_DISPONIBLE' ELSE 'CAMBIO_SESION' END,
        CASE WHEN NOT OLD.is_agenda_closed AND NEW.is_agenda_closed THEN 'Agenda de sesión disponible' ELSE 'Sesión actualizada' END,
        format('%s. Fecha: %s (Colombia). Lugar o enlace: %s. Consulte los detalles de la sesión.', NEW.session_number,
          to_char(NEW.scheduled_at AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI'), NEW.location_or_url),
        NULL, NEW.id, 'agenda');
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_session_change AFTER UPDATE ON public.committee_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_session_change();

CREATE FUNCTION public.notify_speaker_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications; v_previous uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.speaker_id IS NOT DISTINCT FROM NEW.speaker_id THEN RETURN NULL; END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN v_previous := OLD.speaker_id; END IF;
  SELECT * INTO v_app FROM public.applications WHERE id = COALESCE(NEW.application_id, OLD.application_id);
  IF v_previous IS NOT NULL THEN
    PERFORM public.emit_notification(v_previous, 'speaker-removed:' || gen_random_uuid(), 'REASIGNACION_PONENTE',
      'Ponencia retirada', format('Ya no tiene asignada la ponencia de %s en esta sesión.', v_app.filing_number),
      NULL, OLD.session_id, 'agenda');
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.speaker_id IS NOT NULL THEN
    PERFORM public.emit_notification(NEW.speaker_id, 'speaker-assigned:' || gen_random_uuid(), 'ASIGNACION_PONENTE',
      'Ponencia asignada', format('Se le asignó presentar %s — %s ante el comité.', v_app.filing_number, v_app.title),
      NULL, NEW.session_id, 'agenda');
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_speaker_change AFTER INSERT OR UPDATE OR DELETE ON public.session_agenda
  FOR EACH ROW EXECUTE FUNCTION public.notify_speaker_change();

CREATE FUNCTION public.notify_committee_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = NEW.application_id;
  PERFORM public.emit_notification(v_app.applicant_id, 'decision:' || NEW.id, 'DECISION_COMITE',
    'Decisión del comité registrada', format('%s: %s. Justificación: %s', v_app.filing_number,
      public.notification_status_label(NEW.decision), NEW.justification), v_app.id, NULL, 'historial');
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_committee_decision AFTER INSERT ON public.session_decisions
  FOR EACH ROW EXECUTE FUNCTION public.notify_committee_decision();

CREATE FUNCTION public.notify_non_deliberation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_app public.applications;
BEGIN
  SELECT * INTO v_app FROM public.applications WHERE id = NEW.application_id;
  PERFORM public.emit_notification(v_app.applicant_id, 'not-deliberated:' || NEW.id, 'SOLICITUD_NO_DELIBERADA',
    'Solicitud pendiente de deliberación', format('%s no fue deliberada en la sesión. Motivo: %s',
      v_app.filing_number, NEW.reason), v_app.id, NULL, 'historial');
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_non_deliberation AFTER INSERT ON public.session_non_deliberations
  FOR EACH ROW EXECUTE FUNCTION public.notify_non_deliberation();

CREATE FUNCTION public.notify_minute_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid;
BEGIN
  IF NEW.is_approved AND NOT OLD.is_approved THEN
    FOR v_user IN SELECT a.user_id FROM public.session_attendance a
      WHERE a.session_id = NEW.session_id AND a.user_id IN (SELECT public.committee_member_ids())
    LOOP
      PERFORM public.emit_notification(v_user, 'minute-approved:' || NEW.id, 'ACTA_PUBLICADA',
        'Acta aprobada y disponible', format('%s está aprobada y disponible para consulta.', NEW.minute_number),
        NULL, NEW.session_id, 'acta');
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_minute_approved AFTER UPDATE ON public.committee_minutes
  FOR EACH ROW EXECUTE FUNCTION public.notify_minute_approved();

-- Trigger functions are not public RPCs.
REVOKE ALL ON FUNCTION public.notify_application_change(), public.notify_document_change(),
  public.notify_observation(), public.notify_reviewer_change(), public.notify_session_invitation(),
  public.notify_session_change(), public.notify_speaker_change(), public.notify_committee_decision(),
  public.notify_non_deliberation(), public.notify_minute_approved() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
