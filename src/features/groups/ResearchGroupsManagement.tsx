import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { SkeletonRows } from '../../components/ui/Skeleton.tsx';
import { ResponsiveFilters } from '../../components/ui/ResponsiveFilters.tsx';
import { ResponsiveSelect } from '../../components/ui/ResponsiveSelect.tsx';
import { ResponsiveOverlay } from '../../components/ui/ResponsiveOverlay.tsx';
import React, { useMemo, useState } from 'react';
import { isGroupLeaderRole, useGroupsStore } from './groupsStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { ResearchGroup } from '../../types/database.ts';
import {
  Building2,
  Search,
  Filter,
  Plus,
  UserCheck,
  RefreshCw,
  FolderGit2,
  GraduationCap,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const ResearchGroupsManagement: React.FC = () => {
  const {
    groups,
    isLoading,
    isInitialized,
    searchQuery,
    selectedFacultyFilter,
    setSearchQuery,
    setSelectedFacultyFilter,
    createGroup,
    assignGroupLeader,
    toggleGroupActive,
    loadFromSupabase,
    syncWithSupabase,
  } = useGroupsStore();

  const {
    users,
    loadFromSupabase: loadUsers,
    error: usersError,
    isLoading: isLoadingUsers,
  } = useUserStore();
  const leaders = useMemo(
    () => users.filter((user) => user.is_active && (user.roles ?? [user.role]).some(isGroupLeaderRole)),
    [users]
  );

  // Carga automática directa desde Supabase al montar la vista
  React.useEffect(() => {
    void loadFromSupabase();
    void loadUsers();
  }, [loadFromSupabase, loadUsers]);

  const [notification, setNotification] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newFaculty, setNewFaculty] = useState('Facultad de Ingeniería');
  const [newLeaderId, setNewLeaderId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const showFeedback = (message: string, tone: 'success' | 'error' = 'success') => {
    setNotification({ message, tone });
  };

  const handleLeaderChange = async (groupId: string, newLeaderId: string, groupName: string) => {
    const leaderUser = leaders.find((u) => u.id === newLeaderId);
    const result = await assignGroupLeader(groupId, newLeaderId);
    if (result.success) {
      showFeedback(
        `Líder de "${groupName}" asignado verificablemente a ${leaderUser?.full_name || 'nuevo líder'}.`
      );
    } else {
      showFeedback(result.error || 'No se pudo asignar el líder.', 'error');
    }
  };

  const handleToggleActive = (groupId: string, currentStatus: boolean, groupName: string) => {
    toggleGroupActive(groupId);
    showFeedback(`Grupo "${groupName}" ${currentStatus ? 'desactivado' : 'activado'} correctamente.`);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const res = await syncWithSupabase();
    if (res.success) {
      showFeedback(`Lista actualizada. ${res.count || 0} grupos de investigación.`);
    } else {
      showFeedback(`Aviso de sincronización: ${res.error}`, 'error');
    }
    setIsSyncing(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newCode || !newName || !newFaculty || !newLeaderId) {
      setFormError('Por favor complete todos los campos requeridos, incluyendo la designación del líder.');
      return;
    }

    const res = await createGroup({
      code: newCode,
      name: newName,
      faculty: newFaculty,
      leader_id: newLeaderId,
    });

    if (!res.success) {
      setFormError(res.error || 'Error al crear el grupo.');
      return;
    }

    const leaderName = leaders.find((u) => u.id === newLeaderId)?.full_name || 'Líder';
    showFeedback(`Grupo "${newName}" (${newCode.toUpperCase()}) creado y asignado a ${leaderName}.`);
    setNewCode('');
    setNewName('');
    setNewLeaderId('');
    setShowCreateModal(false);
  };

  // Facultades únicas para el filtro
  const faculties = Array.from(new Set(groups.map((g) => g.faculty))).filter(Boolean);

  // Filtrado de grupos
  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.faculty.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFaculty =
      selectedFacultyFilter === 'ALL' || g.faculty === selectedFacultyFilter;

    return matchesSearch && matchesFaculty;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A2B]">
            <Building2 size={16} className="text-[#84CC16]" />
            <span>Grupos de Investigación</span>
          </div>
          <h2 className="mobile-section-title text-xl font-extrabold text-[#14281D] mt-0.5">
            Gestión de Grupos de Investigación y Líderes
          </h2>
          <p className="text-xs text-stone-600">
            Administra los grupos avalados por la vicerrectoría y designa a sus líderes académicos de forma verificable.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-2 bg-[#F7F6F2] hover:bg-[#EFECE6] text-[#14281D] text-xs font-semibold rounded-lg border border-[#E5E3DC] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Actualizar la lista de grupos"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-[#84CC16]' : 'text-stone-500'} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="mobile-page-action px-3.5 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Nuevo Grupo</span>
          </button>
        </div>
      </div>

      {/* Immediate Notification Toast */}
      <FloatingAlert message={notification?.message} tone={notification?.tone} onDismiss={() => setNotification(null)} />

      <FloatingAlert message={usersError ? `No fue posible cargar los usuarios: ${usersError}` : null} />

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
            placeholder="Buscar por código, nombre de grupo o facultad..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E3DC] bg-[#F7F6F2] focus:bg-white text-[#14281D] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
          />
        </div>

        <ResponsiveFilters activeCount={Number(selectedFacultyFilter !== 'ALL')} onReset={() => setSelectedFacultyFilter('ALL')}>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium flex items-center gap-1">
              <Filter size={13} />
              <span>Facultad:</span>
            </span>
            <ResponsiveSelect sheetTitle="Filtrar por facultad"
              value={selectedFacultyFilter}
              onChange={(e) => setSelectedFacultyFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E5E3DC] bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#14281D] font-medium"
            >
              <option value="ALL">Todas las facultades ({groups.length})</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </ResponsiveSelect>
          </div>
        </ResponsiveFilters>
      </div>

      {/* Groups Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E3DC]">
        <table className="mobile-data-table w-full md:min-w-[760px] table-fixed text-left text-xs border-collapse">
          <colgroup className="hidden md:table-column-group"><col style={{ width: '18%' }} /><col style={{ width: '34%' }} /><col style={{ width: '34%' }} /><col style={{ width: '14%' }} /></colgroup>
          <thead>
            <tr className="bg-[#F7F6F2] text-[#14281D] font-bold border-b border-[#E5E3DC]">
              <th className="py-3 px-4">Código / Identificador</th>
              <th className="py-3 px-4">Grupo de Investigación & Facultad</th>
              <th className="py-3 px-4">Líder Asignado</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {isLoading && !isInitialized ? (
              <SkeletonRows labels={['Código', 'Grupo y facultad', 'Líder asignado', 'Estado']} cellClassName="py-3.5 px-4" contentClassName="h-9" />
            ) : filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-stone-500">
                  No se encontraron grupos de investigación con los criterios aplicados.
                </td>
              </tr>
            ) : (
              filteredGroups.map((group) => {
                const currentLeader = users.find((u) => u.id === group.leader_id);

                return (
                  <tr
                    key={group.id}
                    className={`transition-colors hover:bg-stone-50/70 ${
                      !group.is_active ? 'opacity-60 bg-stone-50/30' : ''
                    }`}
                  >
                    {/* Code */}
                    <td data-label="Código" className="py-3.5 px-4 font-mono font-bold text-[#14281D]">
                      <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-200">
                        {group.code}
                      </span>
                    </td>

                    {/* Group info */}
                    <td data-label="Grupo y facultad" className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#14281D]">{group.name}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1">
                          <GraduationCap size={12} className="text-stone-400" />
                          <span>{group.faculty}</span>
                        </div>
                      </div>
                    </td>

                    {/* Leader Selector (Changes immediately and verifiable) */}
                    <td data-label="Líder asignado" className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-[#84CC16] shrink-0" />
                        <ResponsiveSelect sheetTitle="Líder del grupo"
                          value={leaders.some((user) => user.id === group.leader_id) ? group.leader_id || '' : ''}
                          onChange={(e) => handleLeaderChange(group.id, e.target.value, group.name)}
                          disabled={isLoadingUsers || leaders.length === 0}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#E5E3DC] bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#14281D] cursor-pointer"
                        >
                          <option value="" disabled>
                            Seleccione un líder...
                          </option>
                          {leaders.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} ({u.role.replace('_', ' ')})
                            </option>
                          ))}
                        </ResponsiveSelect>
                      </div>
                      {currentLeader && (
                        <div className="text-[10px] text-stone-500 font-mono mt-0.5 pl-5">
                          {leaders.some((user) => user.id === currentLeader.id)
                            ? `ID: ${group.leader_id} · ${currentLeader.email}`
                            : `${currentLeader.full_name} no tiene un rol de líder activo; reasigne el grupo.`}
                        </div>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td data-label="Estado" className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(group.id, Boolean(group.is_active), group.name)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
                        title={group.is_active ? 'Desactivar grupo' : 'Activar grupo'}
                      >
                        {group.is_active ? (
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

      {/* Create Group Modal */}
      <ResponsiveOverlay isOpen={Boolean(showCreateModal)} onClose={() => setShowCreateModal(false)} label="Registrar grupo">
        {showCreateModal && (<>
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 max-w-md w-full shadow-lg space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-[#14281D] flex items-center gap-2">
                <Building2 size={18} className="text-[#84CC16]" />
                Registrar Nuevo Grupo de Investigación
              </h3>
              <button aria-label="Cerrar panel"
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <FloatingAlert message={formError} onDismiss={() => setFormError(null)} />

            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Código Único Institucional *</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Ej. G-BIO-06"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nombre del Grupo *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Grupo de Investigación en Ciencias Genómicas"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Facultad de Adscripción *</label>
                <input
                  type="text"
                  required
                  value={newFaculty}
                  onChange={(e) => setNewFaculty(e.target.value)}
                  placeholder="Ej. Facultad de Ciencias Exactas y Naturales"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Líder Académico del Grupo *</label>
                <select
                  required
                  value={newLeaderId}
                  onChange={(e) => setNewLeaderId(e.target.value)}
                  disabled={isLoadingUsers || leaders.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D] bg-white font-medium"
                >
                  <option value="" disabled>
                    Seleccione al investigador líder...
                  </option>
                  {leaders.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                {isLoadingUsers && (
                  <p className="text-[10px] text-stone-500 mt-1">
                    Cargando usuarios...
                  </p>
                )}
                {!isLoadingUsers && leaders.length === 0 && (
                  <p className="text-[10px] text-rose-700 mt-1">
                    No hay usuarios activos con rol de líder. Asigne ese rol desde la gestión de usuarios antes de crear el grupo.
                  </p>
                )}
                <p className="text-[10px] text-stone-500 mt-1">
                  El docente líder tendrá acceso y supervisión sobre las propuestas radicadas por los miembros del grupo.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#14281D] text-white font-semibold hover:bg-[#1E3A2B] cursor-pointer"
                >
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </>)}
      </ResponsiveOverlay>
    </div>
  );
};
