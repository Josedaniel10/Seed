import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useGroupsStore } from '../groups/groupsStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useRequestStore } from '../requests/requestStore.ts';
import { useCommitteeSessionsStore } from '../sessions/committeeSessionsStore.ts';
import { useMinutesStore } from '../minutes/minutesStore.ts';
import { invalidateAccountData } from '../../lib/accountDataScope.ts';

export function clearPresentationData(): void {
  invalidateAccountData();
  useCatalogStore.setState({ types: [], requirements: [], selectedTypeId: null, isInitialized: false, isLoading: false, error: null });
  useGroupsStore.setState({ groups: [], isInitialized: false, isLoading: false, error: null });
  useUserStore.setState({ users: [], isInitialized: false, isLoading: false, error: null });
  useRequestStore.setState({ requests: [], documents: [], auditHistory: [], assignments: [], observations: [], isInitialized: false, isLoading: false });
  useCommitteeSessionsStore.setState({ sessions: [], agendaItems: [], attendances: [], decisions: [], nonDeliberations: [], isLoading: false, error: null });
  useMinutesStore.setState({ minutes: [], isLoading: false, error: null });
}

export async function loadPresentationData(): Promise<boolean> {
  const results = await Promise.allSettled([
    useCatalogStore.getState().loadFromSupabase(), useGroupsStore.getState().loadFromSupabase(),
    useUserStore.getState().loadFromSupabase(), useRequestStore.getState().loadFromSupabase(),
    useCommitteeSessionsStore.getState().loadFromSupabase(), useMinutesStore.getState().loadFromSupabase(),
  ]);
  return results.every(result => result.status === 'fulfilled' && result.value.success);
}
