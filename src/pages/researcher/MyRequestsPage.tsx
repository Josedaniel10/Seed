import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useRequestStore } from '../../features/requests/requestStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';

export function MyRequestsPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const { requests, computePendingRequirements } = useRequestStore();
  const { types } = useCatalogStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const currentUserId = user?.id || 'usr-001';
  const isAdminOrSecretary =
    user?.activeRole === 'admin' ||
    user?.activeRole === 'secretary' ||
    user?.activeRole === 'secretario';

  const userRequests = useMemo(() => {
    if (isAdminOrSecretary) {
      return requests;
    }
    return requests.filter((req) => req.applicant_id === currentUserId);
  }, [requests, currentUserId, isAdminOrSecretary]);

  const filteredRequests = useMemo(() => {
    return userRequests.filter((req) => {
      const typeId = req.request_type_id || req.application_type_id;
      const typeObj = types.find((t) => t.id === typeId);
      const typeName = typeObj?.name || '';
      const typeCode = typeObj?.code || '';

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        req.filing_number.toLowerCase().includes(term) ||
        req.title.toLowerCase().includes(term) ||
        typeName.toLowerCase().includes(term) ||
        typeCode.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'ALL' ||
        statusFilter === 'TODOS' ||
        req.current_status === statusFilter;
      const matchesType =
        typeFilter === 'ALL' ||
        typeFilter === 'TODOS' ||
        typeId === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [userRequests, types, searchTerm, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Mis Solicitudes de Investigación
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {isAdminOrSecretary
              ? 'Vista de seguimiento general (Acceso con rol directivo/administrativo).'
              : 'Historial y seguimiento de sus trámites radicados formalmente ante el comité.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/requests/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
        >
          <PlusCircle size={15} />
          <span>Nueva Solicitud</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
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
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-stone-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-700"
            >
              <option value="ALL">Todos los estados</option>
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

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-700 max-w-[200px] truncate"
          >
            <option value="ALL">Todos los tipos de trámite</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderOpen size={40} className="mx-auto text-stone-300" />
            <h3 className="font-bold text-sm text-[#14281D]">No se encontraron solicitudes</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              {userRequests.length === 0
                ? 'Aún no tiene solicitudes de investigación radicadas formalmente en el sistema.'
                : 'No existen solicitudes que coincidan con los criterios de búsqueda y filtros seleccionados.'}
            </p>
            {userRequests.length === 0 && (
              <button
                onClick={() => navigate('/requests/new')}
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
                {filteredRequests.map((req) => {
                  const typeId = req.request_type_id || req.application_type_id;
                  const typeObj = types.find((t) => t.id === typeId);
                  const pendingAction = computePendingRequirements(req);
                  const formattedDate = new Date(req.updated_at || req.created_at).toLocaleDateString(
                    'es-CO',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }
                  );

                  return (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#14281D] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                          {req.filing_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-stone-700 whitespace-nowrap font-medium">
                        <div className="max-w-[220px] truncate" title={typeObj?.name}>
                          {typeObj?.name || 'Trámite Institucional'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#14281D]">
                        <div className="max-w-xs truncate" title={req.title}>
                          {req.title}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={req.current_status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            req.current_status === 'PENDIENTE_DOCUMENTOS'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : req.current_status === 'RADICADA'
                              ? 'bg-blue-50 text-blue-900 border border-blue-100'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {pendingAction}
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

export const MisSolicitudesPage = MyRequestsPage;
