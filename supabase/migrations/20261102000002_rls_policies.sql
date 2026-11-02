-- Seed: Políticas de Seguridad a Nivel de Fila (RLS) - RNF-02
-- Migración 000002: Habilitación de RLS y reglas de acceso por rol

-- Funciones auxiliares para obtener el rol y grupo del usuario autenticado
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_group()
RETURNS UUID AS $$
  SELECT research_group_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'profiles'
-- Cualquier usuario autenticado puede ver perfiles activos
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Solo el usuario o un administrador puede actualizar su propio perfil
CREATE POLICY "profiles_update_self_or_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR auth_user_role() = 'admin');

-- 3. Políticas para 'applications' (RNF-02)
-- Investigador: solo ve las suyas
-- Líder de grupo: ve las de su grupo de investigación
-- Administrativo, Revisor, Secretario, Admin: ven todas
CREATE POLICY "applications_select_policy" ON applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid() -- Sus propias solicitudes
    OR (
      auth_user_role() = 'lider_grupo'
      AND research_group_id IN (SELECT id FROM research_groups WHERE leader_id = auth.uid())
    )
    OR auth_user_role() IN ('administrativo', 'integrante_comite', 'secretario', 'admin')
  );

-- Creación de solicitudes: solo investigadores y administradores
CREATE POLICY "applications_insert_policy" ON applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND auth_user_role() IN ('investigador', 'admin')
  );

-- Actualización de solicitudes:
-- Investigador solo puede modificar si está en 'RADICADA' o 'PENDIENTE_DOCUMENTOS'
-- Administrativo y Secretario pueden actualizar según el flujo
CREATE POLICY "applications_update_policy" ON applications
  FOR UPDATE TO authenticated
  USING (
    (applicant_id = auth.uid() AND current_status IN ('RADICADA', 'PENDIENTE_DOCUMENTOS'))
    OR auth_user_role() IN ('administrativo', 'secretario', 'admin')
  )
  WITH CHECK (
    (applicant_id = auth.uid() AND current_status IN ('RADICADA', 'PENDIENTE_DOCUMENTOS'))
    OR auth_user_role() IN ('administrativo', 'secretario', 'admin')
  );

-- 4. Políticas para 'application_documents'
CREATE POLICY "documents_select_policy" ON application_documents
  FOR SELECT TO authenticated
  USING (
    application_id IN (SELECT id FROM applications) -- Respeta visibilidad de applications
  );

CREATE POLICY "documents_insert_policy" ON application_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT id FROM applications WHERE applicant_id = auth.uid()
    )
    OR auth_user_role() IN ('administrativo', 'admin')
  );

-- 5. Políticas para 'reviewer_assignments'
-- Revisor par solo ve las asignaciones delegadas a él
-- Secretario, Administrativo y Admin ven todas
CREATE POLICY "assignments_select_policy" ON reviewer_assignments
  FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR auth_user_role() IN ('secretario', 'administrativo', 'admin')
  );

CREATE POLICY "assignments_insert_update_policy" ON reviewer_assignments
  FOR ALL TO authenticated
  USING (auth_user_role() IN ('secretario', 'admin'))
  WITH CHECK (auth_user_role() IN ('secretario', 'admin'));

-- 6. Políticas para 'audit_history' (RNF-03: Inmutabilidad)
-- Lectura: solicitante o personal del comité
CREATE POLICY "audit_select_policy" ON audit_history
  FOR SELECT TO authenticated
  USING (
    application_id IN (SELECT id FROM applications)
  );

-- Inserción: permitida para registrar actuaciones
CREATE POLICY "audit_insert_policy" ON audit_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- PROHIBIDO UPDATE Y DELETE EN AUDIT_HISTORY (Inmutabilidad garantizada por omisión de políticas)
