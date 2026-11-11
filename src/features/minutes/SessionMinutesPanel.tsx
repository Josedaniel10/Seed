import { useState } from 'react';
import { useMinutesStore } from './minutesStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';

interface SessionMinutesPanelProps {
  sessionId: string;
  isCompleted: boolean;
  canManage: boolean;
}

export function SessionMinutesPanel({ sessionId, isCompleted, canManage }: SessionMinutesPanelProps) {
  const { user } = useSessionStore();
  const { minutes, generateDraftFromSession, updateDraftContent, approveMinutes, exportMinutePdf } = useMinutesStore();
  const minute = minutes.find((item) => item.session_id === sessionId);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: 'generate' | 'save' | 'approve' | 'download') => {
    if (!user || isSaving) return;
    if (action === 'approve' && !window.confirm('¿Aprobar el acta? Su contenido quedará bloqueado para edición.')) return;
    setIsSaving(true);
    setError(null);
    try {
      if (action === 'download' && minute) {
        const result = await exportMinutePdf(minute.id);
        if (!result.success || !result.pdfUrl) throw new Error(result.error || 'No se pudo generar el PDF.');
        const link = document.createElement('a');
        link.href = result.pdfUrl;
        link.download = result.fileName || 'acta.pdf';
        link.click();
        setTimeout(() => URL.revokeObjectURL(result.pdfUrl ?? ''), 1000);
        return;
      }
      let result;
      if (action === 'generate') {
        result = await generateDraftFromSession(sessionId, user.id, user.fullName);
      } else if (action === 'save' && minute) {
        result = await updateDraftContent(minute.id, draft ?? minute.draft_content, user.id, user.fullName);
      } else if (action === 'approve' && minute) {
        result = await approveMinutes(minute.id, user.id, user.fullName);
      }
      if (result && !result.success) throw new Error(result.error || 'No se pudo guardar el acta.');
      setDraft(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al procesar el acta.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <fieldset disabled={isSaving} className="bg-white rounded-2xl border border-[#E5E3DC] p-6 space-y-4 text-sm">
      <h2 className="font-bold">{minute?.minute_number ?? 'Acta de la sesión'}</h2>
      {error && <p role="alert" className="text-rose-800">{error}</p>}
      {!minute && <p>Finalice la sesión con todas sus decisiones para generar el borrador.</p>}
      {!minute && canManage && (
        <button disabled={!isCompleted || isSaving} onClick={() => void handleAction('generate')}
          className="px-4 py-2 rounded-xl bg-[#14281D] text-white disabled:opacity-40">Generar borrador de acta</button>
      )}
      {minute && <>
        <p>{minute.is_approved ? 'Aprobada · Contenido bloqueado para edición' : 'Borrador en revisión'}</p>
        {canManage && !minute.is_approved ? (
          <label className="block space-y-2">
            <span>Contenido del acta</span>
            <textarea value={draft ?? minute.draft_content} onChange={(event) => setDraft(event.target.value)}
              rows={22} className="w-full border border-stone-300 rounded-xl p-4 leading-relaxed" />
          </label>
        ) : <pre className="whitespace-pre-wrap font-sans leading-relaxed">{minute.draft_content}</pre>}
        <div className="flex flex-wrap gap-3">
          {canManage && !minute.is_approved && <>
            <button onClick={() => void handleAction('save')} className="border rounded-xl px-4 py-2">Guardar borrador</button>
            <button disabled={draft !== null && draft !== minute.draft_content} onClick={() => void handleAction('approve')}
              className="bg-[#14281D] text-white rounded-xl px-4 py-2 disabled:opacity-40">Aprobar acta</button>
          </>}
          <button disabled={draft !== null && draft !== minute.draft_content} onClick={() => void handleAction('download')}
            className="border rounded-xl px-4 py-2 disabled:opacity-40">Descargar PDF</button>
        </div>
        {draft !== null && draft !== minute.draft_content && <p>Guarde los cambios antes de aprobar o descargar.</p>}
      </>}
      {isSaving && <p role="status">Procesando acta…</p>}
    </fieldset>
  );
}
