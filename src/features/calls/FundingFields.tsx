import type { ReactElement } from 'react';
import { useId } from 'react';
import type { RequestDraft } from '../drafts/draftSchemas.ts';
import { useCalls, isCallOpen, matchesFundingApplicant, fundingGroupError } from './callsApi.ts';
import { useFundingApplicant } from './useFundingApplicant.ts';

export function FundingFields({ value, onChange, typeId }: {
  value: RequestDraft['formData']; onChange: (value: RequestDraft['formData']) => void;
  typeId: string;
}): ReactElement {
  const calls = useCalls();
  const applicant = useFundingApplicant();
  const groupHelpId = useId();
  const groupIssue = fundingGroupError(value.research_group_id, applicant);
  const mode = value.funding_mode ?? (value.budget_requested > 0 ? 'funded' : 'academic');
  const options = groupIssue ? [] : (calls.data ?? []).filter((c) => isCallOpen(c) && matchesFundingApplicant(c, applicant) && c.type_ids.includes(typeId));
  const field = 'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm';
  return <fieldset className="space-y-3"><legend className="font-bold">Modalidad de la solicitud</legend>
    <label className="block"><input type="radio" name="funding-mode" checked={mode === 'academic'} onChange={() => onChange({ ...value, funding_mode: 'academic', budget_requested: 0, funding_call_id: '' })} /> Solo aval académico</label>
    <label className="block"><input type="radio" name="funding-mode" checked={mode === 'funded'} onChange={() => onChange({ ...value, funding_mode: 'funded' })} /> Aval académico con financiamiento</label>
    {mode === 'academic' ? <p className="text-sm text-stone-500">Puedes solicitar aval sin convocatoria. El monto solicitado a la institución será cero.</p> : <>
      {calls.isPending && <p role="status">Consultando convocatorias…</p>}
      {calls.error && <p role="alert">No se pudieron consultar las convocatorias. <button type="button" onClick={() => void calls.refetch()}>Reintentar</button></p>}
      {groupIssue && <p id={groupHelpId} role="status">{groupIssue}</p>}
      {!groupIssue && calls.isSuccess && !options.length && <p role="status">No hay convocatorias abiertas para tu grupo y este trámite. Puedes conservar el borrador o elegir solo aval académico.</p>}
      <label className="block">Convocatoria abierta<select className={field} disabled={Boolean(groupIssue)} aria-describedby={groupIssue ? groupHelpId : undefined} value={value.funding_call_id ?? ''} onChange={(e) => onChange({ ...value, funding_call_id: e.target.value })}>
        <option value="">Selecciona una convocatoria</option>
        {value.funding_call_id && !options.some((c) => c.id === value.funding_call_id) && <option value={value.funding_call_id} disabled>Convocatoria del borrador no disponible</option>}
        {options.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select></label>
      <label className="block">Monto solicitado a la institución (COP)<input className={field} type="number" min="0.01" step="0.01" value={value.budget_requested} onChange={(e) => onChange({ ...value, budget_requested: Number(e.target.value) })} /></label>
      <p className="text-xs text-stone-500">Al radicar se verificarán la vigencia, los destinatarios y las condiciones de la convocatoria.</p>
    </>}
  </fieldset>;
}
