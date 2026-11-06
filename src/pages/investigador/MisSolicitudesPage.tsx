import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { ApplicationDbStatus } from '../../types/database.ts';

export function MisSolicitudesPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const { applications, computeQueFalta } = useApplicationStore();
  const { types } = useCatalogStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');

  const currentUserId = user?.id || 'usr-001';
  const isAdminOrSecretario = user?.activeRole === 'admin' || user?.activeRole === 'secretario';

  // Investigador visualiza exclusivamente sus trámites radicados (RF-11)
  const userApplications = useMemo(() => {
    if (isAdminOrSecretario) {
      return applications;
    }
    return applications.filter((app) => app.applicant_id === currentUserId);
  }, [applications, currentUserId, isAdminOrSecretario]);

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
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
        >
          <PlusCircle size={15} />
          <span>Nueva Solicitud</span>
        </button>
      </div>

      {/* 2. Barra de Filtros en Vivo: Búsqueda, Estado y Tipo de Trámite */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Campo de búsqueda libre */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Buscar por número de radicado, título del proyecto o tipo de trámite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs text-stone-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Estado */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-stone-400 shrink-0" />
            <select
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
            </select>
          </div>

          {/* Selector de Tipo */}
          <select
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
          </select>
        </div>
      </div>

      {/* 3. Tabla de Solicitudes con radicado, tipo, título, estado, actualización y Qué Falta */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        {filteredApplications.length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
                <tr>
                  <th className="py-3 px-4">Radicado</th>
                  <th className="py-3 px-4">Tipo de Solicitud</th>
                  <th className="py-3 px-4">Título del Proyecto</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Última Actualización</th>
                  <th className="py-3 px-4">Qué Falta (Acción)</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DC]">
                {filteredApplications.map((app) => {
                  const typeObj = types.find((t) => t.id === app.application_type_id);
                  const queFalta = computeQueFalta(app);
                  const formattedDate = new Date(app.updated_at || app.created_at).toLocaleDateString(
                    'es-CO',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }
                  );

                  return (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/solicitudes/${app.id}`)}
                      className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#14281D] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                          {app.filing_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-stone-700 whitespace-nowrap font-medium">
                        <div className="max-w-[220px] truncate" title={typeObj?.name}>
                          {typeObj?.name || 'Trámite Institucional'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#14281D]">
                        <div className="max-w-xs truncate" title={app.title}>
                          {app.title}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={app.current_status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            app.current_status === 'PENDIENTE_DOCUMENTOS'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : app.current_status === 'RADICADA'
                              ? 'bg-blue-50 text-blue-900 border border-blue-100'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {queFalta}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="p-1.5 rounded-lg text-stone-400 group-hover:text-[#14281D] inline-flex items-center gap-1 font-semibold text-[11px]">
                          <Eye size={14} />
                          <span className="hidden sm:inline">Ver</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
