import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useCalls, isCallOpen, formatCallDate } from './callsApi.ts';

export function CallsNotice(): ReactElement {
  const calls = useCalls();
  const open = (calls.data ?? []).filter((c) => isCallOpen(c));
  return <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2" aria-label="Convocatorias abiertas">
    <div className="flex justify-between gap-3"><h2 className="font-bold text-[#14281D]">Convocatorias abiertas</h2><Link className="underline text-sm" to="/convocatorias">Ver convocatorias</Link></div>
    {calls.isPending && <p className="text-sm" role="status">Consultando oportunidades…</p>}
    {calls.error && <p className="text-sm" role="alert">No se pudieron consultar las oportunidades. Puedes reintentar desde Convocatorias.</p>}
    {calls.isSuccess && !open.length && <p className="text-sm text-stone-600">No hay convocatorias abiertas. Puedes solicitar solo aval académico.</p>}
    {open.slice(0, 3).map((c) => <p key={c.id} className="text-sm"><Link className="underline" to={`/convocatorias?convocatoria=${c.id}`}>{c.title}</Link> · {c.faculty} · Cierra {formatCallDate(c.closes_at)}</p>)}
  </section>;
}
