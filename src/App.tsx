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
    // 1. Inicializar sesión persistente
    initializeSession();

    // 2. Precargar todo en vivo desde Supabase
    useCatalogStore.getState().loadFromSupabase();
    useGroupsStore.getState().loadFromSupabase();
    useUserStore.getState().loadFromSupabase();
    useRequestStore.getState().loadFromSupabase();
    useCommitteeSessionsStore.getState().loadFromSupabase();

    // 3. Suscribirse a cambios en tiempo real de Supabase Auth
    // Si el usuario hace clic en el correo en otra pestaña o en su celular,
    // la sesión se activa instantáneamente y la app se actualiza
    const unsubscribe = setupAuthListener();
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
