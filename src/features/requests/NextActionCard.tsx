import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';
import type { Request } from '../../types/database.ts';
import { normalizeRole } from '../../lib/permissions.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useRequestStore } from './requestStore.ts';
import { getNextAction } from './nextAction.ts';

export function NextActionCard({ request, compact = false }: { request: Request; compact?: boolean }): ReactElement {
  const documents = useRequestStore(s => s.documents);
  const observations = useRequestStore(s => s.observations);
  const assignments = useRequestStore(s => s.assignments);
  const auditHistory = useRequestStore(s => s.auditHistory);
  const requirements = useCatalogStore(s => s.requirements);
  const users = useUserStore(s => s.users);
  const user = useSessionStore(s => s.user);
  const action = getNextAction(request, { documents, observations, assignments, auditHistory, requirements });
  const canAct = action.roles.includes(normalizeRole(user?.activeRole)) && (!action.responsibleId || action.responsibleId === user?.id);
  const responsibleName = users.find(p => p.id === action.responsibleId)?.full_name;
  const deadline = action.deadline?.slice(0, 10);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  let tab = 'historial';
  if (action.href.includes('documentos')) tab = 'documentos';
  if (action.href.includes('observaciones')) tab = 'observaciones';
  const href = canAct ? action.href : `/solicitudes/${request.id}?tab=${tab}`;
  return <section aria-label="Próxima acción" className={compact ? 'space-y-1 text-xs' : 'space-y-3 rounded-2xl border border-[#E5E3DC] bg-[#F7F6F2] p-5 text-sm'}>
    {!compact && <h2 className="font-bold text-[#14281D]">Próxima acción</h2>}
    <p className="font-semibold">{action.title}</p>
    <p>Responsable: {responsibleName ? `${responsibleName} · ` : ''}{action.responsible}</p>
    <p className={deadline && deadline < today ? 'font-semibold text-rose-700' : 'text-stone-600'}>
      {deadline ? `Plazo de revisión: ${deadline}${deadline < today ? ' · Vencido' : ''}` : 'Sin plazo registrado para esta acción'}
    </p>
    {!compact && action.pending.length > 0 && <ul className="list-disc space-y-1 pl-5">{action.pending.map((item, index) => <li key={index}>{item}</li>)}</ul>}
    {!compact && <Link className="inline-flex min-h-11 items-center rounded-xl bg-[#14281D] px-4 text-white" to={href}>{canAct ? action.button : 'Consultar expediente'}</Link>}
  </section>;
}
