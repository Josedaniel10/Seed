import type { ReactElement } from 'react';
import { useSessionStore } from '../../stores/session.store.ts';

export function SessionSyncNotice(): ReactElement | null {
  const { sessionSyncError, isRefreshingSession, initializeSession } = useSessionStore();
  if (!sessionSyncError) return null;
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
    <p>{sessionSyncError}</p>
    <button type="button" disabled={isRefreshingSession} onClick={() => { void initializeSession(); }}
      className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-semibold disabled:opacity-50">Reintentar actualización de sesión</button>
  </div>;
}
