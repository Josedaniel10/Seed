BEGIN;
-- Supabase may grant EXECUTE directly through its default privileges.
REVOKE ALL ON FUNCTION public.committee_member_ids() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manage_committee_session(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manage_committee_minutes(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_committee_session(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_committee_minutes(text, jsonb) TO authenticated;
COMMIT;
