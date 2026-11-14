import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { useState } from 'react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCommitteeSessionsStore } from './committeeSessionsStore.ts';
import { useRequestStore } from '../requests/requestStore.ts';
import type { SessionNonDeliberation } from '../../types/database.ts';

interface NonDeliberationPanelProps {
  sessionId: string;
  applicationId: string;
  record?: SessionNonDeliberation;
  canRecord: boolean;
  onRecorded: () => void;
}

export function NonDeliberationPanel({ sessionId, applicationId, record, canRecord, onRecorded }: NonDeliberationPanelProps) {
  const user = useSessionStore((state) => state.user);
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`${user?.id ?? 'anonymous'}:${sessionId}:${applicationId}`);
  const { recordNonDeliberation, isSaving } = useCommitteeSessionsStore();
  const filingNumber = useRequestStore((state) => state.requests.find((request) => request.id === applicationId)?.filing_number);
  const [reason, setReason] = useState('No se alcanzó el mínimo de asistentes habilitados para deliberar esta solicitud.');
  const [error, setError] = useState<string | null>(null);

  const handleRecord = async () => {
    if (!user || isSaving || !reason.trim()) return;
    requestDecision({
      title: 'Confirmar constancia de no deliberación', target: filingNumber ?? applicationId,
      confirmLabel: 'Registrar constancia', details: [{ label: 'Motivo', value: reason.trim() }],
      consequence: 'Se conservará esta constancia y la solicitud permanecerá lista para una sesión posterior.',
    }, async () => {
      setError(null);
      const result = await recordNonDeliberation(sessionId, applicationId, reason, user.id, user.fullName);
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudo guardar la constancia.');
      }
      onRecorded();
    });
  };

  if (record) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs text-amber-950">
        <h4 className="font-bold">No deliberada por falta de quórum</h4>
        <p className="whitespace-pre-wrap">{record.reason}</p>
        <p>Al registrar la constancia podían participar {record.eligible_count} de {record.required_count} asistentes necesarios.</p>
        {record.attendance_snapshot.filter((participant) => participant.attended && participant.exclusion_reason).map((participant) => (
          <p key={participant.user_id}>{participant.name}. {participant.exclusion_reason}</p>
        ))}
        <p>La solicitud permanece lista para comité.</p>
      </div>
    );
  }

  if (!canRecord) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-4 space-y-3 text-xs">
      {decisionDialog}
      <p>Puede dejar constancia de que este punto no pudo deliberarse y llevarlo a otra sesión.</p>
      <label className="block space-y-1">
        <span className="font-semibold">Motivo de la constancia</span>
        <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-lg border border-stone-300 p-3" />
      </label>
      <FloatingAlert message={error} onDismiss={() => setError(null)} />
      <button type="button" disabled={isSaving || !reason.trim()} onClick={() => void handleRecord()}
        className="rounded-xl bg-[#14281D] px-4 py-2 text-white font-bold disabled:opacity-40">
        Registrar como no deliberada
      </button>
    </div>
  );
}
