import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { NonDeliberationPanel } from '../../features/sessions/NonDeliberationPanel.tsx';
import { getRequestQuorum } from '../../features/sessions/requestQuorum.ts';
import { RequestQuorumNotice } from '../../features/sessions/RequestQuorumNotice.tsx';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { SessionMinutesPanel } from '../../features/minutes/SessionMinutesPanel.tsx';
import { normalizeRole } from '../../lib/permissions.ts';
import { useCommitteeData } from '../../features/sessions/useCommitteeData.ts';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  FileCheck,
  Download,
  Plus,
  Trash2,
  ArrowLeft,
  Scale,
  Lock,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { SessionDecisionType } from '../../types/database.ts';

export function DetalleSesionPage() {
  useCommitteeData();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`${user?.id ?? 'anonymous'}:${id}`);
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const {
    sessions,
    nonDeliberations,
    isLoading,
    isSaving,
    error,
    agendaItems,
    reorderAgenda,
    updateAgendaSpeaker,
    getAgendaBySession,
    addApplicationToAgenda,
    removeApplicationFromAgenda,
    closeAgendaAndSummon,
    getAttendanceBySession,
    toggleAttendance,
    checkSessionQuorum,
    registerSessionDecision,
    getDecisionsBySession,
    finalizeSession,
  } = useCommitteeSessionsStore();

  const { requests, getApplicationById } = useApplicationStore();
  const { users } = useUserStore();

  const session = sessions.find((s) => s.id === id);

  const [activeTab, setActiveTab] = useState<'agenda' | 'quorum' | 'decisiones' | 'acta'>(
    requestedTab === 'quorum' || requestedTab === 'decisiones' || requestedTab === 'acta' ? requestedTab : 'agenda'
  );
  useEffect(() => {
    if (requestedTab === 'agenda' || requestedTab === 'quorum' || requestedTab === 'decisiones' || requestedTab === 'acta') {
      setActiveTab(requestedTab);
    }
  }, [requestedTab, id]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Estados de deliberación para cada expediente
  const [decisionPayloads, setDecisionPayloads] = useState<
    Record<string, { decision: SessionDecisionType; justification: string }>
  >({});

  if (isLoading && !session) return <p role="status">Cargando sesión…</p>;
  if (error) return <p role="alert" className="text-rose-800">{error}</p>;

  if (!session) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-8 text-center space-y-4 max-w-lg mx-auto">
        <AlertTriangle size={36} className="text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-[#14281D]">Sesión no encontrada</h2>
        <p className="text-xs text-stone-500">
          La sesión que busca no está disponible.
        </p>
        <button
          onClick={() => navigate('/sesiones')}
          className="px-4 py-2 bg-[#14281D] text-white rounded-xl text-xs font-bold hover:bg-[#1E3A2B] cursor-pointer"
        >
          Volver a Sesiones
        </button>
      </div>
    );
  }

  const agenda = getAgendaBySession(session.id);
  const attendances = getAttendanceBySession(session.id);
  const quorum = checkSessionQuorum(session.id);
  const decisions = getDecisionsBySession(session.id);
  const sessionNonDeliberations = nonDeliberations.filter((record) => record.session_id === session.id);
  const pendingAgenda = agenda.filter((item) => !decisions.some((decision) =>
    (decision.application_id ?? decision.request_id) === (item.application_id ?? item.request_id))
    && !sessionNonDeliberations.some((record) => record.application_id === (item.application_id ?? item.request_id)));
  const resolvedCount = agenda.length - pendingAgenda.length;

  // Candidatos para agregar a la agenda: Solicitudes en estado LISTA_COMITE (RN-04)
  const agendaAppIds = new Set(agenda.map((a) => a.application_id));
  const candidateApps = requests.filter(
    (a) => ['LISTA_COMITE', 'COMMITTEE_READY'].includes(a.current_status) && !agendaAppIds.has(a.id)
      && !agendaItems.some((item) => item.application_id === a.id
        && sessions.some((other) => other.id === item.session_id && !other.is_completed))
  );

  const committeeMembers = users.filter(
    (u) => u.is_active && [u.role, ...(u.roles ?? [])].some((role) =>
      ['committee_member', 'secretary'].includes(normalizeRole(role)))
  );

  const isSecretaryOrAdmin = normalizeRole(user?.activeRole) === 'secretary' || user?.activeRole === 'admin';

  // Manejador: Agregar solicitud a la agenda
  const handleAddToAgenda = async (appIdToAdd: string) => {
    setActionError(null);
    setActionSuccess(null);

    const res = await addApplicationToAgenda(
      session.id,
      appIdToAdd,
      selectedSpeakerId || null,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Secretaria Técnica'
    );

    if (!res.success) {
      setActionError(res.error || 'Error al agregar solicitud a la agenda.');
    } else {
      setActionSuccess('Expediente incorporado exitosamente en el orden del día.');
      setSelectedAppId('');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Manejador: Retirar de la agenda
  const handleRemoveFromAgenda = async (appIdToRemove: string) => {
    setActionError(null);
    const res = await removeApplicationFromAgenda(
      session.id,
      appIdToRemove,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Secretaria Técnica'
    );
    if (!res.success) {
      setActionError(res.error || 'Error al retirar solicitud.');
    }
  };

  // Manejador: Cerrar agenda formalmente (RF-26)
  const handleCloseAgenda = async () => {
    setActionError(null);
    if (!user) return;
    requestDecision({
      title: 'Confirmar cierre de agenda', target: session.session_number, confirmLabel: 'Cerrar agenda',
      details: [{ label: 'Puntos de agenda', value: String(agenda.length) }],
      consequence: 'Se bloqueará la incorporación de expedientes y se registrará la convocatoria de esta agenda.',
    }, async () => {
      const res = await closeAgendaAndSummon(
        session.id,
        user.id,
        user.fullName
      );
      if (!res.success) {
        throw new Error(res.error || 'Error al cerrar la agenda.');
      } else {
        setActionSuccess('Agenda cerrada. La sesión está lista para registrar decisiones.');
        setTimeout(() => setActionSuccess(null), 3500);
      }
    });
  };

  // Manejador: Registrar Decisión Colegiada (RF-28, RN-05, RN-06, RN-07)
  const handleRegisterDecision = async (appId: string) => {
    setActionError(null);
    const itemData = decisionPayloads[appId] || {
      decision: 'APROBADA' as SessionDecisionType,
      justification: '',
    };

    if (!itemData.justification.trim()) {
      setActionError('Escriba una justificación para la decisión.');
      return;
    }

    if (!user) return;
    requestDecision({
      title: 'Confirmar decisión del comité', target: getApplicationById(appId)?.filing_number ?? appId,
      confirmLabel: 'Registrar decisión',
      intent: ['RECHAZADA', 'REJECTED'].includes(itemData.decision) ? 'danger' : 'default',
      details: [{ label: 'Sesión', value: session.session_number },
        { label: 'Decisión', value: itemData.decision.replaceAll('_', ' ').toLowerCase() },
        { label: 'Justificación', value: itemData.justification.trim() }],
      consequence: ['APLAZADA', 'POSTPONED'].includes(itemData.decision)
        ? 'La decisión quedará registrada y la solicitud permanecerá lista para comité para una sesión posterior.'
        : 'La decisión quedará asentada en la sesión y actualizará el estado de la solicitud.',
    }, async () => {
      const res = await registerSessionDecision(
        session.id,
        appId,
        itemData.decision,
        itemData.justification,
        user.id,
        user.fullName
      );

      if (!res.success) {
        throw new Error(res.error || 'Error al registrar la decisión.');
      } else {
        setActionSuccess(['APLAZADA', 'POSTPONED'].includes(itemData.decision)
          ? 'Aplazamiento registrado. La solicitud permanece lista para comité.'
          : 'Decisión registrada. El estado de la solicitud se actualizó.');
        setTimeout(() => setActionSuccess(null), 3500);
      }
    });
  };

  // Manejador: Finalizar sesión
  const handleFinalizeSession = async () => {
    setActionError(null);
    if (!user) return;
    requestDecision({
      title: 'Confirmar cierre de sesión', target: session.session_number, confirmLabel: 'Finalizar sesión',
      details: [{ label: 'Puntos atendidos', value: `${resolvedCount} de ${agenda.length}` }],
      consequence: 'La sesión quedará finalizada y se habilitará la generación del acta con las decisiones y constancias registradas.',
    }, async () => {
      const res = await finalizeSession(
        session.id,
        user.id,
        user.fullName
      );
      if (!res.success) {
        throw new Error(res.error || 'Error al finalizar sesión.');
      } else {
        setActionSuccess('Sesión finalizada. Puede generar el acta con las decisiones y constancias registradas.');
        setTimeout(() => setActionSuccess(null), 3500);
      }
    });
  };

  return (
    <fieldset disabled={isSaving} className="space-y-6 min-w-0">
      {decisionDialog}
      {isSaving && <p role="status">Guardando cambios…</p>}
      {/* Botón Volver y Encabezado */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/sesiones')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#14281D] cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Volver a Sesiones de Comité</span>
        </button>

        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-[#14281D] text-[#A3E635]">
              <Calendar size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#14281D]">
                  {session.session_number}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200 uppercase">
                  {session.session_type}
                </span>
                {session.is_agenda_closed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <Lock size={10} />
                    <span>Agenda Cerrada</span>
                  </span>
                )}
                {session.is_completed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-800 border border-stone-300">
                    Finalizada
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-2">
                <span>{new Date(session.scheduled_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (Colombia)</span>
                <span>·</span>
                <span>{session.location_or_url}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Monitor de Quórum en tiempo real */}
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                quorum.hasQuorum
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>
                {quorum.attendedCount} de {quorum.totalMembers} miembros ({quorum.hasQuorum ? 'Hay Quórum' : 'Sin Quórum'})
              </span>
            </span>

            {isSecretaryOrAdmin && !session.is_completed && (
              <button
                disabled={!session.is_agenda_closed || pendingAgenda.length > 0}
                onClick={handleFinalizeSession}
                className="px-3.5 py-1.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Finalizar Sesión
              </button>
            )}
          </div>
        </div>
      </div>

      {!session.is_completed && (
        <section aria-label="Requisitos para finalizar la sesión" className="rounded-xl border border-[#E5E3DC] bg-white p-4 text-xs space-y-2">
          <h2 className="font-bold">Para finalizar la sesión</h2>
          <p>{session.is_agenda_closed ? '✓ Agenda cerrada' : 'Pendiente cerrar la agenda'}</p>
          <p>Asistencia registrada. {quorum.attendedCount} participantes presentes.</p>
          <p>{pendingAgenda.length === 0 ? '✓ Todos los puntos tienen una decisión o una constancia' : `${pendingAgenda.length} puntos pendientes de decisión o constancia`}</p>
          <p>Después de finalizar podrá generar el acta.</p>
        </section>
      )}

      {/* Alertas de Acción */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="cursor-pointer text-stone-500 hover:text-stone-800">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Pestañas de la Sesión */}
      <div className="flex border-b border-[#E5E3DC] gap-6 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'agenda'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Orden del Día y Agenda ({agenda.length})
        </button>
        <button
          onClick={() => setActiveTab('quorum')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'quorum'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Asistencia y Quórum ({quorum.attendedCount}/{quorum.totalMembers})
        </button>
        <button
          onClick={() => setActiveTab('decisiones')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'decisiones'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Resultados de la sesión ({resolvedCount}/{agenda.length})
        </button>
        <button
          onClick={() => setActiveTab('acta')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'acta'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Borrador de Acta Oficial
        </button>
      </div>

      {/* Pestaña 1: Orden del Día y Agenda (RF-25, RN-04, RF-26) */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
                  Orden del Día Aprobado
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Expedientes clasificados para deliberación en esta sesión colegiada.
                </p>
              </div>

              {isSecretaryOrAdmin && !session.is_agenda_closed && agenda.length > 0 && (
                <button
                  onClick={handleCloseAgenda}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock size={12} />
                  <span>Cerrar agenda</span>
                </button>
              )}
            </div>

            {agenda.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-xl space-y-1">
                <FileText size={24} className="mx-auto text-stone-400 mb-1" />
                <p className="font-bold text-stone-700">No hay expedientes incorporados en la agenda</p>
                <p className="text-[11px]">
                  Seleccione solicitudes en estado "Lista para comité" desde el panel lateral.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {agenda.map((item) => {
                  const appId = item.application_id || item.request_id || '';
                  const appData = getApplicationById(appId);
                  const decisionRecorded = decisions.find((d) => (d.application_id || d.request_id) === appId);
                  const nonDeliberation = sessionNonDeliberations.find((record) => record.application_id === appId);
                  const requestQuorum = appData ? getRequestQuorum({
                    request: appData, attendance: attendances, members: users, requiredCount: session.quorum_required,
                  }) : null;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] space-y-2.5 hover:border-stone-400 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#14281D] text-white font-mono font-bold text-[11px] flex items-center justify-center">
                            {item.agenda_order}
                          </span>
                          <span className="font-mono font-bold text-[#14281D] bg-white px-2 py-0.5 rounded border border-stone-200">
                            {appData?.filing_number || appId}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            {appData && <StatusBadge status={appData.current_status} size="sm" />}
                          </span>
                          {nonDeliberation && <span className="text-xs font-semibold text-amber-900">No deliberada por falta de quórum</span>}
                          {decisionRecorded && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Decisión: {decisionRecorded.decision.toLowerCase().replaceAll('_', ' ')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-stone-600">
                            Ponente: {users.find((member) => member.id === item.speaker_id)?.full_name || item.speaker_name || 'Sin ponente'}
                          </span>
                          {isSecretaryOrAdmin && !session.is_agenda_closed && (
                            <>
                              <label className="text-xs">Ponente
                                <select aria-label={`Ponente de ${appData?.filing_number}`} value={item.speaker_id ?? ''}
                                  onChange={async (event) => {
                                    const result = await updateAgendaSpeaker(session.id, appId, event.target.value || null);
                                    if (!result.success) setActionError(result.error ?? 'Error al cambiar ponente.');
                                  }} className="border rounded-lg p-1 ml-2">
                                  <option value="">Sin ponente</option>
                                  {committeeMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                                </select>
                              </label>
                              <button aria-label="Subir en agenda" disabled={item.agenda_order === 1} onClick={async () => {
                                const ids = agenda.map((entry) => entry.id);
                                const index = ids.indexOf(item.id);
                                [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                                const result = await reorderAgenda(session.id, ids);
                                if (!result.success) setActionError(result.error ?? 'Error al ordenar agenda.');
                              }} className="border rounded-lg px-2 py-1 disabled:opacity-40">↑</button>
                            <button
                              onClick={() => handleRemoveFromAgenda(appId)}
                              className="text-stone-400 hover:text-rose-600 cursor-pointer p-1"
                              title="Retirar de la agenda"
                            >
                              <Trash2 size={14} />
                            </button>
                            </>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-xs text-[#14281D]">
                        {appData?.title || 'Expediente en deliberación'}
                      </h4>

                      <div className="text-[11px] text-stone-500">
                        {appData?.abstract}
                      </div>
                      {!decisionRecorded && !nonDeliberation && requestQuorum && <RequestQuorumNotice quorum={requestQuorum} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel Lateral: Solicitudes Elegibles para Incorporar (RN-04) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-4 text-xs">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#14281D]" />
                <h4 className="font-bold text-xs text-[#14281D]">Expedientes Listos para Comité</h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Agregue solicitudes que estén listas para comité.
              </p>
            </div>

            {session.is_agenda_closed ? (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center gap-2">
                <Lock size={15} className="shrink-0 text-amber-600" />
                <span>La agenda está cerrada. No se admiten trámites adicionales.</span>
              </div>
            ) : candidateApps.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-[11px] text-stone-500">
                No hay más expedientes en estado "Lista para comité" disponibles para incorporar.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 text-[11px]">
                    Seleccionar Ponente para el Tema
                  </label>
                  <select
                    value={selectedSpeakerId}
                    onChange={(e) => setSelectedSpeakerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E3DC] bg-white outline-none text-xs"
                  >
                    {committeeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {candidateApps.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="p-3 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] space-y-2 hover:border-[#14281D] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#14281D] text-[11px]">
                          {candidate.filing_number}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          <StatusBadge status={candidate.current_status} size="sm" />
                        </span>
                      </div>
                      <p className="font-semibold text-stone-800 line-clamp-2 text-[11px]">
                        {candidate.title}
                      </p>
                      <button
                        onClick={() => handleAddToAgenda(candidate.id)}
                        className="w-full py-1.5 rounded-lg bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus size={12} />
                        <span>Incorporar a la Agenda</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pestaña 2: Asistencia y Quórum Reglamentario (RF-27, RN-07) */}
      {activeTab === 'quorum' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  Asistencia y quórum
                </h3>
              </div>
              <p className="text-stone-500 mt-0.5 text-[11px]">
                Se necesitan {quorum.requiredCount} asistentes habilitados para registrar decisiones.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center gap-3 ${
                quorum.hasQuorum
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="text-right">
                <span className="font-extrabold text-base block">
                  {quorum.attendedCount} / {quorum.totalMembers}
                </span>
                <span className="text-[10px] font-semibold">
                  {quorum.hasQuorum ? 'Asistencia mínima completa' : 'Quórum Insuficiente'}
                </span>
              </div>
              {quorum.hasQuorum ? (
                <CheckCircle2 size={24} className="text-emerald-700" />
              ) : (
                <XCircle size={24} className="text-rose-600" />
              )}
            </div>
          </div>

          <div className="divide-y divide-[#E5E3DC]">
            {attendances.map((att) => (
              <div
                key={att.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#FAF9F6] rounded-xl transition-colors"
              >
                <div>
                  <div className="font-bold text-[#14281D]">{att.user_name}</div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2">
                    <span>{att.user_role}</span>
                    <span>·</span>
                    <span className="text-stone-400">{att.notes || 'Sin anotación'}</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className={`text-[11px] font-bold ${att.attended ? 'text-emerald-800' : 'text-stone-400'}`}>
                    {att.attended ? 'Asistió' : 'Ausente'}
                  </span>
                  <input
                    type="checkbox"
                    checked={att.attended}
                    disabled={!isSecretaryOrAdmin || session.is_completed}
                    onChange={async (e) => {
                      const result = await toggleAttendance(
                        session.id,
                        att.user_id,
                        e.target.checked,
                        e.target.checked ? 'Presencial' : 'Ausencia sin justificación'
                      );
                      if (result && !result.success) setActionError(result.error ?? 'Error al guardar asistencia.');
                    }}
                    className="w-4 h-4 text-[#14281D] rounded cursor-pointer accent-[#14281D]"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña 3: Decisiones Colegiadas y Deliberación (RF-28, RN-05, RN-06, RN-07) */}
      {activeTab === 'decisiones' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          {!session.is_agenda_closed && <p>Cierre la agenda antes de registrar las decisiones.</p>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  Deliberación y Acuerdos por Expediente
                </h3>
              </div>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Registre una decisión o deje constancia de los puntos que no pudieron deliberarse.
              </p>
            </div>

            <div className="text-right">
              <span className="font-bold text-xs text-[#14281D]">
                {resolvedCount} de {agenda.length} puntos atendidos
              </span>
            </div>
          </div>

          {!quorum.hasQuorum && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Votación y Decisión Inhabilitadas por Falta de Quórum</p>
                <p className="text-[11px] mt-0.5">
                  El comité cuenta únicamente con {quorum.attendedCount} integrantes de los {quorum.requiredCount} requeridos. Debe verificar la asistencia en la pestaña "Asistencia y Quórum" antes de registrar cualquier acuerdo vinculante.
                </p>
              </div>
            </div>
          )}

          {agenda.length === 0 ? (
            <div className="p-6 text-center text-stone-500">
              No hay expedientes en el orden del día para deliberar.
            </div>
          ) : (
            <div className="space-y-4">
              {agenda.map((item) => {
                const appId = item.application_id || item.request_id || '';
                const appData = getApplicationById(appId);
                const recordedDecision = decisions.find((d) => (d.application_id || d.request_id) === appId);
                const nonDeliberation = sessionNonDeliberations.find((record) => record.application_id === appId);
                const requestQuorum = appData ? getRequestQuorum({
                  request: appData, attendance: attendances, members: users, requiredCount: session.quorum_required,
                }) : null;
                const currentPayload = decisionPayloads[appId] || {
                  decision: recordedDecision?.decision || ('APROBADA' as SessionDecisionType),
                  justification: recordedDecision?.justification || '',
                };

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-[#E5E3DC] bg-[#FAF9F6] space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white bg-[#14281D] px-2 py-0.5 rounded text-[11px]">
                          Punto #{item.agenda_order}
                        </span>
                        <span className="font-mono font-bold text-[#14281D]">
                          {appData?.filing_number}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Ponente: {users.find((member) => member.id === item.speaker_id)?.full_name || item.speaker_name || 'Sin ponente'}
                        </span>
                      </div>

                      {recordedDecision && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Decisión Asentada: {recordedDecision.decision.toLowerCase().replaceAll('_', ' ')}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-[#14281D]">{appData?.title}</h4>
                    <p className="text-[11px] text-stone-500">{appData?.abstract}</p>

                    {!recordedDecision && !nonDeliberation && requestQuorum && <RequestQuorumNotice quorum={requestQuorum} />}
                    {!recordedDecision && <NonDeliberationPanel
                      sessionId={session.id} applicationId={appId} record={nonDeliberation}
                      canRecord={isSecretaryOrAdmin && session.is_agenda_closed && !session.is_completed
                        && !!requestQuorum && !requestQuorum.hasQuorum}
                      onRecorded={() => {
                        setActionError(null);
                        setActionSuccess('Constancia registrada. La solicitud queda lista para otra sesión.');
                      }}
                    />}
                    {/* Formulario de Decisión Colegiada */}
                    {!nonDeliberation && <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                      <div className="md:col-span-4 space-y-1">
                        <label className="block font-semibold text-stone-700 text-[11px]">
                          Sentido del Acuerdo
                        </label>
                        <select
                          disabled={!requestQuorum?.hasQuorum || !isSecretaryOrAdmin || !session.is_agenda_closed || session.is_completed || !!recordedDecision}
                          value={currentPayload.decision}
                          onChange={(e) =>
                            setDecisionPayloads({
                              ...decisionPayloads,
                              [appId]: {
                                ...currentPayload,
                                decision: e.target.value as SessionDecisionType,
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none font-medium disabled:bg-stone-100 disabled:text-stone-400"
                        >
                          <option value="APROBADA">Aprobada</option>
                          <option value="APROBADA_CON_AJUSTES">Aprobada con ajustes</option>
                          <option value="RECHAZADA">Rechazada</option>
                          <option value="APLAZADA">Aplazada</option>
                        </select>
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="block font-semibold text-stone-700 text-[11px]">
                          Justificación Motivada por Escrito
                        </label>
                        <input
                          type="text"
                          disabled={!requestQuorum?.hasQuorum || !isSecretaryOrAdmin || !session.is_agenda_closed || session.is_completed || !!recordedDecision}
                          value={currentPayload.justification}
                          onChange={(e) =>
                            setDecisionPayloads({
                              ...decisionPayloads,
                              [appId]: {
                                ...currentPayload,
                                justification: e.target.value,
                              },
                            })
                          }
                          placeholder="Fundamento técnico y legal del acuerdo colegiado..."
                          className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none font-medium disabled:bg-stone-100 disabled:text-stone-400"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-end">
                        <button
                          disabled={!requestQuorum?.hasQuorum || !isSecretaryOrAdmin || !session.is_agenda_closed || session.is_completed || !!recordedDecision}
                          onClick={() => handleRegisterDecision(appId)}
                          className="w-full py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                        >
                          {recordedDecision ? 'Registrada' : 'Asentar'}
                        </button>
                      </div>
                    </div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'acta' && (
        <SessionMinutesPanel sessionId={session.id} isCompleted={session.is_completed} canManage={isSecretaryOrAdmin} />
      )}
    </fieldset>
  );
}
