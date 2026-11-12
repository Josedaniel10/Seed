import { useState } from 'react';
import { useMinutesStore } from './minutesStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { MinuteWorkspace } from './MinuteWorkspace.tsx';

interface SessionMinutesPanelProps {
  sessionId: string;
  isCompleted: boolean;
  canManage: boolean;
}

export function SessionMinutesPanel({ sessionId, isCompleted, canManage }: SessionMinutesPanelProps) {
  const { user } = useSessionStore();
  const { minutes, generateDraftFromSession } = useMinutesStore();
  const minute = minutes.find((item) => item.session_id === sessionId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await generateDraftFromSession(sessionId, user.id, user.fullName);
      if (result && !result.success) throw new Error(result.error || 'No se pudo guardar el acta.');
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
      {!minute && <p>Finalice la sesión con una decisión o constancia en cada punto para generar el borrador.</p>}
      {!minute && canManage && (
        <button disabled={!isCompleted || isSaving} onClick={() => void handleGenerate()}
          className="px-4 py-2 rounded-xl bg-[#14281D] text-white disabled:opacity-40">Generar borrador de acta</button>
      )}
      {minute && <MinuteWorkspace minuteId={minute.id} canManage={canManage} />}
      {isSaving && <p role="status">Procesando acta…</p>}
    </fieldset>
  );
}
