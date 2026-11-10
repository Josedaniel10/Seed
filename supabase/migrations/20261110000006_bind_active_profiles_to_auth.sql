BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_role text := NEW.raw_app_meta_data->>'seed_initial_role';
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF account_role IS NULL OR account_role NOT IN (
    'investigador', 'administrativo', 'integrante_comite', 'secretario', 'lider_grupo', 'admin'
  ) THEN
    account_role := 'researcher';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, academic_program, academic_link)
  VALUES (NEW.id, NEW.email,
    COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    account_role, NEW.raw_user_meta_data->>'academic_program', NEW.raw_user_meta_data->>'academic_link');

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, account_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

CREATE FUNCTION public.check_active_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active AND NOT EXISTS (
    SELECT 1 FROM auth.users AS account
    WHERE account.id = NEW.id AND account.deleted_at IS NULL AND lower(account.email) = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'El perfil activo requiere una cuenta de Supabase Auth con el mismo UUID y correo.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_active_profile_identity
BEFORE INSERT OR UPDATE OF id, email, is_active ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_active_profile_identity();

CREATE FUNCTION public.sync_profile_auth_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account_role text;
BEGIN
  IF TG_OP = 'DELETE' OR NEW.deleted_at IS NOT NULL THEN
    UPDATE public.profiles
    SET email = 'legacy-' || OLD.id || '@example.invalid', is_active = false
    WHERE id = OLD.id;
    UPDATE public.user_roles SET is_active = false WHERE user_id = OLD.id;
    RETURN NULL;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF NEW.email IS NULL THEN
      UPDATE public.profiles SET is_active = false WHERE id = NEW.id;
    ELSE
      UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
    END IF;
  END IF;

  -- Auth Admin can persist app metadata after inserting the account.
  account_role := NEW.raw_app_meta_data->>'seed_initial_role';
  IF OLD.raw_app_meta_data->>'seed_initial_role' IS NULL AND account_role IN (
    'investigador', 'administrativo', 'integrante_comite', 'secretario', 'lider_grupo', 'admin'
  ) THEN
    UPDATE public.profiles SET role = account_role WHERE id = NEW.id AND role = 'researcher' AND is_active;
    IF FOUND THEN
      UPDATE public.user_roles SET is_active = false WHERE user_id = NEW.id AND role = 'researcher';
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, account_role)
      ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_auth_identity AFTER UPDATE OF email, raw_app_meta_data, deleted_at OR DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_auth_identity();

CREATE OR REPLACE FUNCTION public.auth_user_has_role(p_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS profile
    JOIN auth.users AS account ON account.id = profile.id
    WHERE profile.id = auth.uid() AND profile.is_active AND account.deleted_at IS NULL
      AND lower(profile.email) = lower(account.email)
      AND (profile.role = p_role OR EXISTS (
        SELECT 1 FROM public.user_roles AS assignment
        WHERE assignment.user_id = profile.id AND assignment.is_active AND assignment.role = p_role
      ))
  );
$$;

COMMIT;
