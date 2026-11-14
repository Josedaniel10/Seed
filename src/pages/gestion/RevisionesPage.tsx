import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import React, { useState, useMemo, useEffect } from 'react';
import { ExpedienteDocuments } from '../../features/documents/ExpedienteDocuments.tsx';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { ReviewerConcept, ObservationCategory } from '../../types/database.ts';

export function RevisionesPage() {
  const { user } = useSessionStore();
  const { requestDecision, decisionDialog } = useDecisionConfirmation(user?.id ?? 'anonymous');
  const {
    requests,
    assignments,
    documents,
    observations,
    getDeadlineStatus,
    addTechnicalObservation,
    submitReviewerConcept,
  } = useApplicationStore();
  const { types, requirements } = useCatalogStore();
  const { users } = useUserStore();

  const currentUserId = user?.id;
  useEffect(() => {
    if (currentUserId) void useApplicationStore.getState().loadFromSupabase();
  }, [currentUserId]);

  // Solicitudes asignadas al evaluador actual (o todas en revisión si es secretario)
  const isSecretario = user?.activeRole === 'secretario';
  const myAssignedApps = useMemo(() => {
    return requests.filter((app) => {
      if (!currentUserId || !['EN_REVISION', 'UNDER_REVIEW'].includes(app.current_status)) return false;
      if (isSecretario) return true;
      const asg = assignments.find(
        (a) => (a.application_id ?? a.request_id) === app.id && a.reviewer_id === currentUserId && a.is_active
      );
      return !!asg;
    });
  }, [requests, assignments, currentUserId, isSecretario]);

  const [expandedAppId, setExpandedAppId] = useState<string | null>(myAssignedApps[0]?.id || null);

  // Formulario de observaciones (RF-17)
  const [obsCategory, setObsCategory] = useState<ObservationCategory>('SUGERENCIA');
  const [obsContent, setObsContent] = useState('');

  // Formulario de concepto técnico (RF-19, RF-20)
  const [concept, setConcept] = useState<ReviewerConcept>('FAVORABLE');
  const [conceptJustification, setConceptJustification] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleAddObservation = async (appId: string) => {
    if (!user) return;
    if (!obsContent.trim()) {
      setFeedback({ type: 'error', message: 'La observación técnica no puede estar vacía.' });
      return;
    }

    const res = await addTechnicalObservation(
      appId,
      user.id,
      user?.fullName || 'Evaluador Par',
      obsCategory,
      obsContent.trim()
    );

    if (res.success) {
      setFeedback({ type: 'success', message: 'Observación técnica registrada en el expediente.' });
      setObsContent('');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al guardar observación.' });
    }
  };

  const handleSubmitConcept = async (appId: string) => {
    if (!user) return;
    if (!conceptJustification.trim()) {
      setFeedback({
        type: 'error',
        message: 'La emisión de concepto técnico exige fundamentación y justificación escrita.',
      });
      return;
    }

    const target = requests.find((request) => request.id === appId);
    requestDecision({
      title: 'Confirmar concepto técnico',
      target: target?.filing_number ?? appId,
      confirmLabel: 'Emitir concepto técnico',
      intent: concept === 'NO_FAVORABLE' || concept === 'UNFAVORABLE' ? 'danger' : 'default',
      details: [{ label: 'Concepto', value: concept.replaceAll('_', ' ').toLowerCase() },
        { label: 'Justificación', value: conceptJustification.trim() }],
      consequence: concept === 'NO_FAVORABLE' || concept === 'UNFAVORABLE'
        ? 'Con la regla actual, emitir un concepto no favorable rechazará la solicitud. Esta acción quedará registrada en el expediente.'
        : 'El concepto quedará registrado y la solicitud avanzará a Lista para comité. La aprobación final corresponde al comité.',
    }, async () => {
      const res = await submitReviewerConcept(
        appId,
        user.id,
        user?.fullName || 'Evaluador Par',
        concept,
        conceptJustification.trim()
      );

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Concepto ${concept} emitido formalmente. El trámite avanzó en el flujo institucional.`,
        });
        setConceptJustification('');
        setTimeout(() => setFeedback(null), 4000);
      } else {
        throw new Error(res.error || 'Error al emitir concepto técnico.');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {decisionDialog}
      <div className="border-b border-[#E5E3DC] pb-4">
        <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Mis Revisiones Técnicas Asignadas
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Integrante del Comité de Investigaciones · Evaluación técnica, formulación de observaciones
          y emisión del concepto técnico.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {myAssignedApps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E5E3DC] p-12 text-center text-xs text-stone-500 space-y-2">
          <CheckSquare size={36} className="mx-auto text-stone-300" />
          <h3 className="font-bold text-sm text-[#14281D]">Sin Revisiones Pendientes</h3>
          <p>Actualmente no tiene expedientes asignados en fase de evaluación técnica.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedApps.map((app) => {
            const isExpanded = expandedAppId === app.id;
            const deadline = getDeadlineStatus(app.id);
            const appType = types.find((t) => t.id === app.application_type_id);
            const applicant = users.find((u) => u.id === app.applicant_id);
            const appDocs = documents.filter((d) => (d.application_id ?? d.request_id) === app.id);
            const appObs = observations.filter((o) => o.application_id === app.id);

            return (
              <div
                key={app.id}
                className="bg-white rounded-3xl border border-[#E5E3DC] overflow-hidden shadow-xs"
              >
                {/* Cabecera de la tarjeta con monitor de vencimiento (RF-22) */}
                <div
                  onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                  className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {app.filing_number}
                      </span>
                      <span className="font-bold text-[#14281D] text-sm md:text-base">
                        {app.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-3">
                      <span>
                        Solicitante: <strong>{applicant?.full_name}</strong>
                      </span>
                      <span>·</span>
                      <span>Tipo: {appType?.name}</span>
                    </div>
                  </div>

                  {/* Monitor de seguimiento de plazos (RF-22) */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {deadline.isOverdue ? (
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                        <AlertCircle size={13} className="text-rose-600" />
                        <span>{deadline.description}</span>
                      </span>
                    ) : deadline.isUrgent ? (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-600" />
                        <span>Próximo a vencer ({deadline.daysRemaining} días)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock size={13} className="text-stone-400" />
                        <span>{deadline.description}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      className="p-2 rounded-xl text-stone-400 hover:text-[#14281D] bg-stone-50 border border-stone-200"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Contenido Desplegable: Documentos, Formulario de Observaciones y Concepto */}
                {isExpanded && (
                  <div className="p-6 md:p-8 border-t border-[#E5E3DC] bg-[#FAF9F6] space-y-6 text-xs">
                    {/* Resumen del Proyecto */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-xs text-[#14281D] uppercase tracking-wider block">
                        Resumen Ejecutivo / Justificación
                      </span>
                      <p className="p-3.5 bg-white rounded-2xl border border-[#E5E3DC] text-stone-700 leading-relaxed">
                        {app.abstract}
                      </p>
                    </div>

                    <ExpedienteDocuments documents={appDocs} requirements={requirements} />

                    {/* Observaciones registradas */}
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-[#14281D] uppercase tracking-wider block">
                        Observaciones Registradas ({appObs.length})
                      </span>
                      {appObs.length === 0 ? (
                        <p className="text-[11px] text-stone-400 italic">
                          Aún no se han formulado observaciones técnicas sobre este trámite.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {appObs.map((obs) => (
                            <div
                              key={obs.id}
                              className="p-3.5 rounded-xl bg-white border border-[#E5E3DC] space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#14281D] text-[11px] px-2 py-0.5 rounded bg-stone-100">
                                  {obs.category}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  {obs.is_resolved ? '✓ Ajuste atendido' : 'Pendiente de respuesta'}
                                </span>
                              </div>
                              <p className="text-stone-700">{obs.content}</p>
                              {obs.applicant_response && (
                                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                                  <strong>Respuesta del investigador:</strong> {obs.applicant_response}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 1. Formulario de Observaciones Técnicas (RF-17) */}
                    <div className="p-5 rounded-2xl bg-white border border-[#E5E3DC] space-y-3">
                      <h4 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
                        Formular Observación Técnica / Solicitud de Ajustes
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Tipo de Observación *
                          </label>
                          <select
                            value={obsCategory}
                            onChange={(e) => setObsCategory(e.target.value as ObservationCategory)}
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs outline-none"
                          >
                            <option value="SUGERENCIA">Sugerencia Académica</option>
                            <option value="ACLARACION">Aclaración Metodológica</option>
                            <option value="AJUSTE_OBLIGATORIO">Ajuste Obligatorio Requerido</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Detalle de la Observación o Ajuste Solicitado *
                          </label>
                          <textarea
                            rows={2}
                            value={obsContent}
                            onChange={(e) => setObsContent(e.target.value)}
                            placeholder="Describa claramente la recomendación o requerimiento técnico..."
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none text-xs text-stone-800 leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddObservation(app.id)}
                          className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Send size={12} />
                          <span>Registrar Observación</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Emisión de Concepto Técnico y Pase a Lista para Comité (RF-19, RF-20) */}
                    <div className="p-5 rounded-2xl bg-white border-2 border-[#14281D] space-y-3 shadow-xs">
                      <h4 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
                        Emisión de Concepto Técnico Evaluador
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Dictamen Técnico *
                          </label>
                          <select
                            value={concept}
                            onChange={(e) => setConcept(e.target.value as ReviewerConcept)}
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs font-bold text-[#14281D] outline-none"
                          >
                            <option value="FAVORABLE">
                              Favorable (Avanza a "Lista para comité")
                            </option>
                            <option value="FAVORABLE_CON_AJUSTES">
                              Favorable con ajustes (Avanza a "Lista para comité")
                            </option>
                            <option value="NO_FAVORABLE">
                              No favorable (Transita a "Rechazada")
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Justificación Motivada del Concepto *
                          </label>
                          <textarea
                            rows={3}
                            value={conceptJustification}
                            onChange={(e) => setConceptJustification(e.target.value)}
                            placeholder="Fundamente con rigor técnico y académico el sentido de su concepto..."
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none text-xs text-stone-800 leading-relaxed"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmitConcept(app.id)}
                            className="px-5 py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-extrabold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <CheckCircle2 size={15} />
                            <span>Emitir y Firmar Concepto Técnico</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
