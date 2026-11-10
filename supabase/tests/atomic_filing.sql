-- Run with psql -v ON_ERROR_STOP=1 against a migrated test database.
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  ('29355a94-3419-445c-bd4d-617af8954c01', 'filing-a@example.invalid', '{"full_name":"Investigator A"}'),
  ('29355a94-3419-445c-bd4d-617af8954c02', 'filing-b@example.invalid', '{"full_name":"Investigator B"}');

INSERT INTO public.application_types (id, code, name)
VALUES ('29355a94-3419-445c-bd4d-617af8954c03', 'TEST-ATOMIC-FILING', 'Atomic filing test');

INSERT INTO public.requirements (id, application_type_id, name)
VALUES ('29355a94-3419-445c-bd4d-617af8954c04', '29355a94-3419-445c-bd4d-617af8954c03', 'Required PDF');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"29355a94-3419-445c-bd4d-617af8954c01","role":"authenticated"}';

DO $$
DECLARE
  v_id uuid := '29355a94-3419-445c-bd4d-617af8954c05';
  v_failed_id uuid := '29355a94-3419-445c-bd4d-617af8954c06';
  v_type uuid := '29355a94-3419-445c-bd4d-617af8954c03';
  v_docs jsonb := '[{
    "requirement_id":"29355a94-3419-445c-bd4d-617af8954c04",
    "file_name":"test.pdf", "file_path":"test/test.pdf", "file_size_bytes":10,
    "file_hash_sha256":"test-hash", "mime_type":"application/pdf"
  }]';
  v_first jsonb;
  v_retry jsonb;
  v_second jsonb;
BEGIN
  BEGIN
    PERFORM public.file_application(v_failed_id, auth.uid(), v_type, 'Test', 'Summary', NULL, 0, false, '[]');
    RAISE EXCEPTION 'Filing without mandatory documents succeeded';
  EXCEPTION WHEN invalid_parameter_value THEN
    NULL;
  END;

  BEGIN
    PERFORM public.file_application(
      v_failed_id, auth.uid(), v_type, 'Test', 'Summary', NULL, 0, false, v_docs #- '{0,file_path}'
    );
    RAISE EXCEPTION 'Filing with a failed document insert succeeded';
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;

  IF EXISTS (SELECT 1 FROM public.applications WHERE id = v_failed_id) THEN
    RAISE EXCEPTION 'The failed document insert left an application behind';
  END IF;

  v_first := public.file_application(v_id, auth.uid(), v_type, 'First', 'Summary', NULL, 0, false, v_docs);
  v_retry := public.file_application(v_id, auth.uid(), v_type, 'Retry', 'Summary', NULL, 0, false, v_docs);
  IF v_first IS DISTINCT FROM v_retry
    OR jsonb_array_length(v_first->'documents') IS DISTINCT FROM 1
    OR v_first#>>'{audit,action}' IS DISTINCT FROM 'RADICACION_INICIAL'
    OR (SELECT count(*) FROM public.audit_history WHERE application_id = v_id) <> 1
  THEN
    RAISE EXCEPTION 'Filing or retry did not return exactly one complete submission';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"sub":"29355a94-3419-445c-bd4d-617af8954c02","role":"authenticated"}', true);
  BEGIN
    PERFORM public.file_application(v_id, auth.uid(), v_type, 'Test', 'Summary', NULL, 0, false, v_docs);
    RAISE EXCEPTION 'The retry returned a different applicant''s submission';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  v_second := public.file_application(v_failed_id, auth.uid(), v_type, 'Second', 'Summary', NULL, 0, false, v_docs);
  IF substring(v_second#>>'{application,filing_number}' FROM '[0-9]+$')::numeric
    IS DISTINCT FROM substring(v_first#>>'{application,filing_number}' FROM '[0-9]+$')::numeric + 1
  THEN
    RAISE EXCEPTION 'The next investigator did not receive the consecutive filing number';
  END IF;
END;
$$;

ROLLBACK;
