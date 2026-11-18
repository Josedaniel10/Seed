-- Transactional verification: all users, groups and the application are rolled back.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES
 ('eb350001-0000-4000-8000-000000000001','group-member-test@example.invalid','{"full_name":"Group member test"}','{}'),
 ('eb350001-0000-4000-8000-000000000002','group-admin-test@example.invalid','{"full_name":"Group admin test"}','{"seed_initial_role":"admin"}');
INSERT INTO public.research_groups(id,code,name,faculty) VALUES
 ('eb350001-0000-4000-8000-000000000010','TEST-MEMBER-A','Grupo prueba A','Área prueba A'),
 ('eb350001-0000-4000-8000-000000000011','TEST-MEMBER-B','Grupo prueba B','Área prueba B');
UPDATE public.profiles SET research_group_id='eb350001-0000-4000-8000-000000000010'
 WHERE id='eb350001-0000-4000-8000-000000000001';
INSERT INTO public.application_types(id,code,name) VALUES
 ('eb350001-0000-4000-8000-000000000020','TEST-MEMBERSHIP','Prueba de vinculación');
INSERT INTO public.applications(id,filing_number,application_type_id,applicant_id,title,research_group_id)
 VALUES('eb350001-0000-4000-8000-000000000030','TEST-MEMBERSHIP-001','eb350001-0000-4000-8000-000000000020',
 'eb350001-0000-4000-8000-000000000001','Expediente previo al cambio','eb350001-0000-4000-8000-000000000010');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims='{"sub":"eb350001-0000-4000-8000-000000000001","role":"authenticated"}';
DO $$ BEGIN
 BEGIN
  UPDATE public.profiles SET research_group_id='eb350001-0000-4000-8000-000000000011' WHERE id=auth.uid();
  RAISE EXCEPTION 'Researcher assigned their own group';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SET LOCAL request.jwt.claims='{"sub":"eb350001-0000-4000-8000-000000000002","role":"authenticated"}';
DO $$ BEGIN
 UPDATE public.profiles SET research_group_id='eb350001-0000-4000-8000-000000000011'
  WHERE id='eb350001-0000-4000-8000-000000000001' AND research_group_id='eb350001-0000-4000-8000-000000000010';
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin could not assign a group'; END IF;
 IF (SELECT research_group_id FROM public.applications WHERE id='eb350001-0000-4000-8000-000000000030')
  IS DISTINCT FROM 'eb350001-0000-4000-8000-000000000010'::uuid THEN RAISE EXCEPTION 'Historical membership changed'; END IF;
 UPDATE public.profiles SET research_group_id=NULL WHERE id='eb350001-0000-4000-8000-000000000001';
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin could not remove membership'; END IF;
END $$;
ROLLBACK;
