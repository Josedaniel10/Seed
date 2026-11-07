-- Seed: Políticas de Seguridad a Nivel de Fila (RLS) - RNF-02
-- Migración 000002: Habilitación de RLS y reglas de acceso por rol

-- Funciones auxiliares para obtener los roles y grupo del usuario autenticado
CREATE OR REPLACE FUNCTION auth_user_has_role(p_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND is_active = true AND role = p_role
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active = true AND role = p_role
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

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
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self_or_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_user_has_role('admin'))
  WITH CHECK (id = auth.uid() OR auth_user_has_role('admin'));

-- 3. Políticas para 'user_roles'
CREATE POLICY "user_roles_select_all" ON user_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_roles_admin_manage" ON user_roles
  FOR ALL TO authenticated
  USING (auth_user_has_role('admin'))
  WITH CHECK (auth_user_has_role('admin'));

-- 4. Políticas para 'research_groups', 'application_types' y 'requirements' (Catálogo)
CREATE POLICY "research_groups_select_all" ON research_groups
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "research_groups_admin_manage" ON research_groups
  FOR ALL TO authenticated
  USING (auth_user_has_role('admin'))
  WITH CHECK (auth_user_has_role('admin'));

CREATE POLICY "application_types_select_all" ON application_types
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "application_types_admin_manage" ON application_types
  FOR ALL TO authenticated
  USING (auth_user_has_role('admin'))
  WITH CHECK (auth_user_has_role('admin'));

CREATE POLICY "requirements_select_all" ON requirements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "requirements_admin_manage" ON requirements
  FOR ALL TO authenticated
  USING (auth_user_has_role('admin'))
  WITH CHECK (auth_user_has_role('admin'));

-- 5. Políticas para 'applications' (RNF-02)
-- Investigador: solo ve las suyas
-- Líder de grupo: ve las de su grupo de investigación
-- Administrativo, Revisor, Secretario, Admin: ven todas
CREATE POLICY "applications_select_policy" ON applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR (
      (auth_user_has_role('leader') OR auth_user_has_role('lider_grupo') OR auth_user_has_role('lider'))
      AND research_group_id IN (SELECT id FROM research_groups WHERE leader_id = auth.uid())
    )
    OR auth_user_has_role('administrative') OR auth_user_has_role('administrativo')
    OR auth_user_has_role('committee_member') OR auth_user_has_role('integrante_comite')
    OR auth_user_has_role('secretary') OR auth_user_has_role('secretario')
    OR auth_user_has_role('admin')
  );

CREATE POLICY "applications_insert_policy" ON applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND (
      auth_user_has_role('researcher') OR auth_user_has_role('investigador') OR auth_user_has_role('admin')
    )
  );

CREATE POLICY "applications_update_policy" ON applications
  FOR UPDATE TO authenticated
  USING (
    (applicant_id = auth.uid() AND current_status IN ('SUBMITTED', 'PENDING_DOCUMENTS', 'RADICADA', 'PENDIENTE_DOCUMENTOS'))
    OR auth_user_has_role('administrative') OR auth_user_has_role('administrativo')
    OR auth_user_has_role('secretary') OR auth_user_has_role('secretario')
    OR auth_user_has_role('admin')
  )
  WITH CHECK (
    (applicant_id = auth.uid() AND current_status IN ('SUBMITTED', 'PENDING_DOCUMENTS', 'RADICADA', 'PENDIENTE_DOCUMENTOS'))
    OR auth_user_has_role('administrative') OR auth_user_has_role('administrativo')
    OR auth_user_has_role('secretary') OR auth_user_has_role('secretario')
    OR auth_user_has_role('admin')
  );

-- 6. Políticas para 'application_documents'
CREATE POLICY "documents_select_policy" ON application_documents
  FOR SELECT TO authenticated
  USING (
    application_id IN (SELECT id FROM applications)
  );

CREATE POLICY "documents_insert_policy" ON application_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    application_id IN (
      SELECT id FROM applications WHERE applicant_id = auth.uid()
    )
    OR auth_user_has_role('administrative') OR auth_user_has_role('administrativo')
    OR auth_user_has_role('admin')
  );

-- 7. Políticas para 'reviewer_assignments'
CREATE POLICY "assignments_select_policy" ON reviewer_assignments
  FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR auth_user_has_role('secretary') OR auth_user_has_role('secretario')
    OR auth_user_has_role('administrative') OR auth_user_has_role('administrativo')
    OR auth_user_has_role('admin')
  );

CREATE POLICY "assignments_insert_update_policy" ON reviewer_assignments
  FOR ALL TO authenticated
  USING (
    auth_user_has_role('secretary') OR auth_user_has_role('secretario') OR auth_user_has_role('admin')
  )
  WITH CHECK (
    auth_user_has_role('secretary') OR auth_user_has_role('secretario') OR auth_user_has_role('admin')
  );

-- 8. Políticas para 'committee_sessions', 'session_agenda', 'session_decisions', 'committee_minutes'
CREATE POLICY "sessions_select_policy" ON committee_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sessions_admin_secretary_manage" ON committee_sessions
  FOR ALL TO authenticated
  USING (
    auth_user_has_role('secretary') OR auth_user_has_role('secretario') OR auth_user_has_role('admin')
  )
  WITH CHECK (
    auth_user_has_role('secretary') OR auth_user_has_role('secretario') OR auth_user_has_role('admin')
  );

CREATE POLICY "minutes_select_policy" ON committee_minutes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "minutes_admin_secretary_manage" ON committee_minutes
  FOR ALL TO authenticated
  USING (
    auth_user_has_role('secretary') OR auth_user_has_role('secretario') OR auth_user_has_role('admin')
  )
  WITH CHECK (
    auth_user_has_role('secretary') OR auth_user_has_role('secretario') OR auth_user_has_role('admin')
  );

-- 9. Políticas para 'audit_history' (RNF-03: Inmutabilidad)
CREATE POLICY "audit_select_policy" ON audit_history
  FOR SELECT TO authenticated
  USING (
    application_id IN (SELECT id FROM applications)
  );

CREATE POLICY "audit_insert_policy" ON audit_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- PROHIBIDO UPDATE Y DELETE EN AUDIT_HISTORY (Inmutabilidad garantizada por omisión de políticas y trigger)
