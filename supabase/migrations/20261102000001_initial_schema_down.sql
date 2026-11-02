-- Seed: Migración 000001 Reversión (DOWN)
-- Elimina las tablas en orden inverso de dependencias

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

-- Romper dependencia circular antes de eliminar profiles y research_groups
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS fk_profiles_research_group;

DROP TABLE IF EXISTS research_groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
