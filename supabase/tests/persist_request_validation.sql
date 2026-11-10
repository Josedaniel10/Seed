-- Run with psql -v ON_ERROR_STOP=1 against a migrated test database.
BEGIN;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES
  ('37fda525-7f6f-48c1-b1d8-4f97e9134a01', 'validation-owner@example.invalid', 'Owner', 'researcher'),
  ('37fda525-7f6f-48c1-b1d8-4f97e9134a02', 'validation-staff@example.invalid', 'Staff', 'administrative');

INSERT INTO public.application_types (id, code, name)
VALUES ('37fda525-7f6f-48c1-b1d8-4f97e9134a03', 'TEST-PERSIST-VALIDATION', 'Test validation');

INSERT INTO public.requirements (id, application_type_id, name)
VALUES ('37fda525-7f6f-48c1-b1d8-4f97e9134a04', '37fda525-7f6f-48c1-b1d8-4f97e9134a03', 'Required PDF');

INSERT INTO public.applications (id, filing_number, application_type_id, applicant_id, title, current_status)
VALUES ('37fda525-7f6f-48c1-b1d8-4f97e9134a05', 'TEST-PERSIST-VALIDATION', '37fda525-7f6f-48c1-b1d8-4f97e9134a03',
  '37fda525-7f6f-48c1-b1d8-4f97e9134a01', 'Test application', 'RADICADA');

INSERT INTO public.application_documents (id, application_id, requirement_id, file_name, file_path,
  file_size_bytes, file_hash_sha256, mime_type)
VALUES ('37fda525-7f6f-48c1-b1d8-4f97e9134a06', '37fda525-7f6f-48c1-b1d8-4f97e9134a05',
  '37fda525-7f6f-48c1-b1d8-4f97e9134a04', 'test.pdf', 'test.pdf', 10, 'test-hash', 'application/pdf');

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_application uuid := '37fda525-7f6f-48c1-b1d8-4f97e9134a05';
  v_document uuid := '37fda525-7f6f-48c1-b1d8-4f97e9134a06';
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"37fda525-7f6f-48c1-b1d8-4f97e9134a07","role":"authenticated"}', true);
  BEGIN
    PERFORM public.validate_application_document(v_application, v_document, 'test-hash', 'VALIDO', NULL);
    RAISE EXCEPTION 'An Auth identity without a profile could validate';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims', '{"sub":"37fda525-7f6f-48c1-b1d8-4f97e9134a01","role":"authenticated"}', true);
  BEGIN
    PERFORM public.validate_application_document(v_application, v_document, 'test-hash', 'VALIDO', NULL);
    RAISE EXCEPTION 'The owner could validate their own document';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims', '{"sub":"37fda525-7f6f-48c1-b1d8-4f97e9134a02","role":"authenticated"}', true);
  BEGIN
    PERFORM public.transition_application_status(v_application, 'RADICADA', 'EN_REVISION', NULL, '{}');
    RAISE EXCEPTION 'An application with pending documents advanced';
  EXCEPTION WHEN invalid_parameter_value THEN
    NULL;
  END;

  v_result := public.validate_application_document(v_application, v_document, 'test-hash', 'VALIDO', NULL);
  IF v_result#>>'{audit,actor_id}' IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Document audit used the wrong actor';
  END IF;

  PERFORM public.transition_application_status(v_application, 'RADICADA', 'EN_REVISION', NULL, '{}');

  BEGIN
    PERFORM public.transition_application_status(v_application, 'RADICADA', 'EN_REVISION', NULL, '{}');
    RAISE EXCEPTION 'A stale transition succeeded';
  EXCEPTION WHEN serialization_failure THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims', '{"sub":"37fda525-7f6f-48c1-b1d8-4f97e9134a01","role":"authenticated"}', true);
  IF (SELECT current_status FROM public.applications WHERE id = v_application) IS DISTINCT FROM 'EN_REVISION'
    OR (SELECT validation_status FROM public.application_documents WHERE id = v_document) IS DISTINCT FROM 'VALIDO'
    OR (SELECT count(*) FROM public.audit_history WHERE application_id = v_application) <> 2 THEN
    RAISE EXCEPTION 'The owner could not read the persisted validation and transition';
  END IF;
END;
$$;

ROLLBACK;
