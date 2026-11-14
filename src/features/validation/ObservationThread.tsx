import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Observation } from '../../types/database.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useRequestStore } from '../requests/requestStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';

export function ObservationThread({ observation, applicantId }: { observation: Observation; applicantId: string }): ReactElement {
  const user = useSessionStore(s => s.user);
  const profiles = useUserStore(s => s.users);
  const { respondToObservation, verifyObservation, assignments, requests } = useRequestStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`${user?.id}:${observation.id}`);
  const appId = observation.application_id ?? observation.request_id;
  const editable = requests.some(r => r.id === appId && ['EN_REVISION', 'UNDER_REVIEW'].includes(r.current_status));
  const reviewer = assignments.some(a => (a.application_id ?? a.request_id) === appId && a.is_active && a.reviewer_id === user?.id);
  const owner = user?.id === applicantId;

  const handleDecision = (accept?: boolean) => {
    if (!user || !text.trim() || busy) return;
    const content = text.trim();
    const expectedResponse = observation.applicant_response ?? '';
    const verificationLabel = accept ? 'Aceptar ajuste' : 'Solicitar nueva corrección';
    const verificationConsequence = accept ? 'El ajuste quedará verificado y aceptado.' : 'El ajuste seguirá pendiente y el investigador podrá corregir su respuesta.';
    requestDecision({
      title: owner ? 'Enviar respuesta al evaluador' : 'Verificar ajuste',
      target: observation.content,
      confirmLabel: owner ? 'Enviar respuesta' : verificationLabel,
      details: [...(!owner ? [{ label: 'Respuesta revisada', value: expectedResponse }] : []), { label: 'Fundamento', value: content }],
      consequence: owner ? 'La respuesta quedará pendiente de verificación del evaluador.' : verificationConsequence,
    }, async () => {
      setBusy(true);
      try {
        const result = owner
          ? await respondToObservation(observation.id, content, user.id, user.fullName)
          : await verifyObservation(observation.id, accept === true, content, expectedResponse);
        if (!result.success) throw new Error(result.error ?? 'No se pudo guardar.');
        setText('');
      } finally {
        setBusy(false);
      }
    });
  };

  let status = 'Pendiente de respuesta';
  if (observation.applicant_response) status = 'Respuesta enviada · Pendiente de verificación';
  if (observation.verified_at) status = 'Requiere nueva corrección';
  if (observation.is_resolved) status = observation.verified_at ? 'Verificado y aceptado' : 'Atendida (registro anterior)';
  return <article className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-xs">
    {decisionDialog}
    <div className="flex flex-wrap justify-between gap-2 text-stone-500">
      <span>{profiles.find(profile => profile.id === observation.author_id)?.full_name ?? 'Evaluador'}</span>
      <time dateTime={observation.created_at}>{new Date(observation.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</time>
    </div>
    <p className="font-semibold">{observation.category.replaceAll('_', ' ')}</p>
    <p className="whitespace-pre-wrap">{observation.content}</p>
    <p role="status">{status}</p>
    {observation.applicant_response && <p className="whitespace-pre-wrap">Respuesta: {observation.applicant_response}</p>}
    {observation.verification_notes && <p className="whitespace-pre-wrap">Verificación del evaluador: {observation.verification_notes}</p>}
    {observation.verified_at && <p>Verificado por {profiles.find(profile => profile.id === observation.verified_by)?.full_name ?? 'el evaluador asignado'} el {new Date(observation.verified_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>}
    {editable && !observation.is_resolved && (owner || (reviewer && observation.applicant_response)) && <>
      <label className="block">
        {owner ? 'Respuesta y referencia a la evidencia (documento, página o sección)' : 'Fundamento de la verificación'}
        <textarea maxLength={20000} value={text} disabled={busy} onChange={e => setText(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
      </label>
      <div className="flex flex-wrap gap-2">
        {owner
          ? <button type="button" disabled={busy || !text.trim()} onClick={() => handleDecision()} className="min-h-11 rounded-lg bg-[#14281D] px-3 text-white">Enviar respuesta</button>
          : <>
            <button type="button" disabled={busy || !text.trim()} onClick={() => handleDecision(true)} className="min-h-11 rounded-lg bg-[#14281D] px-3 text-white">Aceptar ajuste</button>
            <button type="button" disabled={busy || !text.trim()} onClick={() => handleDecision(false)} className="min-h-11 rounded-lg border px-3">Solicitar nueva corrección</button>
          </>}
      </div>
    </>}
  </article>;
}
