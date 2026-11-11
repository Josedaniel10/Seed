import type { RequestQuorum } from './requestQuorum.ts';

interface RequestQuorumNoticeProps {
  quorum: RequestQuorum;
}

export function RequestQuorumNotice({ quorum }: RequestQuorumNoticeProps) {
  return (
    <div role="status" className={`rounded-xl border p-3 text-xs space-y-2 ${quorum.hasQuorum
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
      <p className="font-semibold">
        {quorum.eligibleCount} de {quorum.requiredCount} asistentes necesarios pueden participar en esta solicitud.
      </p>
      {quorum.excludedParticipants.map((participant) => (
        <p key={participant.id}>{participant.name}. {participant.reason}</p>
      ))}
      {!quorum.hasQuorum && <p>Para registrar una decisión se necesita completar la asistencia mínima con personas que puedan participar.</p>}
    </div>
  );
}
