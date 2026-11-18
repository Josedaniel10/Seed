import { useEffect } from 'react';
import { useSessionStore } from '../../stores/session.store.ts';

export function useProfileSync(): void {
  const userId = useSessionStore(state => state.user?.id);
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      const session = useSessionStore.getState();
      if (document.visibilityState === 'hidden' || session.user?.id !== userId
        || session.isLoading || session.isRefreshingSession) return;
      void session.initializeSession();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [userId]);
}
