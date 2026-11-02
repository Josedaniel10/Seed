-- Seed: Reversión de Políticas RLS (DOWN)

DROP POLICY IF EXISTS "audit_insert_policy" ON audit_history;
DROP POLICY IF EXISTS "audit_select_policy" ON audit_history;
DROP POLICY IF EXISTS "assignments_insert_update_policy" ON reviewer_assignments;
DROP POLICY IF EXISTS "assignments_select_policy" ON reviewer_assignments;
DROP POLICY IF EXISTS "documents_insert_policy" ON application_documents;
DROP POLICY IF EXISTS "documents_select_policy" ON application_documents;
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;

ALTER TABLE IF EXISTS audit_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS committee_minutes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_agenda DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS committee_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS observations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviewer_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS application_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS auth_user_group();
DROP FUNCTION IF EXISTS auth_user_role();
