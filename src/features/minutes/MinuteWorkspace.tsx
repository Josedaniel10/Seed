import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CommitteeMinutes } from '../../types/database.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useMinutesStore } from './minutesStore.ts';
import { createMinuteContent, minuteApprovalErrors, minuteEditorialSchema, readMinuteContent, serializeMinuteContent, type MinuteContent, type MinuteEditorial } from './minuteContent.ts';
import { MinuteEditorialFields } from './MinuteEditorialFields.tsx';
import { MinuteSnapshot } from './MinuteSnapshot.tsx';
import { MinutePdfPreview } from './MinutePdfPreview.tsx';
import { useCommitteeSessionsStore } from '../sessions/committeeSessionsStore.ts';

export function MinuteWorkspace({ minuteId, canManage, onDirtyChange }: { minuteId: string; canManage: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const minute = useMinutesStore((state) => state.minutes.find((item) => item.id === minuteId));
  const sessions = useCommitteeSessionsStore((state) => state.sessions);
  const attendance = useCommitteeSessionsStore((state) => state.attendances);
  if (!minute) return <p role="alert">Acta no encontrada.</p>;
  let content: MinuteContent;
  try { content = createMinuteContent(minute, { session: sessions.find((session) => session.id === minute.session_id), attendance }); }
  catch (error) { return <p role="alert">{error instanceof Error ? error.message : 'No se pudo abrir el acta.'}</p>; }
  return <MinuteForm key={`${minute.draft_content}-${minute.is_approved}`} minute={minute} content={content} canManage={canManage} onDirtyChange={onDirtyChange} />;
}

function MinuteForm({ minute, content, canManage, onDirtyChange }: { minute: CommitteeMinutes; content: MinuteContent; canManage: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const user = useSessionStore((state) => state.user);
  const { updateStructuredDraft, approveMinutes, isSaving } = useMinutesStore();
  const form = useForm<MinuteEditorial>({ resolver: zodResolver(minuteEditorialSchema), defaultValues: content.editorial });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const editable = canManage && !minute.is_approved;
  const legacy = !readMinuteContent(minute.draft_content);
  const dirty = form.formState.isDirty;
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handleSave = form.handleSubmit(async (editorial) => {
    if (!user || busy || isSaving) return;
    if (legacy && !reviewed) { setError('Revise el borrador original y confirme la revisión antes de guardar.'); return; }
    setError(null);
    setBusy(true);
    try {
      const result = await updateStructuredDraft(minute.id, editorial, user.id, user.fullName);
      if (!result.success) setError(result.error || 'No se pudo guardar el borrador.');
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar el borrador.'); }
    finally { setBusy(false); }
  }, () => setError('Revise la hora y la longitud de los campos del formulario.'));

  const handleApprove = async () => {
    if (!user || busy || isSaving || dirty || legacy) return;
    const errors = minuteApprovalErrors(content.editorial);
    if (errors.length) { setError(errors.join(' ')); return; }
    if (!window.confirm('¿Aprobar el acta? Su contenido quedará bloqueado para edición.')) return;
    setError(null);
    setBusy(true);
    try {
      const result = await approveMinutes(minute.id, user.id, user.fullName);
      if (!result.success) setError(result.error || 'No se pudo aprobar el acta.');
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo aprobar el acta.'); }
    finally { setBusy(false); }
  };

  const handlePdf = async (download: boolean) => {
    if (busy || isSaving) return;
    setError(null); setBusy(true);
    try {
      const values = minuteEditorialSchema.parse(form.getValues());
      // Approved legacy documents retain their exact original representation.
      const draft = editable ? { ...minute, draft_content: serializeMinuteContent(content, values) } : minute;
      const { createMinutePdf } = await import('./minutePdf.ts');
      const url = URL.createObjectURL(createMinutePdf(draft));
      if (!download) { setPreviewUrl(url); return; }
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${minute.minute_number.replace(/\s+/g, '_')}${minute.is_approved ? '' : '_borrador'}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo generar el PDF.'); }
    finally { setBusy(false); }
  };

  return <FormProvider {...form}>
    <form onSubmit={handleSave} className="space-y-5 text-sm">
      <p role="status" className="text-stone-600">{minute.is_approved ? 'Aprobada · Contenido bloqueado para edición' : legacy ? 'Borrador pendiente de revisión' : 'Borrador guardado · En revisión'}</p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
      <fieldset disabled={!editable || busy || isSaving} className="space-y-6 min-w-0">
        <MinuteSnapshot content={content} />
        <label className="block">Hora de cierre (opcional)
          <input type="time" {...form.register('closingTime')} className="ml-3 border border-stone-300 rounded-xl p-2" />
        </label>
        <section className="space-y-3" aria-label="Desarrollo y puntos tratados">
          <h3 className="font-bold text-base text-[#14281D]">Desarrollo y puntos tratados</h3>
          {content.snapshot.openingNotes.map((note, index) => <p key={index} className="whitespace-pre-wrap">{note}</p>)}
          {content.snapshot.development.map((topic, index) => <article key={index} className="rounded-xl border border-stone-200 p-4 space-y-3">
            <h4 className="font-semibold">{topic.title}</h4>
            {topic.result && <p className="font-semibold text-[#365F46]">{topic.result}</p>}
            {topic.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="whitespace-pre-wrap text-stone-600">{paragraph}</p>)}
            <label className="block">Observaciones del punto {topic.order || index + 1} (opcional)
              <textarea {...form.register(`topicNotes.${index}.text`)} rows={3} maxLength={50000} className="w-full rounded-xl border border-stone-300 p-3" />
            </label>
          </article>)}
          {content.snapshot.additionalSections.map((section, index) => <div key={index} className="space-y-2">
            <h4 className="font-semibold">{section.title}</h4>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="whitespace-pre-wrap">{paragraph}</p>)}
          </div>)}
        </section>
        <MinuteEditorialFields />
        <label className="block font-semibold">Observaciones generales (opcional)
          <textarea {...form.register('observations')} rows={4} maxLength={50000} className="w-full rounded-xl border border-stone-300 p-3 font-normal" />
        </label>
      </fieldset>
      {content.sourceText && <details className="rounded-xl border border-stone-200 p-4">
        <summary className="cursor-pointer font-semibold">Consultar borrador original</summary>
        <pre className="whitespace-pre-wrap font-sans mt-3 text-stone-600">{content.sourceText}</pre>
      </details>}
      {editable && legacy && <label className="flex gap-2 items-start rounded-xl bg-amber-50 p-3">
        <input type="checkbox" checked={reviewed} disabled={busy || isSaving} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />
        <span>He revisado el borrador original y los campos del acta. El texto original se conservará para consulta.</span>
      </label>}
      {editable && <p className="text-xs text-stone-500">Para aprobar, complete al menos dos firmantes y la acción y responsable de cada compromiso. Puede dejar su plazo por definir.</p>}
      <div className="flex flex-wrap gap-3">
        {editable && <>
          <button type="submit" disabled={busy || isSaving || (legacy && !reviewed)} className="rounded-xl border border-stone-300 px-4 py-2 disabled:opacity-40">Guardar borrador</button>
          <button type="button" disabled={busy || isSaving || dirty || legacy} onClick={() => void handleApprove()} className="rounded-xl bg-[#14281D] text-white px-4 py-2 disabled:opacity-40">Aprobar acta</button>
        </>}
        <button type="button" disabled={busy || isSaving} onClick={() => void handlePdf(false)} className="rounded-xl border border-stone-300 px-4 py-2">Vista previa del PDF</button>
        <button type="button" disabled={busy || isSaving || (editable && (dirty || legacy))} onClick={() => void handlePdf(true)} className="rounded-xl border border-stone-300 px-4 py-2 disabled:opacity-40">Descargar PDF</button>
      </div>
      {editable && (dirty || legacy) && <p className="text-stone-600">Guarde el borrador antes de aprobar o descargar. La vista previa incluye los cambios actuales.</p>}
      {(busy || isSaving) && <p role="status">Procesando acta…</p>}
      {previewUrl && <MinutePdfPreview url={previewUrl} title={minute.minute_number} onClose={() => setPreviewUrl(null)} />}
    </form>
  </FormProvider>;
}
