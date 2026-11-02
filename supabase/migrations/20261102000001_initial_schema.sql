-- Seed: Sistema de Gestión del Comité de Investigación
-- Migración 000001: Esquema inicial de tablas relacionales (UP)

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Perfiles de Usuario (Profiles vinculados a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('investigador', 'administrativo', 'integrante_comite', 'secretario', 'lider_grupo', 'admin')),
  academic_program TEXT,
  academic_link TEXT, -- Docente planta, ocasional, estudiante, monitor
  research_group_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Grupos de Investigación
CREATE TABLE IF NOT EXISTS research_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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

-- 3. Catálogo de Tipos de Solicitud
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

-- 4. Requisitos por Tipo de Solicitud
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

-- 5. Solicitudes de Investigación
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_number TEXT NOT NULL UNIQUE, -- INV-2026-0001
  application_type_id UUID NOT NULL REFERENCES application_types(id),
  applicant_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  abstract TEXT,
  research_group_id UUID REFERENCES research_groups(id),
  budget_requested NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_status TEXT NOT NULL DEFAULT 'RADICADA' CHECK (
    current_status IN (
      'RADICADA',
      'PENDIENTE_DOCUMENTOS',
      'EN_REVISION',
      'LISTA_COMITE',
      'APROBADA',
      'APROBADA_CON_AJUSTES',
      'RECHAZADA',
      'CERRADA'
    )
  ),
  is_tutor_endorsed BOOLEAN NOT NULL DEFAULT false, -- RN-09
  requires_committee BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Documentos de la Solicitud (Metadatos hacia el servicio local)
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_hash_sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (validation_status IN ('PENDIENTE', 'VALIDO', 'RECHAZADO')),
  validation_observations TEXT,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Asignaciones de Revisores Pares
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

-- 8. Observaciones Técnicas
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

-- 9. Sesiones del Comité
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

-- 10. Agenda de la Sesión
CREATE TABLE IF NOT EXISTS session_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES committee_sessions(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  agenda_order INT NOT NULL,
  speaker_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, application_id)
);

-- 11. Decisiones Registradas en Sesión
CREATE TABLE IF NOT EXISTS session_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES committee_sessions(id),
  application_id UUID NOT NULL REFERENCES applications(id),
  decision TEXT NOT NULL CHECK (decision IN ('APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'APLAZADA')),
  justification TEXT NOT NULL, -- RN-05
  registered_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Actas Oficiales del Comité
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

-- 13. Historial de Actuaciones (Audit Log Append-Only, RF-23, RNF-03)
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

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(current_status);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_group ON applications(research_group_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_application ON audit_history(application_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_app_documents_app ON application_documents(application_id);
