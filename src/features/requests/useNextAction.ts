import type { Request } from '../../types/database.ts';
import { normalizeRole } from '../../lib/permissions.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useRequestStore } from './requestStore.ts';
import { getNextAction } from './nextAction.ts';
import type { NextAction } from './nextAction.ts';

interface NextActionDetails {
  action: NextAction;
  canAct: boolean;
  responsibleName: string | undefined;
  deadline: string | undefined;
  isOverdue: boolean;
  href: string;
}

export function useNextAction(request: Request): NextActionDetails {
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
  return { action, canAct, responsibleName, deadline, isOverdue: Boolean(deadline && deadline < today),
    href: canAct ? action.href : `/solicitudes/${request.id}?tab=${tab}` };
}
