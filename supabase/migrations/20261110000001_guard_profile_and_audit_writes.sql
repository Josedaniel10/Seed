BEGIN;

CREATE OR REPLACE FUNCTION public.auth_user_has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true AND role = p_role
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND role = p_role
  );
$$;

-- The profile policy controls which rows a user can edit. Protect the
-- authorization fields while preserving self-service profile edits.
CREATE FUNCTION public.guard_profile_authorization_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.research_group_id IS DISTINCT FROM OLD.research_group_id
      OR NEW.email IS DISTINCT FROM OLD.email
    )
    AND NOT public.auth_user_has_role('admin')
  THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar estos campos del perfil.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_authorization_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_authorization_fields();

-- Keep existing client writes working while binding them to the session
-- and to an application visible under its own SELECT policy.
ALTER POLICY audit_insert_policy ON public.audit_history
  WITH CHECK (
    actor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.applications AS application
      WHERE application.id = audit_history.application_id
    )
  );

COMMIT;
