import React from 'react';
import { UserManagementTable } from '../../features/users/UserManagementTable.tsx';

export function UsuariosPage() {
  return (
    <div className="space-y-6">
      <UserManagementTable />
    </div>
  );
}
