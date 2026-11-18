import { useSessionStore } from '../../stores/session.store.ts';
import { useGroupsStore } from '../groups/groupsStore.ts';
import type { FundingApplicant } from './callsApi.ts';

export function useFundingApplicant(): FundingApplicant {
  const user = useSessionStore(state => state.user);
  const groups = useGroupsStore(state => state.groups);
  const group = groups.find(item => item.id === user?.researchGroupId && item.is_active);
  return { groupId: group?.id, faculty: group?.faculty, academicLink: user?.academicLink };
}
