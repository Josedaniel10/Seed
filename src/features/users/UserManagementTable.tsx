import { getUserError } from '../../lib/userMessages.ts';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { SkeletonRows } from '../../components/ui/Skeleton.tsx';
import { ResponsiveFilters } from '../../components/ui/ResponsiveFilters.tsx';
import { ResponsiveSelect } from '../../components/ui/ResponsiveSelect.tsx';
import { ResponsiveOverlay } from '../../components/ui/ResponsiveOverlay.tsx';
import React, { useState } from 'react';
import { useUserStore } from './userStore.ts';
import { UserRole } from '../../types/database.ts';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Users,
  Search,
  Filter,
  Shield,
  UserPlus,
  Building,
  GraduationCap,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Database,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase.ts';

const ALL_ROLES: { role: UserRole; label: string; badgeClass: string }[] = [
  { role: 'investigador', label: 'Investigador', badgeClass: 'bg-stone-100 text-stone-800 border-stone-200' },
  { role: 'administrativo', label: 'Administrativo', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { role: 'integrante_comite', label: 'Integrante Comité', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  { role: 'secretario', label: 'Secretario(a)', badgeClass: 'bg-[#A3E635] text-[#14281D] border-[#84CC16]' },
  { role: 'lider_grupo', label: 'Líder de Grupo', badgeClass: 'bg-teal-100 text-teal-900 border-teal-300' },
  { role: 'admin', label: 'Administrador', badgeClass: 'bg-purple-100 text-purple-900 border-purple-300' },
];

export const UserManagementTable: React.FC = () => {
  const {
    users,
    isLoading,
    isInitialized,
    searchQuery,
    selectedRoleFilter,
    setSearchQuery,
    setSelectedRoleFilter,
    updateUserRole,
    toggleUserActive,
    addUser,
    loadFromSupabase,
  } = useUserStore();

  const [notification, setNotification] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('investigador');
  const [newProgram, setNewProgram] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Cargar perfiles reales de Supabase al montar la pantalla
  React.useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

  const showFeedback = (message: string, tone: 'success' | 'error' = 'success') => {
    setNotification({ message, tone });
  };

  const handleRoleChange = (userId: string, newRole: UserRole, userName: string) => {
    const result = updateUserRole(userId, newRole);
    if (result.success) {
      showFeedback(`Rol de ${userName} actualizado inmediatamente a "${newRole.replace('_', ' ')}"`);
    }
  };

  const handleToggleActive = (userId: string, currentStatus: boolean, userName: string) => {
    toggleUserActive(userId);
    showFeedback(`Usuario ${userName} ${currentStatus ? 'desactivado' : 'activado'} correctamente`);
  };

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    try {
      const result = await loadFromSupabase();
      showFeedback(result.success ? `Lista actualizada. ${result.count ?? 0} usuarios.` : result.error ?? 'No se pudieron cargar los perfiles.', result.success ? 'success' : 'error');
    } catch (err: unknown) {
      const msg = getUserError(err, 'Error al sincronizar');
      showFeedback(`Fallo de sincronización: ${msg}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating || !newName.trim() || !newEmail.trim() || !newProgram.trim()) return;

    setIsCreating(true);
    try {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client.functions.invoke<{ id: string }>('create-seed-user', {
          body: { email: newEmail, fullName: newName, program: newProgram, role: newRole, password: newPassword },
        });
        if (error || !data?.id) {
          const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
          showFeedback(typeof body?.error === 'string' ? body.error : error?.message ?? 'No se confirmó la creación.', 'error');
          return;
        }
        const refreshed = await loadFromSupabase();
        showFeedback(refreshed.success ? `Cuenta de ${newName} creada.` : `Cuenta de ${newName} creada. Vuelve a sincronizar el listado.`);
      } else {
        addUser({
          email: newEmail.trim().toLowerCase(),
          full_name: newName.trim(),
          role: newRole,
          academic_program: newProgram.trim(),
          academic_link: null,
          research_group_id: null,
          is_active: true,
        });
        showFeedback(`Perfil de demostración de ${newName} creado.`);
      }

      setNewName('');
      setNewEmail('');
      setNewProgram('');
      setNewPassword('');
      setShowAddModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.academic_program && u.academic_program.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A2B]">
            <Users size={16} className="text-[#84CC16]" />
            <span>Gestión de Usuarios</span>
          </div>
          <h2 className="mobile-section-title text-xl font-extrabold text-[#14281D] mt-0.5">
            Usuarios y Asignación de Roles
          </h2>
          <p className="text-xs text-stone-600">
            Administra los roles del comité y personal universitario. Los cambios se aplican de inmediato en los permisos del sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSyncSupabase}
            disabled={isSyncing}
            className="px-3 py-2 bg-[#F7F6F2] hover:bg-[#EFECE6] text-[#14281D] text-xs font-semibold rounded-lg border border-[#E5E3DC] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Actualizar la lista de usuarios"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-[#84CC16]' : 'text-stone-500'} />
            <span>{isSyncing ? 'Sincronizando...' : 'Actualizar usuarios'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="mobile-page-action px-3.5 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus size={14} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Immediate Notification Toast */}
      <FloatingAlert message={notification?.message} tone={notification?.tone} onDismiss={() => setNotification(null)} />

      {/* Filter and Search Bar */}
      <div className="filter-toolbar flex flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative min-w-0 flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o programa académico..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E3DC] bg-[#F7F6F2] focus:bg-white text-[#14281D] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
          />
        </div>

        <ResponsiveFilters activeCount={Number(selectedRoleFilter !== 'ALL')} onReset={() => setSelectedRoleFilter('ALL')}>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium flex items-center gap-1">
              <Filter size={13} />
              <span>Filtrar por Rol:</span>
            </span>
            <ResponsiveSelect sheetTitle="Filtrar por rol"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value as UserRole | 'ALL')}
              className="px-2.5 py-1.5 rounded-lg border border-[#E5E3DC] bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#14281D] font-medium"
            >
              <option value="ALL">Todos los roles ({users.length})</option>
              {ALL_ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </ResponsiveSelect>
          </div>
        </ResponsiveFilters>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E3DC]">
        <table className="mobile-data-table w-full md:min-w-[760px] table-fixed text-left text-xs border-collapse">
          <colgroup className="hidden md:table-column-group"><col style={{ width: '30%' }} /><col style={{ width: '26%' }} /><col style={{ width: '30%' }} /><col style={{ width: '14%' }} /></colgroup>
          <thead>
            <tr className="bg-[#F7F6F2] text-[#14281D] font-bold border-b border-[#E5E3DC]">
              <th className="py-3 px-4">Usuario / Nombre</th>
              <th className="py-3 px-4">Programa & Vínculo</th>
              <th className="py-3 px-4">Rol Asignado (Modificación Inmediata)</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {isLoading && !isInitialized ? (
              <SkeletonRows labels={['Usuario', 'Programa y vínculo', 'Rol asignado', 'Estado']} cellClassName="py-3.5 px-4" contentClassName="h-9" />
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-stone-500">
                  No se encontraron usuarios institucionales con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const roleBadge = ALL_ROLES.find((r) => r.role === u.role) || ALL_ROLES[0];

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors hover:bg-stone-50/70 ${
                      !u.is_active ? 'opacity-60 bg-stone-50/30' : ''
                    }`}
                  >
                    {/* User Details */}
                    <td data-label="Usuario" className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#14281D] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {u.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-[#14281D]">{u.full_name}</div>
                          <div className="font-mono text-[11px] text-stone-500">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Academic info */}
                    <td data-label="Programa y vínculo" className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-stone-800 flex items-center gap-1.5">
                          <GraduationCap size={13} className="text-stone-400" />
                          <span>{u.academic_program || 'Sin programa'}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 capitalize">
                          {u.academic_link ? u.academic_link.replace('_', ' ') : 'Docente'}
                        </div>
                      </div>
                    </td>

                    {/* Role Selector (Changes immediately, RF-03) */}
                    <td data-label="Rol asignado" className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <ResponsiveSelect sheetTitle="Rol del usuario"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole, u.full_name)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#14281D] transition-colors ${roleBadge.badgeClass}`}
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r.role} value={r.role}>
                              {r.label}
                            </option>
                          ))}
                        </ResponsiveSelect>
                        <span className="text-[10px] text-stone-400 font-mono hidden md:inline">
                          (Reactivo)
                        </span>
                      </div>
                    </td>

                    {/* Active toggle */}
                    <td data-label="Estado" className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active, u.full_name)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
                        title={u.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                            Inactivo
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <ResponsiveOverlay isOpen={Boolean(showAddModal)} onClose={() => setShowAddModal(false)} label="Registrar miembro">
        {showAddModal && (<>
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 max-w-md w-full shadow-lg space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-[#14281D] flex items-center gap-2">
                <UserPlus size={18} className="text-[#84CC16]" />
                Registrar Miembro Universitario
              </h3>
              <button aria-label="Cerrar panel"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Dr. Mauricio Sandoval"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Correo Institucional *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@universidad.edu.co"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Programa Académico / Unidad *</label>
                <input
                  type="text"
                  required
                  value={newProgram}
                  onChange={(e) => setNewProgram(e.target.value)}
                  placeholder="Ej. Facultad de Ciencias de la Salud"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
                />
              </div>

              {getSupabaseClient() && (
                <div>
                  <label htmlFor="new-user-password" className="block font-semibold text-stone-700 mb-1">Contraseña inicial *</label>
                  <input
                    id="new-user-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Rol Institucional Inicial *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D] bg-white font-medium"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-lg bg-[#14281D] text-white font-semibold hover:bg-[#1E3A2B] cursor-pointer"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </>)}
      </ResponsiveOverlay>
    </div>
  );
};
