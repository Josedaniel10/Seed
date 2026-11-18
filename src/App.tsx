import React, { useEffect, useState } from 'react';
import { PresentationSwitcher } from './features/presentation/PresentationSwitcher.tsx';
import { isPresentationEnabled } from './features/presentation/presentationAccounts.ts';
import { useProfileSync } from './features/auth/useProfileSync.ts';
import { AlertProvider } from './components/ui/AlertProvider.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsSync } from './features/notifications/useNotifications.ts';
import { ObservationSync } from './features/validation/ObservationSync.tsx';
import { BrowserRouter } from 'react-router-dom';
import { useMobileViewport } from './hooks/useMobileViewport.ts';
import { AppRoutes } from './routes/AppRoutes.tsx';
import { useSessionStore } from './stores/session.store.ts';
import { useCatalogStore } from './features/catalog/catalogStore.ts';
import { useGroupsStore } from './features/groups/groupsStore.ts';
import { useUserStore } from './features/users/userStore.ts';
import { useRequestStore } from './features/requests/requestStore.ts';
import { useCommitteeSessionsStore } from './features/sessions/committeeSessionsStore.ts';

const queryClient = new QueryClient();

export default function App() {
  const [switchingAccount, setSwitchingAccount] = useState(false);
  useMobileViewport();
  useProfileSync();
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
    <QueryClientProvider client={queryClient}>
      {!switchingAccount && <NotificationsSync />}
      <BrowserRouter>
        <AlertProvider>
          {!switchingAccount && <><ObservationSync /><AppRoutes /></>}
          {isPresentationEnabled() && <PresentationSwitcher onSwitchingChange={setSwitchingAccount} />}
        </AlertProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
