import { ObservationThread } from './ObservationThread.tsx';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import React, { useRef, useState } from 'react';
import type { Dispatch, SetStateAction, ReactElement } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import type { Request, RequestDocument, Requirement, Observation, ReviewerConcept } from '../../types/database.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../applications/applicationStore.ts';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { ExpedienteDocuments } from '../documents/ExpedienteDocuments.tsx';
import { DraftNotice } from '../drafts/DraftNotice.tsx';
import { useLocalDraft } from '../drafts/useLocalDraft.ts';
import { technicalReviewDraftSchema } from '../drafts/draftSchemas.ts';
import type { TechnicalReviewDraft } from '../drafts/draftSchemas.ts';

export function TechnicalReviewWorkspace({ app, assignmentId, appDocs, appObs, requirements, onConceptSubmitted }: {
  app: Request; assignmentId: string; appDocs: RequestDocument[]; appObs: Observation[]; requirements: Requirement[];
  onConceptSubmitted: (message: string) => void;
}): ReactElement {
  const { user } = useSessionStore();
  const { addTechnicalObservation, submitReviewerConcept } = useApplicationStore();
  const context = JSON.stringify(appDocs.map((document) => [document.id, document.file_hash_sha256, document.uploaded_at]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const { draft: savedDraft, controller: draftController } = useLocalDraft({
    ownerId: user?.id ?? '', scope: `review:${app.id}:${assignmentId}`, context,
    schema: technicalReviewDraftSchema,
    createInitial: (): TechnicalReviewDraft => ({ obsCategory: 'SUGERENCIA', obsContent: '', concept: 'FAVORABLE', conceptJustification: '' }),
    hasContent: (value) => Boolean(value.obsContent || value.conceptJustification || value.concept !== 'FAVORABLE' || value.obsCategory !== 'SUGERENCIA'),
  });
  const { obsCategory, obsContent, concept, conceptJustification } = savedDraft.value;
  const hasUnverifiedAdjustments = appObs.some(observation => !observation.is_resolved
    && ['AJUSTE_OBLIGATORIO', 'MANDATORY_ADJUSTMENT'].includes(observation.category));
  const setObsCategory = (next: TechnicalReviewDraft['obsCategory']) => draftController.update((current) => ({ ...current, obsCategory: next }));
  const setObsContent: Dispatch<SetStateAction<string>> = (next) => draftController.update((current) => ({ ...current,
    obsContent: typeof next === 'function' ? next(current.obsContent) : next }));
  const setConcept = (next: ReviewerConcept) => draftController.update((current) => ({ ...current, concept: next }));
  const setConceptJustification = (next: string) => draftController.update((current) => ({ ...current, conceptJustification: next }));
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`${user?.id}:${app.id}:${assignmentId}:${context}`);
  const observationLock = useRef(false);
  const [isSendingObservation, setIsSendingObservation] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleAddObservation = async (appId: string) => {
    if (!user) return;
    if (!obsContent.trim()) {
      setFeedback({ type: 'error', message: 'La observación técnica no puede estar vacía.' });
      return;
    }

    if (observationLock.current) return;
    observationLock.current = true;
    setIsSendingObservation(true);
    try {
      const res = await addTechnicalObservation(
        appId,
        user.id,
        user?.fullName || 'Evaluador Par',
        obsCategory,
        obsContent.trim()
      );

      if (res.success) {
        setFeedback({ type: 'success', message: 'Observación técnica registrada en el expediente.' });
        draftController.update((current) => current.obsContent === obsContent && current.obsCategory === obsCategory
          ? { ...current, obsContent: '' } : current);
        draftController.flush();

      } else {
        setFeedback({ type: 'error', message: res.error || 'Error al guardar observación.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar la observación.' });
    } finally {
      observationLock.current = false;
      setIsSendingObservation(false);
    }
  };

  const handleSubmitConcept = async (appId: string) => {
    if (!user || observationLock.current) return;
    if (!conceptJustification.trim()) {
      setFeedback({
        type: 'error',
        message: 'La emisión de concepto técnico exige fundamentación y justificación escrita.',
      });
      return;
    }

    const target = app;
    requestDecision({
      title: 'Confirmar concepto técnico',
      target: target?.filing_number ?? appId,
      confirmLabel: 'Emitir concepto técnico',
      intent: concept === 'NO_FAVORABLE' || concept === 'UNFAVORABLE' ? 'danger' : 'default',
      details: [{ label: 'Concepto', value: concept.replaceAll('_', ' ').toLowerCase() },
        { label: 'Justificación', value: conceptJustification.trim() },
        ...(obsContent.trim() ? [{ label: 'Observación aún sin registrar', value: obsContent }] : [])],
      consequence: (obsContent.trim() ? 'La observación sin registrar se descartará al emitir el concepto. ' : '')
        + (concept === 'NO_FAVORABLE' || concept === 'UNFAVORABLE'
        ? 'Con la regla actual, emitir un concepto no favorable rechazará la solicitud. Esta acción quedará registrada en el expediente.'
        : 'El concepto quedará registrado y la solicitud avanzará a Lista para comité. La aprobación final corresponde al comité.'),
    }, async () => {
      const res = await submitReviewerConcept(
        appId,
        user.id,
        user?.fullName || 'Evaluador Par',
        concept,
        conceptJustification.trim()
      );

      if (res.success) {
        draftController.complete();
        onConceptSubmitted(`${app.filing_number}: concepto ${concept.replaceAll('_', ' ').toLowerCase()} emitido. El trámite avanzó en el flujo institucional.`);
      } else {
        throw new Error(res.error || 'Error al emitir concepto técnico.');
      }
    });
  };

  return (
    <section aria-label={`Revisión técnica de ${app.filing_number}`} className="p-6 md:p-8 border-t border-[#E5E3DC] bg-[#FAF9F6] space-y-6 text-xs">
      {decisionDialog}
      <DraftNotice draft={savedDraft} controller={draftController} label={app.filing_number} disabled={isSendingObservation} />
      <FloatingAlert message={feedback?.message} tone={feedback?.type} onDismiss={() => setFeedback(null)} />

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
            {appObs.map(obs => <ObservationThread key={obs.id} observation={obs} applicantId={app.applicant_id} />)}
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
            <label htmlFor={`observation-category-${app.id}`} className="block text-[11px] font-bold text-stone-700 mb-1">
              Tipo de Observación *
            </label>
            <select
              id={`observation-category-${app.id}`}
              value={obsCategory}
              onChange={(e) => setObsCategory(technicalReviewDraftSchema.shape.obsCategory.parse(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs outline-none"
            >
              <option value="SUGERENCIA">Sugerencia Académica</option>
              <option value="ACLARACION">Aclaración Metodológica</option>
              <option value="AJUSTE_OBLIGATORIO">Ajuste Obligatorio Requerido</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`observation-content-${app.id}`} className="block text-[11px] font-bold text-stone-700 mb-1">
              Detalle de la Observación o Ajuste Solicitado *
            </label>
            <textarea
              id={`observation-content-${app.id}`}
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
            disabled={isSendingObservation}
            onClick={() => handleAddObservation(app.id)}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Send size={12} />
            <span>{isSendingObservation ? 'Guardando observación…' : 'Registrar Observación'}</span>
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
            <label htmlFor={`review-concept-${app.id}`} className="block text-[11px] font-bold text-stone-700 mb-1">
              Dictamen Técnico *
            </label>
            <select
              id={`review-concept-${app.id}`}
              value={concept}
              onChange={(e) => setConcept(technicalReviewDraftSchema.shape.concept.parse(e.target.value))}
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
            {hasUnverifiedAdjustments && <p className="mt-2 text-amber-900">Hay ajustes obligatorios pendientes de aceptación. Para emitir Favorable sin ajustes debe verificarlos primero.</p>}
          </div>

          <div>
            <label htmlFor={`review-justification-${app.id}`} className="block text-[11px] font-bold text-stone-700 mb-1">
              Justificación Motivada del Concepto *
            </label>
            <textarea
              id={`review-justification-${app.id}`}
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
              disabled={isSendingObservation || (concept === 'FAVORABLE' && hasUnverifiedAdjustments)}
              onClick={() => handleSubmitConcept(app.id)}
              className="px-5 py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-extrabold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>Emitir y Firmar Concepto Técnico</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
