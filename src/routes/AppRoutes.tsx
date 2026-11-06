import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout.tsx';
import { AppLayout } from '../layouts/AppLayout.tsx';

// Route Guards & Session
import { RutaProtegida } from './RutaProtegida.tsx';
import { useSessionStore } from '../stores/session.store.ts';
import { ROLE_HOME_PATHS } from '../lib/permisos.ts';

// Pages
import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { RegistroPage } from '../pages/auth/RegistroPage.tsx';
import { SinAccesoPage } from '../pages/auth/SinAccesoPage.tsx';

import { MisSolicitudesPage } from '../pages/investigador/MisSolicitudesPage.tsx';
import { NuevaSolicitudPage } from '../pages/investigador/NuevaSolicitudPage.tsx';

import { ValidacionPage } from '../pages/gestion/ValidacionPage.tsx';
import { PanelSeguimientoPage } from '../pages/gestion/PanelSeguimientoPage.tsx';
import { AsignacionesPage } from '../pages/gestion/AsignacionesPage.tsx';
import { RevisionesPage } from '../pages/gestion/RevisionesPage.tsx';

import { SesionesPage } from '../pages/comite/SesionesPage.tsx';
import { DetalleSesionPage } from '../pages/comite/DetalleSesionPage.tsx';
import { ActasPage } from '../pages/comite/ActasPage.tsx';
import { ReportesPage } from '../pages/comite/ReportesPage.tsx';

import { UsuariosPage } from '../pages/admin/UsuariosPage.tsx';
import { GruposPage } from '../pages/admin/GruposPage.tsx';
import { CatalogoPage } from '../pages/admin/CatalogoPage.tsx';

import { DetalleSolicitudPage } from '../pages/compartidas/DetalleSolicitudPage.tsx';
import { NotificacionesPage } from '../pages/compartidas/NotificacionesPage.tsx';
import { PerfilPage } from '../pages/compartidas/PerfilPage.tsx';

// Redirección inteligente de la raíz "/" según el rol activo
function RedireccionRaiz() {
  const { user, isAuthenticated } = useSessionStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  const defaultPath = ROLE_HOME_PATHS[user.activeRole] || '/mis-solicitudes';
  return <Navigate to={defaultPath} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 1. Rutas Públicas (AuthLayout) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/register" element={<Navigate to="/registro" replace />} />
      </Route>

      {/* 2. Redirección Raíz */}
      <Route path="/" element={<RedireccionRaiz />} />

      {/* 3. Rutas Autenticadas Protegidas (AppLayout + RutaProtegida) */}
      <Route
        element={
          <RutaProtegida>
            <AppLayout />
          </RutaProtegida>
        }
      >
        {/* Rutas compartidas por todos los usuarios con sesión */}
        <Route path="/sin-acceso" element={<SinAccesoPage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/solicitudes/:id" element={<DetalleSolicitudPage />} />

        {/* Módulo Investigador */}
        <Route
          path="/mis-solicitudes"
          element={
            <RutaProtegida rolesPermitidos={['investigador']}>
              <MisSolicitudesPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/solicitudes/nueva"
          element={
            <RutaProtegida rolesPermitidos={['investigador']}>
              <NuevaSolicitudPage />
            </RutaProtegida>
          }
        />

        {/* Módulo Gestión Operativa */}
        <Route
          path="/validacion"
          element={
            <RutaProtegida rolesPermitidos={['administrativo', 'secretario']}>
              <ValidacionPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/panel"
          element={
            <RutaProtegida rolesPermitidos={['secretario', 'administrativo', 'lider']}>
              <PanelSeguimientoPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/revisiones"
          element={
            <RutaProtegida rolesPermitidos={['miembro_comite']}>
              <RevisionesPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/asignaciones"
          element={
            <RutaProtegida rolesPermitidos={['secretario']}>
              <AsignacionesPage />
            </RutaProtegida>
          }
        />

        {/* Módulo Comité & Actas */}
        <Route
          path="/sesiones"
          element={
            <RutaProtegida rolesPermitidos={['secretario', 'miembro_comite']}>
              <SesionesPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/sesiones/:id"
          element={
            <RutaProtegida rolesPermitidos={['secretario', 'miembro_comite']}>
              <DetalleSesionPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/actas"
          element={
            <RutaProtegida rolesPermitidos={['secretario', 'miembro_comite', 'lider']}>
              <ActasPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/reportes"
          element={
            <RutaProtegida rolesPermitidos={['secretario', 'lider', 'admin']}>
              <ReportesPage />
            </RutaProtegida>
          }
        />

        {/* Módulo Administración del Sistema */}
        <Route
          path="/admin/usuarios"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <UsuariosPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/grupos"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <GruposPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/catalogo"
          element={
            <RutaProtegida rolesPermitidos={['admin']}>
              <CatalogoPage />
            </RutaProtegida>
          }
        />

        {/* Redirecciones de conveniencia hacia rutas normalizadas */}
        <Route path="/catalog" element={<Navigate to="/admin/catalogo" replace />} />
        <Route path="/users" element={<Navigate to="/admin/usuarios" replace />} />
        <Route path="/groups" element={<Navigate to="/admin/grupos" replace />} />
      </Route>

      {/* Ruta comodín */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
