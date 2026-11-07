import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table as TableIcon,
  Kanban as KanbanIcon,
  Search,
  Filter,
  Clock,
  ArrowRight,
  Eye,
  ShieldAlert,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useRequestStore } from '../../features/requests/requestStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { MetricsStrip } from '../../features/dashboard/components/MetricsStrip.tsx';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { Request, RequestDbStatus } from '../../types/database.ts';
import { ApplicationStatus } from '../../types/theme.ts';

type KanbanColumnKey =
  | 'SUBMITTED'
  | 'PENDING_DOCUMENTS'
  | 'UNDER_REVIEW'
  | 'COMMITTEE_READY'
  | 'DECIDED';

interface KanbanColumnDef {
  key: KanbanColumnKey;
  label: string;
  statuses: string[];
  description: string;
}

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    key: 'SUBMITTED',
    label: 'Radicada',
    statuses: ['RADICADA', 'SUBMITTED'],
    description: 'En cola para validación documental administrativa',
  },
  {
    key: 'PENDING_DOCUMENTS',
    label: 'Pendiente por documentos',
    statuses: ['PENDIENTE_DOCUMENTOS', 'PENDING_DOCUMENTS'],
    description: 'Requisitos subsanables observados o pendientes',
  },
  {
    key: 'UNDER_REVIEW',
    label: 'En revisión',
    statuses: ['EN_REVISION', 'UNDER_REVIEW'],
    description: 'Evaluador par asignado en proceso de concepto técnico',
  },
  {
    key: 'COMMITTEE_READY',
    label: 'Lista para comité',
    statuses: ['LISTA_COMITE', 'COMMITTEE_READY'],
    description: 'Concepto emitido, lista para agenda de sesión colegiada',
  },
  {
    key: 'DECIDED',
    label: 'Decididas',
    statuses: ['APROBADA', 'APPROVED', 'APROBADA_CON_AJUSTES', 'APPROVED_WITH_ADJUSTMENTS', 'RECHAZADA', 'REJECTED'],
    description: 'Decisión formal asentada por el comité de investigación',
  },
];

export function TrackingBoardPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    transitionRequestStatus,
    getDeadlineStatus,
  } = useRequestStore();
  const { types } = useCatalogStore();
  const { users } = useUserStore();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  const [draggingReqId, setDraggingReqId] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<{
    request: Request;
    targetColumn: KanbanColumnKey;
    targetStatus: RequestDbStatus;
    actionTitle: string;
    actionDescription: string;
    requiresReason: boolean;
  } | null>(null);

  const [modalReason, setModalReason] = useState('');
  const [modalDecidedStatus, setModalDecidedStatus] = useState<RequestDbStatus>('APROBADA');
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isResearcher = user?.activeRole === 'researcher' || user?.activeRole === 'investigador';
  const isLeader = user?.activeRole === 'leader' || user?.activeRole === 'lider';
  const isReadOnly = isResearcher || isLeader;

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const typeId = req.request_type_id || req.application_type_id;
      const typeObj = types.find((t) => t.id === typeId);
      const applicantObj = users.find((u) => u.id === req.applicant_id);

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        req.filing_number.toLowerCase().includes(term) ||
        req.title.toLowerCase().includes(term) ||
        (typeObj?.name || '').toLowerCase().includes(term) ||
        (applicantObj?.full_name || '').toLowerCase().includes(term);

      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        selectedStatusFilter === 'TODOS' ||
        req.current_status === selectedStatusFilter ||
        ((selectedStatusFilter === 'DECIDED' || selectedStatusFilter === 'DECIDIDAS') &&
          ['APROBADA', 'APPROVED', 'APROBADA_CON_AJUSTES', 'APPROVED_WITH_ADJUSTMENTS', 'RECHAZADA', 'REJECTED'].includes(
            req.current_status
          ));

      const matchesType =
        selectedTypeFilter === 'ALL' ||
        selectedTypeFilter === 'TODOS' ||
        typeId === selectedTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, types, users, searchTerm, selectedStatusFilter, selectedTypeFilter]);

  const handleDragStart = (e: React.DragEvent, reqId: string) => {
    if (isReadOnly) {
      e.preventDefault();
      setToastMessage({
        type: 'error',
        text: 'Modo solo lectura: Su rol actual no tiene autorización para realizar transiciones por arrastre (RF-21).',
      });
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }
    setDraggingReqId(reqId);
    e.dataTransfer.setData('text/plain', reqId);
  };

  const handleDropOnColumn = (targetCol: KanbanColumnDef) => {
    if (!draggingReqId) return;

    const req = requests.find((a) => a.id === draggingReqId);
    setDraggingReqId(null);
    if (!req) return;

    if (targetCol.statuses.includes(req.current_status)) return;

    let targetStatus: RequestDbStatus;
    let actionTitle: string;
    let actionDesc: string;
    let requiresReason = false;

    if (targetCol.key === 'UNDER_REVIEW') {
      if (
        req.current_status !== 'RADICADA' &&
        req.current_status !== 'SUBMITTED' &&
        req.current_status !== 'PENDIENTE_DOCUMENTOS' &&
        req.current_status !== 'PENDING_DOCUMENTS'
      ) {
        setToastMessage({
          type: 'error',
          text: `RF-21: No es posible pasar a "En revisión" desde el estado "${req.current_status}". Debe provenir de validación documental.`,
        });
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      targetStatus = 'EN_REVISION';
      actionTitle = 'Confirmar Pase a Revisión Técnica (RN-02)';
      actionDesc =
        'Al transitar a "En revisión", se certifica que el 100% de los requisitos obligatorios están validados.';
    } else if (targetCol.key === 'PENDING_DOCUMENTS') {
      targetStatus = 'PENDIENTE_DOCUMENTOS';
      actionTitle = 'Pasar a Pendiente por Documentos';
      actionDesc =
        'Indique la justificación de los requisitos subsanables observados o pendientes para notificar al investigador con plazo reglamentario.';
      requiresReason = true;
    } else if (targetCol.key === 'COMMITTEE_READY') {
      if (req.current_status !== 'EN_REVISION' && req.current_status !== 'UNDER_REVIEW') {
        setToastMessage({
          type: 'error',
          text: 'RF-21: Solo las solicitudes en "En revisión" con concepto técnico favorable pueden pasar a "Lista para comité" (RN-04).',
        });
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      targetStatus = 'LISTA_COMITE';
      actionTitle = 'Habilitar para Agenda de Sesión de Comité (RF-20)';
      actionDesc =
        'Se registrará el concepto técnico favorable y la solicitud quedará disponible para incorporarse en la agenda de la próxima sesión colegiada.';
    } else if (targetCol.key === 'DECIDED') {
      if (req.current_status !== 'LISTA_COMITE' && req.current_status !== 'COMMITTEE_READY') {
        setToastMessage({
          type: 'error',
          text: 'RN-04: Solo las solicitudes que estén en "Lista para comité" y sean deliberadas pueden recibir decisión formal.',
        });
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      targetStatus = 'APROBADA';
      actionTitle = 'Registrar Decisión Formal de Comité';
      actionDesc =
        'Seleccione el sentido de la decisión y proporcione la justificación reglamentaria obligatoria (RN-05).';
      requiresReason = true;
    } else {
      setToastMessage({
        type: 'error',
        text: 'Transición no permitida por la matriz reglamentaria de estados (RF-21).',
      });
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    setActionModal({
      request: req,
      targetColumn: targetCol.key,
      targetStatus,
      actionTitle,
      actionDescription: actionDesc,
      requiresReason,
    });
  };

  const handleConfirmModalAction = async () => {
    if (!actionModal) return;

    const finalStatus =
      actionModal.targetColumn === 'DECIDED' ? modalDecidedStatus : actionModal.targetStatus;

    if (actionModal.requiresReason && !modalReason.trim()) {
      setToastMessage({
        type: 'error',
        text: 'RN-05: Toda decisión o requerimiento exige fundamentación y justificación escrita.',
      });
      return;
    }

    const res = await transitionRequestStatus(
      actionModal.request.id,
      finalStatus,
      user?.id || 'usr-adm-02',
      user?.fullName || 'Personal Administrativo',
      modalReason.trim() || undefined,
      {
        channel: 'KANBAN_DRAG_AND_DROP',
        target_column: actionModal.targetColumn,
      }
    );

    if (res.success) {
      setToastMessage({
        type: 'success',
        text: `Solicitud ${actionModal.request.filing_number} transitó exitosamente a "${finalStatus}".`,
      });
      setActionModal(null);
      setModalReason('');
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage({
        type: 'error',
        text: res.error || 'Error al ejecutar la transición.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Panel de Seguimiento y Control Institucional
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Trazabilidad multidimensional en tiempo real · Tablero Kanban con arrastre controlado y
            vista de tabla estructurada (RF-11, RF-21, RF-35).
          </p>
        </div>

        <div className="flex items-center rounded-2xl border border-[#E5E3DC] bg-white p-1 shadow-2xs self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('KANBAN')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${
              viewMode === 'KANBAN'
                ? 'bg-[#14281D] text-white shadow-xs'
                : 'text-stone-600 hover:text-[#14281D]'
            }`}
          >
            <KanbanIcon size={14} />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${
              viewMode === 'TABLE'
                ? 'bg-[#14281D] text-white shadow-xs'
                : 'text-stone-600 hover:text-[#14281D]'
            }`}
          >
            <TableIcon size={14} />
            <span>Tabla</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <MetricsStrip
        selectedStatus={selectedStatusFilter as ApplicationStatus}
        onSelectStatus={(st) => setSelectedStatusFilter(st)}
      />

      <div className="bg-white rounded-3xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Filtrar por radicado, título, investigador o tipo de trámite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs text-stone-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-stone-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-700"
            >
              <option value="ALL">Todos los estados</option>
              <option value="RADICADA">Radicada</option>
              <option value="PENDIENTE_DOCUMENTOS">Pendiente por documentos</option>
              <option value="EN_REVISION">En revisión técnica</option>
              <option value="LISTA_COMITE">Lista para comité</option>
              <option value="DECIDED">Decididas (Aprobadas / Rechazadas)</option>
            </select>
          </div>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
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

      {actionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-7 max-w-lg w-full space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#14281D] text-white">
                {actionModal.request.filing_number}
              </span>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-sm md:text-base text-[#14281D]">
                {actionModal.actionTitle}
              </h3>
              <p className="text-stone-600 leading-relaxed">{actionModal.actionDescription}</p>
            </div>

            {actionModal.targetColumn === 'DECIDED' && (
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-stone-800">
                  Sentido de la Decisión Colegiada *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalDecidedStatus('APROBADA')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      modalDecidedStatus === 'APROBADA'
                        ? 'bg-[#14281D] text-white border-[#14281D]'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Aprobada
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDecidedStatus('APROBADA_CON_AJUSTES')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      modalDecidedStatus === 'APROBADA_CON_AJUSTES'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Con Ajustes
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalDecidedStatus('RECHAZADA')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer transition-colors ${
                      modalDecidedStatus === 'RECHAZADA'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Rechazada
                  </button>
                </div>
              </div>
            )}

            {actionModal.requiresReason && (
              <div className="space-y-1 pt-1">
                <label className="block font-bold text-stone-800">
                  Fundamentación / Justificación Escrita (RN-05) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Escriba la justificación motivada para el registro oficial en el expediente..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none text-xs text-stone-800 leading-relaxed"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmModalAction}
                className="px-5 py-2 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold cursor-pointer transition-colors shadow-xs"
              >
                Confirmar Transición
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'KANBAN' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const itemsInCol = filteredRequests.filter((req) =>
              col.statuses.includes(req.current_status)
            );

            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnColumn(col)}
                className="bg-[#F7F6F2] rounded-3xl border border-[#E5E3DC] p-3.5 space-y-3 min-h-[500px] flex flex-col"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E3DC]">
                  <div>
                    <h3 className="font-extrabold text-xs text-[#14281D]">{col.label}</h3>
                    <p className="text-[10px] text-stone-400 truncate max-w-[150px]">
                      {col.description}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-stone-700 border border-stone-200">
                    {itemsInCol.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {itemsInCol.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-stone-400 italic">
                      Sin solicitudes
                    </div>
                  ) : (
                    itemsInCol.map((req) => {
                      const typeId = req.request_type_id || req.application_type_id;
                      const typeObj = types.find((t) => t.id === typeId);
                      const applicant = users.find((u) => u.id === req.applicant_id);
                      const deadline = getDeadlineStatus(req.id);

                      const diffDays = Math.max(
                        1,
                        Math.floor(
                          (Date.now() - new Date(req.updated_at || req.created_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      );

                      return (
                        <div
                          key={req.id}
                          draggable={!isReadOnly}
                          onDragStart={(e) => handleDragStart(e, req.id)}
                          onClick={() => navigate(`/requests/${req.id}`)}
                          className={`bg-white rounded-2xl border p-3.5 space-y-2 text-xs transition-all shadow-2xs ${
                            isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                          } hover:border-[#14281D] hover:shadow-xs`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-stone-100 text-[#14281D] border border-stone-200">
                              {req.filing_number}
                            </span>
                            <StatusBadge status={req.current_status} size="sm" />
                          </div>

                          <h4 className="font-bold text-[#14281D] line-clamp-2 leading-snug">
                            {req.title}
                          </h4>

                          <div className="text-[11px] text-stone-500 space-y-0.5 pt-1">
                            <div className="truncate">Sol: {applicant?.full_name}</div>
                            <div className="truncate">Tipo: {typeObj?.code}</div>
                          </div>

                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 text-stone-500">
                              <Clock size={11} />
                              <span>{diffDays} d en etapa</span>
                            </span>

                            {deadline.isOverdue ? (
                              <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                                Vencido
                              </span>
                            ) : deadline.isUrgent ? (
                              <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                                Urgente
                              </span>
                            ) : (
                              <ArrowRight size={11} className="text-stone-300" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E5E3DC] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
                <tr>
                  <th className="py-3 px-4">Radicado</th>
                  <th className="py-3 px-4">Tipo de Trámite</th>
                  <th className="py-3 px-4">Título del Proyecto</th>
                  <th className="py-3 px-4">Investigador</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Días en Etapa</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DC]">
                {filteredRequests.map((req) => {
                  const typeId = req.request_type_id || req.application_type_id;
                  const typeObj = types.find((t) => t.id === typeId);
                  const applicant = users.find((u) => u.id === req.applicant_id);
                  const diffDays = Math.max(
                    1,
                    Math.floor(
                      (Date.now() - new Date(req.updated_at || req.created_at).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  );

                  return (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#14281D] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                          {req.filing_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-700 whitespace-nowrap">
                        {typeObj?.name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#14281D] max-w-xs truncate">
                        {req.title}
                      </td>
                      <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                        {applicant?.full_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={req.current_status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {diffDays} días
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="p-1.5 rounded-lg text-stone-400 group-hover:text-[#14281D] inline-flex items-center gap-1">
                          <Eye size={14} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export const PanelSeguimientoPage = TrackingBoardPage;
