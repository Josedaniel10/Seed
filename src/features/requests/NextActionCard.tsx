import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { Request } from '../../types/database.ts';
import { useNextAction } from './useNextAction.ts';

export function NextActionCard({ request, compact = false }: { request: Request; compact?: boolean }): ReactElement {
  const { action, canAct, responsibleName, deadline, isOverdue, href } = useNextAction(request);
  return <section aria-label="Próxima acción" className={compact ? 'space-y-1 text-xs' : 'space-y-3 rounded-2xl border border-[#E5E3DC] bg-[#F7F6F2] p-5 text-sm'}>
    {!compact && <h2 className="font-bold text-[#14281D]">Próxima acción</h2>}
    <p className="font-semibold">{action.title}</p>
    <p>Responsable: {responsibleName ? `${responsibleName} · ` : ''}{action.responsible}</p>
    <p className={isOverdue ? 'font-semibold text-rose-700' : 'text-stone-600'}>
      {deadline ? `Plazo de revisión: ${deadline}${isOverdue ? ' · Vencido' : ''}` : 'Sin plazo registrado para esta acción'}
    </p>
    {!compact && action.pending.length > 0 && <ul className="list-disc space-y-1 pl-5">{action.pending.map((item, index) => <li key={index}>{item}</li>)}</ul>}
    {!compact && <Link className="inline-flex min-h-11 items-center rounded-xl bg-[#14281D] px-4 text-white" to={href}>{canAct ? action.button : 'Consultar expediente'}</Link>}
  </section>;
}
