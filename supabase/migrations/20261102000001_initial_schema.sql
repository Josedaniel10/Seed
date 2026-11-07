-- Seed: Sistema de Gestión del Comité de Investigación
-- Migración 000001: Esquema inicial de tablas relacionales (UP)

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Secuencias Oficiales para Radicados y Actas
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS filing_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS minute_number_seq START WITH 1 INCREMENT BY 1;

-- Funciones para formatear números oficiales consecutivos
CREATE OR REPLACE FUNCTION generate_next_filing_number(p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS TEXT AS $$
DECLARE
  v_seq_val BIGINT;
BEGIN
  v_seq_val := nextval('filing_number_seq');
  RETURN 'INV-' || p_year::TEXT || '-' || LPAD(v_seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION generate_next_minute_number(p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS TEXT AS $$
DECLARE
  v_seq_val BIGINT;
BEGIN
  v_seq_val := nextval('minute_number_seq');
  RETURN 'Acta ' || LPAD(v_seq_val::TEXT, 3, '0') || ' de ' || p_year::TEXT;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================================================
-- 2. Perfiles de Usuario (Profiles vinculados a auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'researcher' CHECK (
    role IN (
      'researcher', 'administrative', 'committee_member', 'secretary', 'leader', 'admin',
      'investigador', 'administrativo', 'integrante_comite', 'secretario', 'lider_grupo', 'lider'
    )
  ),
  academic_program TEXT,
  academic_link TEXT, -- Docente planta, ocasional, estudiante, monitor
  research_group_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de asignación múltiple de roles por usuario (user_roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN (
      'researcher', 'administrative', 'committee_member', 'secretary', 'leader', 'admin',
      'investigador', 'administrativo', 'integrante_comite', 'secretario', 'lider_grupo', 'lider'
    )
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================================================
-- 3. Grupos de Investigación
-- ============================================================================
CREATE TABLE IF NOT EXISTS research_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key diferida para research_group_id en profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_research_group'
  ) THEN
    ALTER TABLE profiles 
      ADD CONSTRAINT fk_profiles_research_group 
      FOREIGN KEY (research_group_id) REFERENCES research_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. Catálogo de Tipos de Solicitud
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  requires_committee BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Requisitos por Tipo de Solicitud
-- ============================================================================
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_type_id UUID NOT NULL REFERENCES application_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_subsanable BOOLEAN NOT NULL DEFAULT true, -- RN-11
  allowed_formats TEXT[] NOT NULL DEFAULT ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  max_size_mb INT NOT NULL DEFAULT 10,
  template_url TEXT,
  cure_deadline_days INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. Solicitudes de Investigación (Applications / Requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_number TEXT NOT NULL UNIQUE, -- INV-2026-0001
  application_type_id UUID NOT NULL REFERENCES application_types(id),
  applicant_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  abstract TEXT,
  research_group_id UUID REFERENCES research_groups(id),
  budget_requested NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
    current_status IN (
      'SUBMITTED', 'PENDING_DOCUMENTS', 'UNDER_REVIEW', 'COMMITTEE_READY',
      'APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'CLOSED',
      'RADICADA', 'PENDIENTE_DOCUMENTOS', 'EN_REVISION', 'LISTA_COMITE',
      'APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'CERRADA'
    )
  ),
  is_tutor_endorsed BOOLEAN NOT NULL DEFAULT false, -- RN-09
  requires_committee BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. Documentos de la Solicitud (Metadatos hacia el servicio local)
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_hash_sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    validation_status IN ('PENDING', 'VALID', 'REJECTED', 'PENDIENTE', 'VALIDO', 'RECHAZADO')
  ),
  validation_observations TEXT,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. Asignaciones de Revisores Pares
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  deadline_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true, -- RN-08
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  concept TEXT CHECK (concept IN ('FAVORABLE', 'FAVORABLE_CON_AJUSTES', 'NO_FAVORABLE')),
  concept_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. Observaciones Técnicas
-- ============================================================================
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES reviewer_assignments(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),
  category TEXT NOT NULL CHECK (category IN ('ACLARACION', 'AJUSTE_OBLIGATORIO', 'SUGERENCIA')),
  content TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  applicant_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. Sesiones del Comité
-- ============================================================================
CREATE TABLE IF NOT EXISTS committee_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number TEXT NOT NULL UNIQUE,
  session_type TEXT NOT NULL CHECK (session_type IN ('ORDINARIA', 'EXTRAORDINARIA')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  location_or_url TEXT NOT NULL,
  quorum_required INT NOT NULL DEFAULT 4,
  is_agenda_closed BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. Agenda de la Sesión
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES committee_sessions(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  agenda_order INT NOT NULL,
  speaker_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, application_id)
);

-- ============================================================================
-- 12. Decisiones Registradas en Sesión
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES committee_sessions(id),
  application_id UUID NOT NULL REFERENCES applications(id),
  decision TEXT NOT NULL CHECK (
    decision IN (
      'APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'POSTPONED',
      'APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'APLAZADA'
    )
  ),
  justification TEXT NOT NULL, -- RN-05
  registered_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. Actas Oficiales del Comité
-- ============================================================================
CREATE TABLE IF NOT EXISTS committee_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minute_number TEXT NOT NULL UNIQUE, -- Acta 001 de 2026 (RF-31)
  year INT NOT NULL,
  session_id UUID NOT NULL REFERENCES committee_sessions(id) UNIQUE,
  draft_content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 14. Historial de Actuaciones (Audit Log Append-Only, RF-23, RNF-03)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger de inmutabilidad estricta para audit_history (RNF-03)
CREATE OR REPLACE FUNCTION enforce_audit_history_immutability()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RNF-03: Operación denegada. La bitácora de auditoría e historial (registro %) es estrictamente inmutable y append-only.', OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_history_no_update_delete ON audit_history;
CREATE TRIGGER trg_audit_history_no_update_delete
BEFORE UPDATE OR DELETE ON audit_history
FOR EACH ROW EXECUTE FUNCTION enforce_audit_history_immutability();

-- ============================================================================
-- 15. Validación de Transiciones Reglamentarias de Estado (RF-21, RN-01)
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_application_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_old TEXT;
  v_new TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    v_old := UPPER(OLD.current_status);
    v_new := UPPER(NEW.current_status);

    -- Normalizar a inglés si vienen en español
    IF v_old = 'RADICADA' THEN v_old := 'SUBMITTED'; END IF;
    IF v_old = 'PENDIENTE_DOCUMENTOS' THEN v_old := 'PENDING_DOCUMENTS'; END IF;
    IF v_old = 'EN_REVISION' THEN v_old := 'UNDER_REVIEW'; END IF;
    IF v_old = 'LISTA_COMITE' THEN v_old := 'COMMITTEE_READY'; END IF;
    IF v_old = 'APROBADA' THEN v_old := 'APPROVED'; END IF;
    IF v_old = 'APROBADA_CON_AJUSTES' THEN v_old := 'APPROVED_WITH_ADJUSTMENTS'; END IF;
    IF v_old = 'RECHAZADA' THEN v_old := 'REJECTED'; END IF;
    IF v_old = 'CERRADA' THEN v_old := 'CLOSED'; END IF;

    IF v_new = 'RADICADA' THEN v_new := 'SUBMITTED'; END IF;
    IF v_new = 'PENDIENTE_DOCUMENTOS' THEN v_new := 'PENDING_DOCUMENTS'; END IF;
    IF v_new = 'EN_REVISION' THEN v_new := 'UNDER_REVIEW'; END IF;
    IF v_new = 'LISTA_COMITE' THEN v_new := 'COMMITTEE_READY'; END IF;
    IF v_new = 'APROBADA' THEN v_new := 'APPROVED'; END IF;
    IF v_new = 'APROBADA_CON_AJUSTES' THEN v_new := 'APPROVED_WITH_ADJUSTMENTS'; END IF;
    IF v_new = 'RECHAZADA' THEN v_new := 'REJECTED'; END IF;
    IF v_new = 'CERRADA' THEN v_new := 'CLOSED'; END IF;

    -- Validar transiciones permitidas
    IF v_old = 'SUBMITTED' AND v_new NOT IN ('PENDING_DOCUMENTS', 'UNDER_REVIEW', 'REJECTED') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'PENDING_DOCUMENTS' AND v_new NOT IN ('UNDER_REVIEW', 'REJECTED') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'UNDER_REVIEW' AND v_new NOT IN ('COMMITTEE_READY', 'REJECTED', 'PENDING_DOCUMENTS') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'COMMITTEE_READY' AND v_new NOT IN ('APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'CLOSED') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'APPROVED_WITH_ADJUSTMENTS' AND v_new NOT IN ('APPROVED', 'CLOSED') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'APPROVED' AND v_new NOT IN ('CLOSED') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'REJECTED' AND v_new NOT IN ('CLOSED') THEN
      RAISE EXCEPTION 'RF-21: Transición no permitida de "%" hacia "%".', OLD.current_status, NEW.current_status;
    ELSIF v_old = 'CLOSED' THEN
      RAISE EXCEPTION 'RN-01: El estado CERRADA es estrictamente terminal (0 transiciones de salida).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_application_status_transition ON applications;
CREATE TRIGGER trg_validate_application_status_transition
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION validate_application_status_transition();

-- ============================================================================
-- 16. Trigger Automático para Registro en auth.users -> profiles + user_roles
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_role TEXT := 'researcher';
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insertar o sincronizar perfil
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, true)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;

  -- Asignar rol inicial 'researcher' en user_roles
  INSERT INTO public.user_roles (user_id, role, is_active)
  VALUES (NEW.id, v_role, true)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador en auth.users si existe el esquema auth
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
      CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user_registration();
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 17. Índices de Alto Rendimiento
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(current_status);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_group ON applications(research_group_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_application ON audit_history(application_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_app_documents_app ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
