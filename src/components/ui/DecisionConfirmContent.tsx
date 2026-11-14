import type { ReactElement, ReactNode } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import type { PendingDecision } from './decisionConfirmation.ts';

export function DecisionConfirmContent({ decision, onCancel, onConfirm, children }: {
  decision: PendingDecision; onCancel: () => void; onConfirm: () => void; children?: ReactNode;
}): ReactElement {
  const { prompt, isPending, error } = decision;
  return <div className="space-y-4" aria-busy={isPending}>
    <p className="break-words font-semibold text-[#14281D]">{prompt.target}</p>
    {prompt.details?.length ? <dl className="space-y-3 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] p-4">
      {prompt.details.map((detail) => <div key={detail.label}>
        <dt className="font-semibold text-stone-600">{detail.label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-stone-800">{detail.value}</dd>
      </div>)}
    </dl> : null}
    {children && <fieldset disabled={isPending} className="min-w-0 space-y-3">{children}</fieldset>}
    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 leading-relaxed text-amber-950">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{prompt.consequence}
    </p>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
    {isPending && <p role="status" className="inline-flex items-center gap-2 text-stone-600"><LoaderCircle size={15} className="animate-spin" />Guardando. Espere la confirmación…</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4">
      <button type="button" autoFocus disabled={isPending} onClick={onCancel}
        className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 font-semibold text-stone-700 disabled:opacity-50">Volver a revisar</button>
      <button type="button" disabled={isPending} onClick={onConfirm}
        className={`min-h-11 rounded-lg px-4 font-semibold text-white disabled:opacity-50 ${prompt.intent === 'danger' ? 'bg-rose-700' : 'bg-[#14281D]'}`}>
        {isPending ? 'Guardando…' : prompt.confirmLabel}
      </button>
    </div>
  </div>;
}
