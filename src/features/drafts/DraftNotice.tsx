import type { ReactElement } from 'react';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import type { DraftSnapshot, LocalDraft } from './localDraft.ts';

export function DraftNotice<T>({ draft, controller, label, disabled = false }: {
  draft: DraftSnapshot<T>; controller: LocalDraft<T>; label: string; disabled?: boolean;
}): ReactElement {
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`${controller.key}:${controller.context}`);
  const blocked = ['conflict', 'outdated', 'invalid', 'unavailable'].includes(draft.status);
  let message = 'Guardado automático de borrador en este navegador.';
  if (draft.status === 'pending') message = 'Guardando borrador en este navegador…';
  if (draft.status === 'saved') message = 'Borrador guardado en este navegador.';
  if (draft.status === 'restored') message = 'Borrador recuperado. Puede continuar donde quedó.';
  if (draft.error) message = draft.error;
  const discard = () => requestDecision({
    title: 'Descartar borrador', target: label, confirmLabel: 'Descartar borrador', intent: 'danger',
    consequence: 'Se eliminarán los datos del formulario guardados en este navegador y se comenzará de nuevo. Los documentos ya radicados no se modifican.',
  }, controller.discard);
  const recover = () => requestDecision({
    title: 'Recuperar borrador guardado', target: label, confirmLabel: 'Recuperar borrador',
    consequence: 'El formulario mostrará la versión guardada en este navegador. Revise el contenido recuperado antes de enviarlo.',
  }, controller.recover);
  const replace = () => requestDecision({
    title: 'Conservar el texto de esta pestaña', target: label, confirmLabel: 'Guardar esta versión', intent: 'warning',
    consequence: 'Esta versión reemplazará el borrador guardado por otra pestaña. El contenido que ve en el formulario se conservará.',
  }, controller.replace);
  return <aside aria-label={`Borrador de ${label}`} className={`space-y-2 rounded-xl border p-3 text-xs ${blocked || draft.needsReview ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-[#E5E3DC] bg-white text-stone-600'}`}>
    {decisionDialog}
    <p role={blocked ? 'alert' : 'status'}>{message}</p>
    {draft.savedAt && <p>Último guardado: {new Date(draft.savedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} (Colombia).</p>}
    {draft.needsReview && <p className="font-semibold">El borrador procede de una versión anterior. Revise los documentos actuales antes de emitir su concepto.</p>}
    <p>Disponible para esta cuenta en este navegador. El borrador todavía no se ha enviado.</p>
    <div className="flex flex-wrap gap-2">
      {['conflict', 'outdated'].includes(draft.status) && <button type="button" disabled={disabled} onClick={recover} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3">Recuperar versión guardada</button>}
      {draft.status === 'conflict' && <button type="button" disabled={disabled} onClick={replace} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3">Conservar esta pestaña</button>}
      {draft.status === 'unavailable' && <button type="button" disabled={disabled} onClick={() => controller.flush()} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3">Reintentar guardado</button>}
      {draft.status !== 'empty' && <button type="button" disabled={disabled} onClick={discard} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3">Descartar borrador</button>}
    </div>
  </aside>;
}
