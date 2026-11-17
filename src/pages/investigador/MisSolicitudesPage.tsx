import { IdentityIcon } from '../../components/ui/IdentityIcon.tsx';
import { getTypeAppearance } from '../../features/catalog/typeAppearance.ts';
import { NextActionCell } from '../../features/requests/NextActionCell.tsx';
import { CallsNotice } from '../../features/calls/CallsNotice.tsx';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { SkeletonRows } from '../../components/ui/Skeleton.tsx';
import { useListFilter } from '../../hooks/useListFilter.ts';
import { ResponsiveFilters } from '../../components/ui/ResponsiveFilters.tsx';
import { ResponsiveSelect } from '../../components/ui/ResponsiveSelect.tsx';
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Filter,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { getSupabaseClient } from '../../lib/supabase.ts';

export function MisSolicitudesPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const { requests, loadFromSupabase, isLoading, isInitialized } = useApplicationStore();
  const { types } = useCatalogStore();
  const isInitialLoading = isLoading && !isInitialized;

  const [searchTerm, setSearchTerm] = useListFilter('search', '');
  const [filterEstado, setFilterEstado] = useListFilter('status', 'TODOS');
  const [filterTipo, setFilterTipo] = useListFilter('type', 'TODOS');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!getSupabaseClient()) return;

    void loadFromSupabase().then((result) => {
      if (isMounted && !result.success) {
        setLoadError(result.error || 'No se pudieron cargar las solicitudes.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadFromSupabase]);

  const currentUserId = user?.id || '';
  const isAdminOrSecretario = user?.activeRole === 'admin' || user?.activeRole === 'secretario';

  // Investigador visualiza exclusivamente sus trámites radicados (RF-11)
  const userApplications = useMemo(() => {
    if (isAdminOrSecretario) {
      return requests;
    }
    return requests.filter((app) => app.applicant_id === currentUserId);
  }, [requests, currentUserId, isAdminOrSecretario]);

  // Aplicar filtros en vivo por texto, estado y tipo
  const filteredApplications = useMemo(() => {
    return userApplications.filter((app) => {
      const typeObj = types.find((t) => t.id === app.application_type_id);
      const typeName = typeObj?.name || '';
      const typeCode = typeObj?.code || '';

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        app.filing_number.toLowerCase().includes(term) ||
        app.title.toLowerCase().includes(term) ||
        typeName.toLowerCase().includes(term) ||
        typeCode.toLowerCase().includes(term);

      const matchesEstado = filterEstado === 'TODOS' || app.current_status === filterEstado;
      const matchesTipo = filterTipo === 'TODOS' || app.application_type_id === filterTipo;

      return matchesSearch && matchesEstado && matchesTipo;
    });
  }, [userApplications, types, searchTerm, filterEstado, filterTipo]);

  return (
    <div className="space-y-6">
      {/* 1. Título y botón "Nueva solicitud" a la derecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
        <div>
          <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Mis Solicitudes de Investigación
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {isAdminOrSecretario
              ? 'Vista de seguimiento general (Acceso con rol directivo/administrativo).'
              : 'Historial y seguimiento de sus trámites radicados formalmente ante el comité.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/solicitudes/nueva')}
          className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
        >
          <PlusCircle size={15} />
          <span>Nueva Solicitud</span>
        </button>
      </div>

      <CallsNotice />

      {/* 2. Barra de Filtros en Vivo: Búsqueda, Estado y Tipo de Trámite */}
      <div className="filter-toolbar bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-row md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Campo de búsqueda libre */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            aria-label="Buscar solicitudes"
            placeholder="Buscar por número de radicado, título del proyecto o tipo de trámite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs text-stone-800"
          />
        </div>

        <ResponsiveFilters activeCount={Number(filterEstado !== 'TODOS') + Number(filterTipo !== 'TODOS')} onReset={() => { setFilterEstado('TODOS'); setFilterTipo('TODOS'); }}>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de Estado */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-stone-400 shrink-0" />
              <ResponsiveSelect sheetTitle="Estado de la solicitud"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-700"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="RADICADA">Radicada</option>
                <option value="PENDIENTE_DOCUMENTOS">Pendiente por documentos</option>
                <option value="EN_REVISION">En revisión técnica</option>
                <option value="LISTA_COMITE">Lista para comité</option>
                <option value="APROBADA">Aprobada</option>
                <option value="APROBADA_CON_AJUSTES">Aprobada con ajustes</option>
                <option value="RECHAZADA">Rechazada</option>
                <option value="CERRADA">Cerrada</option>
              </ResponsiveSelect>
            </div>

            {/* Selector de Tipo */}
            <ResponsiveSelect sheetTitle="Tipo de trámite"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-700 max-w-[200px] truncate"
            >
              <option value="TODOS">Todos los tipos de trámite</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </ResponsiveSelect>
          </div>
        </ResponsiveFilters>
      </div>

      {/* 3. Tabla de Solicitudes con radicado, tipo, título, estado, actualización y Qué Falta */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <FloatingAlert message={loadError ? `No fue posible actualizar las solicitudes: ${loadError}` : null} onDismiss={() => setLoadError(null)} />
        {!isInitialLoading && filteredApplications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderOpen size={40} className="mx-auto text-stone-300" />
            <h3 className="font-bold text-sm text-[#14281D]">No se encontraron solicitudes</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              {userApplications.length === 0
                ? 'Aún no tiene solicitudes de investigación radicadas formalmente en el sistema.'
                : 'No existen solicitudes que coincidan con los criterios de búsqueda y filtros seleccionados.'}
            </p>
            {userApplications.length === 0 && (
              <button
                onClick={() => navigate('/solicitudes/nueva')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14281D] text-white text-xs font-bold cursor-pointer hover:bg-[#1E3A2B] transition-colors"
              >
                <PlusCircle size={14} />
                <span>Radicar mi primera solicitud</span>
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="request-list-container">
            <table className="request-list-table w-full table-fixed text-left text-sm">
              <caption className="sr-only">Solicitudes de investigación y próxima acción</caption>
              <colgroup><col style={{ width: '42%' }} /><col style={{ width: '20%' }} /><col style={{ width: '27%' }} /><col style={{ width: '11%' }} /></colgroup>
              <thead>
                <tr>
                  <th scope="col">Solicitud</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Seguimiento</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {isInitialLoading && <SkeletonRows labels={['Solicitud', 'Estado', 'Seguimiento', 'Acción']} label="Cargando sus solicitudes…" />}
                {!isInitialLoading && filteredApplications.map((app) => {
                  const typeObj = types.find((t) => t.id === app.application_type_id);
                  const updatedAt = app.updated_at || app.created_at;
                  return (
                    <tr key={app.id}>
                      <td data-label="Solicitud">
                        <Link to={`/solicitudes/${app.id}`} state={{ fromList: '/mis-solicitudes' }} className="request-title-link">
                          {app.title}
                        </Link>
                        <span className="request-record-id">{app.filing_number}</span>
                        <div className="request-secondary flex items-center gap-2"><IdentityIcon {...getTypeAppearance(typeObj)} size={16} /><span>{typeObj?.name || 'Trámite Institucional'}</span></div>
                      </td>
                      <td data-label="Estado"><StatusBadge status={app.current_status} size="md" /></td>
                      <td data-label="Seguimiento">
                        <NextActionCell request={app} />
                        <p className="request-secondary mt-2">Actualizada el <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</time></p>
                      </td>
                      <td data-label="Acción">
                        <Link to={`/solicitudes/${app.id}`} state={{ fromList: '/mis-solicitudes' }} className="request-open-link" aria-label={`Ver solicitud ${app.filing_number}`}>
                          <Eye size={16} aria-hidden="true" /><span>Ver</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
