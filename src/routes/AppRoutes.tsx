import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout.tsx';
import { LoginPage } from '../features/auth/pages/LoginPage.tsx';
import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.tsx';
import { CatalogPage } from '../features/catalog/pages/CatalogPage.tsx';
import { UsersPage } from '../features/users/pages/UsersPage.tsx';
import { GroupsPage } from '../features/groups/pages/GroupsPage.tsx';
import { ValidationPage } from '../features/validation/pages/ValidationPage.tsx';
import { SessionsPage } from '../features/sessions/pages/SessionsPage.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';

export function AppRoutes() {
  return (
    <Routes>
      {/* Auth Public Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes: Users must login before viewing any of these */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="validation" element={<ValidationPage />} />
        <Route path="sessions" element={<SessionsPage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
