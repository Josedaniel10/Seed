BEGIN;
-- Only the transactional correction RPC may certify that an original was replaced.
CREATE POLICY document_correction_audit_guard ON public.audit_history
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (action <> 'SUBSANACION_DOCUMENTO');
COMMIT;
