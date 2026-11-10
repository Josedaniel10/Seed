-- Run with psql -v ON_ERROR_STOP=1 against a migrated database.
BEGIN;

DO $$
DECLARE
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  secretary_id uuid := gen_random_uuid();
  reviewer_id uuid := gen_random_uuid();
  type_id uuid := gen_random_uuid();
  requirement_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  document_id uuid;
  assignment_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role) VALUES
    (owner_id, owner_id || '@example.invalid', 'Test researcher', 'researcher'),
    (staff_id, staff_id || '@example.invalid', 'Test administrative', 'administrative'),
    (secretary_id, secretary_id || '@example.invalid', 'Test secretary', 'secretary'),
    (reviewer_id, reviewer_id || '@example.invalid', 'Test reviewer', 'committee_member');
  INSERT INTO public.application_types (id, code, name) VALUES (type_id, type_id::text, 'Test lifecycle');
  INSERT INTO public.requirements (id, application_type_id, name) VALUES (requirement_id, type_id, 'Test PDF');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  document_id := (public.file_application(request_id, owner_id, type_id, 'Test application', 'Test summary',
    NULL, 0, false, jsonb_build_array(jsonb_build_object('requirement_id', requirement_id,
      'file_name', 'test.pdf', 'file_path', 'test.pdf', 'file_size_bytes', 10,
      'file_hash_sha256', 'test-hash', 'mime_type', 'application/pdf'))) #>> '{documents,0,id}')::uuid;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', staff_id, 'role', 'authenticated')::text, true);
  PERFORM public.validate_application_document(request_id, document_id, 'test-hash', 'VALIDO', NULL);
  PERFORM public.transition_application_status(request_id, 'RADICADA', 'EN_REVISION', NULL, '{}');
  BEGIN
    PERFORM public.assign_application_reviewer(request_id, reviewer_id, current_date + 5);
    RAISE EXCEPTION 'Administrative role could assign a reviewer';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', secretary_id, 'role', 'authenticated')::text, true);
  assignment_id := (public.assign_application_reviewer(request_id, reviewer_id, current_date + 5)
    #>> '{assignment,id}')::uuid;
  BEGIN
    PERFORM public.submit_application_review(request_id, assignment_id, 'FAVORABLE', 'Test justification');
    RAISE EXCEPTION 'Someone other than the assignee could submit a concept';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', reviewer_id, 'role', 'authenticated')::text, true);
  PERFORM public.submit_application_review(request_id, assignment_id, 'FAVORABLE', 'Test justification');
  IF (SELECT concept FROM public.reviewer_assignments WHERE id = assignment_id) IS DISTINCT FROM 'FAVORABLE' THEN
    RAISE EXCEPTION 'The review was not persisted';
  END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', secretary_id, 'role', 'authenticated')::text, true);
  PERFORM public.transition_application_status(request_id, 'LISTA_COMITE', 'APROBADA', 'Test decision', '{}');

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  IF (SELECT current_status FROM public.applications WHERE id = request_id) IS DISTINCT FROM 'APROBADA'
    OR (SELECT count(*) FROM public.audit_history WHERE application_id = request_id) <> 6 THEN
    RAISE EXCEPTION 'The researcher could not read the persisted outcome and complete audit';
  END IF;
END;
$$;

ROLLBACK;
