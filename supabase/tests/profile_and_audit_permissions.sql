-- Run with psql -v ON_ERROR_STOP=1 against a migrated test database.
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
VALUES
  ('93946a13-9c72-4d05-80a5-ff34f9de61a1', 'seed-rls-a@example.invalid', '{"full_name":"Investigator A"}', '{}'),
  ('93946a13-9c72-4d05-80a5-ff34f9de61a2', 'seed-rls-b@example.invalid', '{"full_name":"Investigator B"}', '{}'),
  ('93946a13-9c72-4d05-80a5-ff34f9de61a3', 'seed-rls-admin@example.invalid', '{"full_name":"Administrator"}', '{"seed_initial_role":"admin"}');

INSERT INTO public.application_types (id, code, name)
VALUES ('93946a13-9c72-4d05-80a5-ff34f9de61b1', 'TEST-PROFILE-AUDIT', 'RLS test');

INSERT INTO public.applications (id, filing_number, application_type_id, applicant_id, title)
VALUES
  ('93946a13-9c72-4d05-80a5-ff34f9de61c1', 'TEST-PROFILE-AUDIT-A', '93946a13-9c72-4d05-80a5-ff34f9de61b1', '93946a13-9c72-4d05-80a5-ff34f9de61a1', 'Application A'),
  ('93946a13-9c72-4d05-80a5-ff34f9de61c2', 'TEST-PROFILE-AUDIT-B', '93946a13-9c72-4d05-80a5-ff34f9de61b1', '93946a13-9c72-4d05-80a5-ff34f9de61a2', 'Application B');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"93946a13-9c72-4d05-80a5-ff34f9de61a1","role":"authenticated"}';

DO $$
BEGIN
  UPDATE public.profiles SET full_name = 'Updated name' WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The investigator could not edit their profile name';
  END IF;

  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
    RAISE EXCEPTION 'The investigator could assign themselves the admin role';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  INSERT INTO public.audit_history (application_id, actor_id, action)
  VALUES ('93946a13-9c72-4d05-80a5-ff34f9de61c1', auth.uid(), 'TEST');

  BEGIN
    INSERT INTO public.audit_history (application_id, actor_id, action)
    VALUES ('93946a13-9c72-4d05-80a5-ff34f9de61c1', '93946a13-9c72-4d05-80a5-ff34f9de61a2', 'TEST');
    RAISE EXCEPTION 'The investigator could impersonate another actor';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.audit_history (application_id, actor_id, action)
    VALUES ('93946a13-9c72-4d05-80a5-ff34f9de61c2', auth.uid(), 'TEST');
    RAISE EXCEPTION 'The investigator could write to another application history';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

SET LOCAL request.jwt.claims = '{"sub":"93946a13-9c72-4d05-80a5-ff34f9de61a3","role":"authenticated"}';

DO $$
BEGIN
  UPDATE public.profiles SET role = 'administrative'
  WHERE id = '93946a13-9c72-4d05-80a5-ff34f9de61a2';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The administrator could not change another profile role';
  END IF;
END;
$$;

ROLLBACK;
