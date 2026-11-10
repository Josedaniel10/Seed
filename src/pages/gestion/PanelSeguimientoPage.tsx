import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Search,
  Filter,
  Clock,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  Eye,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  MoveRight,
  X,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { MetricsStrip } from '../../features/dashboard/components/MetricsStrip.tsx';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { Application, ApplicationDbStatus } from '../../types/database.ts';
import { ApplicationStatus } from '../../types/theme.ts';

type KanbanColumnKey =
  | 'RADICADA'
  | 'PENDIENTE_DOCUMENTOS'
  | 'EN_REVISION'
  | 'LISTA_COMITE'
  | 'DECIDIDAS';

interface KanbanColumnDef {
  key: KanbanColumnKey;
  label: string;
  statuses: ApplicationDbStatus[];
  description: string;
}

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    key: 'RADICADA',
    label: 'Radicada',
    statuses: ['RADICADA'],
    description: 'En cola para validación documental administrativa',
  },
  {
    key: 'PENDIENTE_DOCUMENTOS',
    label: 'Pendiente por documentos',
    statuses: ['PENDIENTE_DOCUMENTOS'],
    description: 'Requisitos subsanables observados o pendientes',
  },
  {
    key: 'EN_REVISION',
    label: 'En revisión',
    statuses: ['EN_REVISION'],
    description: 'Evaluador par asignado en proceso de concepto técnico',
  },
  {
    key: 'LISTA_COMITE',
    label: 'Lista para comité',
    statuses: ['LISTA_COMITE'],
    description: 'Concepto emitido, lista para agenda de sesión colegiada',
  },
  {
    key: 'DECIDIDAS',
    label: 'Decididas',
    statuses: ['APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA'],
    description: 'Decisión formal asentada por el comité de investigación',
  },
];

export function PanelSeguimientoPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    assignments,
    transitionApplicationStatus,
    getDeadlineStatus,
  } = useApplicationStore();
  const { types } = useCatalogStore();
  const { users } = useUserStore();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string>('TODOS');
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('TODOS');

  // Arrastre controlado en Kanban (T3.15 / RF-21)
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);

  // Diálogo de Acción Guiada al soltar
  const [actionModal, setActionModal] = useState<{
    app: Application;
    targetColumn: KanbanColumnKey;
    targetStatus: ApplicationDbStatus;
    actionTitle: string;
    actionDescription: string;
    requiresReason: boolean;
  } | null>(null);

  const [modalReason, setModalReason] = useState('');
  const [modalDecidedStatus, setModalDecidedStatus] = useState<ApplicationDbStatus>('APROBADA');
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isInvestigador = user?.activeRole === 'investigador';
  const isLider = user?.activeRole === 'lider';
  const isReadOnly = isInvestigador || isLider;

  // Filtrado multidimensional en tiempo real (RF-11)
  const filteredApplications = useMemo(() => {
    return requests.filter((app) => {
      const typeObj = types.find((t) => t.id === app.application_type_id);
      const applicantObj = users.find((u) => u.id === app.applicant_id);

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        app.filing_number.toLowerCase().includes(term) ||
        app.title.toLowerCase().includes(term) ||
        (typeObj?.name || '').toLowerCase().includes(term) ||
        (applicantObj?.full_name || '').toLowerCase().includes(term);

      const matchesEstado =
        selectedEstadoFilter === 'TODOS' ||
        app.current_status === selectedEstadoFilter ||
        (selectedEstadoFilter === 'DECIDIDAS' &&
          ['APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA'].includes(app.current_status));

      const matchesTipo =
        selectedTipoFilter === 'TODOS' || app.application_type_id === selectedTipoFilter;

      return matchesSearch && matchesEstado && matchesTipo;
    });
  }, [requests, types, users, searchTerm, selectedEstadoFilter, selectedTipoFilter]);

  // Manejo de Inicio de Arrastre
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    if (isReadOnly) {
      e.preventDefault();
      setToastMessage({
        type: 'error',
        text: 'Modo solo lectura: Su rol actual no tiene autorización para realizar transiciones por arrastre (RF-21).',
      });
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }
    setDraggingAppId(appId);
    e.dataTransfer.setData('text/plain', appId);
  };

  // Manejo de Drop sobre una Columna
  const handleDropOnColumn = (targetCol: KanbanColumnDef) => {
    if (!draggingAppId) return;

    const app = requests.find((a) => a.id === draggingAppId);
    setDraggingAppId(null);
    if (!app) return;

    // Si ya está en los estados de esa columna, no hacer nada
    if (targetCol.statuses.includes(app.current_status)) return;

    // Validación reglamentaria del salto
    let targetStatus: ApplicationDbStatus;
    let actionTitle: string;
    let actionDesc: string;
    let requiresReason = false;

    if (targetCol.key === 'EN_REVISION') {
      if (app.current_status !== 'RADICADA' && app.current_status !== 'PENDIENTE_DOCUMENTOS') {
        setToastMessage({
          type: 'error',
          text: `RF-21: No es posible pasar a "En revisión" desde el estado "${app.current_status}". Debe provenir de validación documental.`,
        });
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      targetStatus = 'EN_REVISION';
      actionTitle = 'Confirmar Pase a Revisión Técnica (RN-02)';
      actionDesc =
        'Al transitar a "En revisión", se certifica que el 100% de los requisitos obligatorios están validados.';
    } else if (targetCol.key === 'PENDIENTE_DOCUMENTOS') {
      targetStatus = 'PENDIENTE_DOCUMENTOS';
      actionTitle = 'Pasar a Pendiente por Documentos';
      actionDesc =
        'Indique la justificación de los requisitos subsanables observados o pendientes para notificar al investigador con plazo reglamentario.';
      requiresReason = true;
    } else if (targetCol.key === 'LISTA_COMITE') {
      if (app.current_status !== 'EN_REVISION') {
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
    } else if (targetCol.key === 'DECIDIDAS') {
      if (app.current_status !== 'LISTA_COMITE') {
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

    // Abrir Diálogo de Acción Guiada
    setActionModal({
      app,
      targetColumn: targetCol.key,
      targetStatus,
      actionTitle,
      actionDescription: actionDesc,
      requiresReason,
    });
  };

  // Confirmar Acción en el Diálogo
  const handleConfirmModalAction = async () => {
    if (!actionModal) return;

    const finalStatus =
      actionModal.targetColumn === 'DECIDIDAS' ? modalDecidedStatus : actionModal.targetStatus;

    if (actionModal.requiresReason && !modalReason.trim()) {
      setToastMessage({
        type: 'error',
        text: 'RN-05: Toda decisión o requerimiento exige fundamentación y justificación escrita.',
      });
      return;
    }

    const res = await transitionApplicationStatus(
      actionModal.app.id,
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
        text: `Solicitud ${actionModal.app.filing_number} transitó exitosamente a "${finalStatus}".`,
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
      {/* 1. Encabezado */}
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

        {/* Conmutador Kanban / Tabla */}
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

      {/* 2. Franja Superior de Métricas Unificada (RF-35) */}
      <MetricsStrip
        selectedStatus={selectedEstadoFilter as ApplicationStatus}
        onSelectStatus={(st) => setSelectedEstadoFilter(st)}
      />

      {/* 3. Barra de Filtros Multidimensionales (RF-11) */}
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
              value={selectedEstadoFilter}
              onChange={(e) => setSelectedEstadoFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-700"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="RADICADA">Radicada</option>
              <option value="PENDIENTE_DOCUMENTOS">Pendiente por documentos</option>
              <option value="EN_REVISION">En revisión técnica</option>
              <option value="LISTA_COMITE">Lista para comité</option>
              <option value="DECIDIDAS">Decididas (Aprobadas / Rechazadas)</option>
            </select>
          </div>

          <select
            value={selectedTipoFilter}
            onChange={(e) => setSelectedTipoFilter(e.target.value)}
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

      {/* 4. Diálogo de Acción Guiada (RF-21) */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-7 max-w-lg w-full space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#14281D] text-white">
                {actionModal.app.filing_number}
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

            {/* Opciones en caso de columna Decididas */}
            {actionModal.targetColumn === 'DECIDIDAS' && (
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

            {/* Campo de justificación escrita */}
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

      {/* 5. VISTA KANBAN CON ARRASTRE CONTROLADO (RF-21) */}
      {viewMode === 'KANBAN' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const itemsInCol = filteredApplications.filter((app) =>
              col.statuses.includes(app.current_status)
            );

            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnColumn(col)}
                className="bg-[#F7F6F2] rounded-3xl border border-[#E5E3DC] p-3.5 space-y-3 min-h-[500px] flex flex-col"
              >
                {/* Cabecera de Columna */}
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

                {/* Tarjetas de la Columna */}
                <div className="space-y-2.5 flex-1">
                  {itemsInCol.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-stone-400 italic">
                      Sin solicitudes
                    </div>
                  ) : (
                    itemsInCol.map((app) => {
                      const typeObj = types.find((t) => t.id === app.application_type_id);
                      const applicant = users.find((u) => u.id === app.applicant_id);
                      const deadline = getDeadlineStatus(app.id);

                      // Días en estado calculados
                      const diffDays = Math.max(
                        1,
                        Math.floor(
                          (Date.now() - new Date(app.updated_at || app.created_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      );

                      return (
                        <div
                          key={app.id}
                          draggable={!isReadOnly}
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onClick={() => navigate(`/solicitudes/${app.id}`)}
                          className={`bg-white rounded-2xl border p-3.5 space-y-2 text-xs transition-all shadow-2xs ${
                            isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                          } hover:border-[#14281D] hover:shadow-xs`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-stone-100 text-[#14281D] border border-stone-200">
                              {app.filing_number}
                            </span>
                            <StatusBadge status={app.current_status} size="sm" />
                          </div>

                          <h4 className="font-bold text-[#14281D] line-clamp-2 leading-snug">
                            {app.title}
                          </h4>

                          <div className="text-[11px] text-stone-500 space-y-0.5 pt-1">
                            <div className="truncate">Sol: {applicant?.full_name}</div>
                            <div className="truncate">Tipo: {typeObj?.code}</div>
                          </div>

                          {/* Plazo / Días en estado */}
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
        /* 6. VISTA TABLA ESTRUCTURADA (RF-11) */
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
                {filteredApplications.map((app) => {
                  const typeObj = types.find((t) => t.id === app.application_type_id);
                  const applicant = users.find((u) => u.id === app.applicant_id);
                  const diffDays = Math.max(
                    1,
                    Math.floor(
                      (Date.now() - new Date(app.updated_at || app.created_at).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  );

                  return (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/solicitudes/${app.id}`)}
                      className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#14281D] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                          {app.filing_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-700 whitespace-nowrap">
                        {typeObj?.name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#14281D] max-w-xs truncate">
                        {app.title}
                      </td>
                      <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                        {applicant?.full_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={app.current_status} size="sm" />
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
