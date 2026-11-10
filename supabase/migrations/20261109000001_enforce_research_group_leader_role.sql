CREATE OR REPLACE FUNCTION validate_research_group_leader_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.leader_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = NEW.leader_id
      AND p.is_active = true
      AND (
        p.role IN ('leader', 'lider_grupo', 'lider')
        OR EXISTS (
          SELECT 1
          FROM user_roles ur
          WHERE ur.user_id = p.id
            AND ur.is_active = true
            AND ur.role IN ('leader', 'lider_grupo', 'lider')
        )
      )
  ) THEN
    RAISE EXCEPTION 'El usuario asignado debe tener un rol de líder activo.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_research_group_leader_role ON research_groups;
CREATE TRIGGER trg_validate_research_group_leader_role
BEFORE INSERT OR UPDATE OF leader_id ON research_groups
FOR EACH ROW
EXECUTE FUNCTION validate_research_group_leader_role();
