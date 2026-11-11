import { useEffect } from 'react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCommitteeSessionsStore } from './committeeSessionsStore.ts';
import { useMinutesStore } from '../minutes/minutesStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useRequestStore } from '../requests/requestStore.ts';

export function useCommitteeData(): void {
  const userId = useSessionStore((state) => state.user?.id);
  const activeRole = useSessionStore((state) => state.user?.activeRole);
  useEffect(() => {
    if (!userId) return;
    void useCommitteeSessionsStore.getState().loadFromSupabase();
    void useMinutesStore.getState().loadFromSupabase();
    void useUserStore.getState().loadFromSupabase();
    void useRequestStore.getState().loadFromSupabase();
  }, [userId, activeRole]);
}
