import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { AppShellSkeleton } from '../layouts/AppShellSkeleton.tsx';
import { ROLE_HOME_PATHS } from '../lib/permisos.ts';
import { useSessionStore } from '../stores/session.store.ts';

interface RutaPublicaProps {
  children: ReactNode;
}

export function RutaPublica({ children }: RutaPublicaProps): ReactElement {
  const { user, isAuthenticated, isLoading } = useSessionStore();
  const initialSessionResolved = useRef(!isLoading);
  useEffect(() => {
    if (!isLoading) initialSessionResolved.current = true;
  }, [isLoading]);
  // isLoading also covers manual sign-in/registration. Once initial restoration
  // finishes, preserve those forms and their errors while an attempt is pending.
  if (isLoading && !initialSessionResolved.current) return <AppShellSkeleton />;
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_HOME_PATHS[user.activeRole] || '/mis-solicitudes'} replace />;
  }
  return <>{children}</>;
}
