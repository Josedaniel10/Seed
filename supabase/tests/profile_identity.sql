-- Run against a database with all migrations applied.
BEGIN;

DO $$
DECLARE
  researcher_id uuid := gen_random_uuid();
  reviewer_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    (researcher_id, researcher_id || '@example.invalid', '{"full_name":"Test researcher","seed_initial_role":"admin"}'),
    (reviewer_id, reviewer_id || '@example.invalid', '{"full_name":"Test reviewer"}');

  -- Auth Admin can set the trusted app metadata after the insert.
  UPDATE auth.users SET raw_app_meta_data = '{"seed_initial_role":"integrante_comite"}' WHERE id = reviewer_id;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = researcher_id AND role = 'researcher' AND is_active)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = researcher_id AND role = 'researcher' AND is_active) THEN
    RAISE EXCEPTION 'Public signup did not create a researcher with the Auth UUID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = reviewer_id AND role = 'integrante_comite' AND is_active)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = reviewer_id AND role = 'integrante_comite' AND is_active)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = reviewer_id AND role = 'researcher' AND is_active) THEN
    RAISE EXCEPTION 'Auth Admin did not apply the selected role to the Auth UUID';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (gen_random_uuid(), 'test-orphan@example.invalid', 'Orphan profile');
    RAISE EXCEPTION 'An active profile was created without Auth';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  UPDATE auth.users SET email = reviewer_id || '@renamed.example.invalid' WHERE id = reviewer_id;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = reviewer_id AND email = reviewer_id || '@renamed.example.invalid') THEN
    RAISE EXCEPTION 'The Auth email change did not reach the profile';
  END IF;

  UPDATE auth.users SET deleted_at = now() WHERE id = reviewer_id;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = reviewer_id AND is_active)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = reviewer_id AND is_active) THEN
    RAISE EXCEPTION 'A deleted Auth identity retained active permissions';
  END IF;
END;
$$;

ROLLBACK;
