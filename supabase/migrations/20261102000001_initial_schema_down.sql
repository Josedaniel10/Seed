-- Seed: Migración 000001 Reversión (DOWN)
-- Elimina las tablas, funciones, secuencias y triggers en orden inverso de dependencias

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_registration();

DROP TRIGGER IF EXISTS trg_validate_application_status_transition ON applications;
DROP FUNCTION IF EXISTS validate_application_status_transition();

DROP TRIGGER IF EXISTS trg_audit_history_no_update_delete ON audit_history;
DROP FUNCTION IF EXISTS enforce_audit_history_immutability();

DROP INDEX IF EXISTS idx_user_roles_user;
DROP INDEX IF EXISTS idx_app_documents_app;
DROP INDEX IF EXISTS idx_audit_history_application;
DROP INDEX IF EXISTS idx_applications_group;
DROP INDEX IF EXISTS idx_applications_applicant;
DROP INDEX IF EXISTS idx_applications_status;

DROP TABLE IF EXISTS audit_history CASCADE;
DROP TABLE IF EXISTS committee_minutes CASCADE;
DROP TABLE IF EXISTS session_decisions CASCADE;
DROP TABLE IF EXISTS session_agenda CASCADE;
DROP TABLE IF EXISTS committee_sessions CASCADE;
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS reviewer_assignments CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS requirements CASCADE;
DROP TABLE IF EXISTS application_types CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- Romper dependencia circular antes de eliminar profiles y research_groups
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS fk_profiles_research_group;

DROP TABLE IF EXISTS research_groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS generate_next_minute_number(INT);
DROP FUNCTION IF EXISTS generate_next_filing_number(INT);

DROP SEQUENCE IF EXISTS minute_number_seq;
DROP SEQUENCE IF EXISTS filing_number_seq;
