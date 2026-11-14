import { fetchObservationSnapshot } from './observationApi.ts';
import { useRequestStore } from '../requests/requestStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';

export async function refreshObservationState(userId: string, signal: AbortSignal): Promise<void> {
  const before = useRequestStore.getState();
  const snapshot = await fetchObservationSnapshot(signal);
  if (signal.aborted || useSessionStore.getState().user?.id !== userId) return;
  // A confirmed mutation during this read is newer than its snapshot. The next
  // refresh recovers other changes without removing the just-saved observation.
  if (before.observations !== useRequestStore.getState().observations) return;
  useRequestStore.setState(state => ({
    observations: snapshot.observations,
    auditHistory: [...new Map([...state.auditHistory, ...snapshot.audit].map(event => [event.id, event])).values()],
  }));
}
