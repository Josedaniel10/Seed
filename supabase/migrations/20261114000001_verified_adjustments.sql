BEGIN;
ALTER TABLE public.observations ADD COLUMN verification_notes text, ADD COLUMN verified_by uuid REFERENCES public.profiles(id), ADD COLUMN verified_at timestamptz;
-- Previous responses were automatically marked resolved. Reopen only ongoing reviews;
-- completed proceedings retain their historical record.
UPDATE public.observations o SET is_resolved=false FROM public.applications a
WHERE o.application_id=a.id AND a.current_status IN ('EN_REVISION','UNDER_REVIEW')
AND o.applicant_response IS NOT NULL AND o.verified_by IS NULL;
CREATE FUNCTION public.act_on_observation(p_application_id uuid,p_action text,p_observation_id uuid DEFAULT NULL,p_content text DEFAULT NULL,p_category text DEFAULT NULL,p_accept boolean DEFAULT NULL,p_expected_response text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.applications; o public.observations; assignment public.reviewer_assignments; h public.audit_history; actor uuid:=auth.uid();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND is_active) THEN RAISE EXCEPTION 'Cuenta no autorizada' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.applications WHERE id=p_application_id FOR UPDATE;
 IF NOT FOUND OR a.current_status NOT IN ('EN_REVISION','UNDER_REVIEW') THEN RAISE EXCEPTION 'La solicitud ya no está en revisión' USING ERRCODE='40001'; END IF;
 IF nullif(btrim(p_content),'') IS NULL OR length(p_content)>20000 THEN RAISE EXCEPTION 'Escriba el contenido o fundamento (máximo 20000 caracteres)' USING ERRCODE='22023'; END IF;
 SELECT * INTO assignment FROM public.reviewer_assignments WHERE application_id=a.id AND reviewer_id=actor AND is_active;
 IF p_action='ADD' THEN
  IF assignment.id IS NULL THEN RAISE EXCEPTION 'Se requiere asignación activa' USING ERRCODE='42501'; END IF;
  IF p_category NOT IN ('ACLARACION','AJUSTE_OBLIGATORIO','SUGERENCIA') OR p_category IS NULL THEN RAISE EXCEPTION 'Categoría inválida' USING ERRCODE='22023'; END IF;
  INSERT INTO public.observations(application_id,assignment_id,author_id,category,content) VALUES(a.id,assignment.id,actor,p_category,btrim(p_content)) RETURNING * INTO o;
 ELSE
  SELECT * INTO o FROM public.observations WHERE id=p_observation_id AND application_id=a.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Observación inexistente' USING ERRCODE='22023'; END IF;
  IF p_action='RESPOND' THEN
   IF a.applicant_id<>actor THEN RAISE EXCEPTION 'Solo el solicitante puede responder' USING ERRCODE='42501'; END IF;
   IF o.is_resolved THEN RAISE EXCEPTION 'El ajuste ya fue verificado' USING ERRCODE='40001'; END IF;
   UPDATE public.observations SET applicant_response=btrim(p_content),is_resolved=false,verified_by=NULL,verified_at=NULL,verification_notes=NULL WHERE id=o.id RETURNING * INTO o;
  ELSIF p_action='VERIFY' THEN
   IF assignment.id IS NULL THEN RAISE EXCEPTION 'Solo el evaluador asignado puede verificar' USING ERRCODE='42501'; END IF;
   IF o.is_resolved THEN RAISE EXCEPTION 'El ajuste ya fue verificado' USING ERRCODE='40001'; END IF;
   IF o.applicant_response IS NULL OR o.applicant_response IS DISTINCT FROM p_expected_response OR p_accept IS NULL THEN RAISE EXCEPTION 'La respuesta cambió o aún no existe; recargue el expediente' USING ERRCODE='40001'; END IF;
   UPDATE public.observations SET is_resolved=p_accept,verified_by=actor,verified_at=clock_timestamp(),verification_notes=btrim(p_content) WHERE id=o.id RETURNING * INTO o;
  ELSE RAISE EXCEPTION 'Acción inválida' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO public.audit_history(application_id,actor_id,action,details) VALUES(a.id,actor,'AJUSTE_'||p_action,jsonb_build_object('observation_id',o.id,'content',p_content,'accepted',p_accept)) RETURNING * INTO h;
 RETURN jsonb_build_object('observation',to_jsonb(o),'audit',to_jsonb(h));
END $$;
REVOKE ALL ON FUNCTION public.act_on_observation(uuid,text,uuid,text,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.act_on_observation(uuid,text,uuid,text,text,boolean,text) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.observations FROM authenticated,anon;
CREATE POLICY observation_read_workflow ON public.observations FOR SELECT TO authenticated USING(public.can_read_application_documents(application_id));
CREATE POLICY adjustment_audit_guard ON public.audit_history AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(action NOT IN ('AJUSTE_ADD','AJUSTE_RESPOND','AJUSTE_VERIFY'));
CREATE FUNCTION public.guard_favorable_adjustments() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.concept='FAVORABLE' AND NEW.concept IS DISTINCT FROM OLD.concept AND EXISTS(SELECT 1 FROM public.observations WHERE application_id=NEW.application_id AND category='AJUSTE_OBLIGATORIO' AND NOT is_resolved) THEN
 RAISE EXCEPTION 'Verifique los ajustes obligatorios antes de emitir favorable sin ajustes' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER favorable_requires_verified_adjustments BEFORE UPDATE ON public.reviewer_assignments FOR EACH ROW EXECUTE FUNCTION public.guard_favorable_adjustments();
NOTIFY pgrst,'reload schema';
COMMIT;
