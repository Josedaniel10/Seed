import type { ReactElement } from 'react';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { useSessionStore } from '../../stores/session.store.ts';

export function SessionSyncNotice(): ReactElement {
  const { sessionSyncError, isRefreshingSession, initializeSession } = useSessionStore();
  return <FloatingAlert message={sessionSyncError} tone="warning" dismissible={false} duration={null}>
    <button type="button" disabled={isRefreshingSession} onClick={() => { void initializeSession(); }}
      className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-semibold disabled:opacity-50">Reintentar actualización de sesión</button>
  </FloatingAlert>;
}
