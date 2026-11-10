import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes.tsx';
import { useSessionStore } from './stores/session.store.ts';
import { useCatalogStore } from './features/catalog/catalogStore.ts';
import { useGroupsStore } from './features/groups/groupsStore.ts';
import { useUserStore } from './features/users/userStore.ts';
import { useRequestStore } from './features/requests/requestStore.ts';
import { useCommitteeSessionsStore } from './features/sessions/committeeSessionsStore.ts';

export default function App() {
  const initializeSession = useSessionStore((s) => s.initializeSession);
  const setupAuthListener = useSessionStore((s) => s.setupAuthListener);

  useEffect(() => {
    // Suscribirse primero para no perder eventos mientras Supabase restaura la sesión.
    const unsubscribe = setupAuthListener();
    void initializeSession();

    void useCatalogStore.getState().loadFromSupabase();
    void useGroupsStore.getState().loadFromSupabase();
    void useUserStore.getState().loadFromSupabase();
    void useRequestStore.getState().loadFromSupabase();
    void useCommitteeSessionsStore.getState().loadFromSupabase();
    return () => {
      unsubscribe();
    };
  }, [initializeSession, setupAuthListener]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
