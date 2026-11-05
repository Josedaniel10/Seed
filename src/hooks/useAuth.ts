import { useAuthStore } from '../features/auth/authStore.ts';
import { PERMISSIONS_MATRIX } from '../features/auth/permissions.ts';
import { UserRole } from '../types/database.ts';

export function useAuth() {
  const { profile, token, isAuthenticated, isLoading, error, login, logout, registerUser, clearError } =
    useAuthStore();

  const role: UserRole = profile?.role || 'investigador';
  const permissions = PERMISSIONS_MATRIX[role];

  const isAdmin = role === 'admin';
  const isSecretary = role === 'secretario';
  const isAdministrative = role === 'administrativo';
  const isCommitteeMember = role === 'integrante_comite';
  const isGroupLeader = role === 'lider_grupo';
  const isResearcher = role === 'investigador';

  const canAccessAdmin = isAdmin;
  const canAccessValidation = permissions.canValidateDocuments;
  const canAccessSessions = permissions.canManageSessions;

  return {
    profile,
    token,
    role,
    isAuthenticated,
    isLoading,
    error,
    permissions,
    isAdmin,
    isSecretary,
    isAdministrative,
    isCommitteeMember,
    isGroupLeader,
    isResearcher,
    canAccessAdmin,
    canAccessValidation,
    canAccessSessions,
    login,
    logout,
    registerUser,
    clearError,
  };
}
