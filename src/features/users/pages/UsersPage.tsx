import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader.tsx';
import { UserManagementTable } from '../UserManagementTable.tsx';
import { RoleGuard } from '../../auth/RoleGuard.tsx';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UsersPage() {
  const navigate = useNavigate();

  return (
    <RoleGuard
      allowedRoles={['admin']}
      fallbackTitle="Gestión de Usuarios y Roles Institucionales"
      onNavigateHome={() => navigate('/')}
    >
      <div className="space-y-6">
        <PageHeader
          title="Gestión de Usuarios y Asignación de Roles"
          description="Control de accesos institucionales, gestión de privilegios y activación de cuentas de investigadores y personal del comité."
          icon={<Users size={22} />}
          breadcrumbs={[
            { label: 'Inicio', href: '/' },
            { label: 'Administración' },
            { label: 'Usuarios y Roles' },
          ]}
        />

        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs">
          <UserManagementTable />
        </div>
      </div>
    </RoleGuard>
  );
}
