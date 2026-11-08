import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes.tsx';
import { useSessionStore } from './stores/session.store.ts';

export default function App() {
  const initializeSession = useSessionStore((s) => s.initializeSession);
  const setupAuthListener = useSessionStore((s) => s.setupAuthListener);

  useEffect(() => {
    // 1. Inicializar sesión persistente
    initializeSession();

    // 2. Suscribirse a cambios en tiempo real de Supabase Auth
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
