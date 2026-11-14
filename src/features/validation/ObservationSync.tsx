import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { refreshObservationState } from './observationSync.ts';

export function ObservationSync(): ReactElement {
  const userId = useSessionStore(state => state.user?.id);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const client = getSupabaseClient();
    setError(null);
    if (!client || !userId) return;
    const controller = new AbortController();
    let pending = false;
    let queued = false;
    const refresh = async () => {
      if (controller.signal.aborted) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        await refreshObservationState(userId, controller.signal);
        if (!controller.signal.aborted) setError(null);
      } catch {
        if (!controller.signal.aborted) setError('No se pudieron actualizar las observaciones técnicas. Se reintentará automáticamente.');
      } finally {
        pending = false;
        if (queued && !controller.signal.aborted) { queued = false; void refresh(); }
      }
    };
    const channel = client.channel(`observations:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'observations' }, () => { void refresh(); })
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); });
    const refreshVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    // Recover missed events, including deployments without Realtime connectivity.
    const timer = window.setInterval(refreshVisible, 15000);
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('online', refreshVisible);
    void refresh();
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener('online', refreshVisible);
      void client.removeChannel(channel);
    };
  }, [userId]);
  return <FloatingAlert message={error} onDismiss={() => setError(null)} />;
}
