import { UserRole, Application } from '../../types/database.ts';

/**
 * Matriz de permisos institucional de Seed basada en roles y políticas RLS
 */
export const PERMISSIONS_MATRIX: Record<
  UserRole,
  {
    canFiling: boolean;
    canViewAllApplications: boolean;
    canValidateDocuments: boolean;
    canAssignReviewers: boolean;
    canSubmitConcept: boolean;
    canManageSessions: boolean;
    canRecordDecisions: boolean;
    canManageCatalog: boolean;
    canManageUsers: boolean;
    isReadOnlyKanban: boolean;
  }
> = {
  investigador: {
    canFiling: true,
    canViewAllApplications: false,
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: true, // El investigador ve el tablero en solo lectura
  },
  administrativo: {
    canFiling: false,
    canViewAllApplications: true,
    canValidateDocuments: true,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: false,
  },
  integrante_comite: {
    canFiling: false,
    canViewAllApplications: true,
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: true,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: false,
  },
  secretario: {
    canFiling: false,
    canViewAllApplications: true,
    canValidateDocuments: true,
    canAssignReviewers: true,
    canSubmitConcept: true,
    canManageSessions: true,
    canRecordDecisions: true,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: false,
  },
  lider_grupo: {
    canFiling: false,
    canViewAllApplications: false, // Solo ve las de su grupo
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: true,
  },
  admin: {
    canFiling: true,
    canViewAllApplications: true,
    canValidateDocuments: true,
    canAssignReviewers: true,
    canSubmitConcept: true,
    canManageSessions: true,
    canRecordDecisions: true,
    canManageCatalog: true,
    canManageUsers: true,
    isReadOnlyKanban: false,
  },
};

/**
 * Función que evalúa si un usuario puede visualizar una solicitud específica según las reglas RLS
 */
export function canUserViewApplication(
  userRole: UserRole,
  userId: string,
  userGroupId: string | null,
  application: Application
): boolean {
  if (userRole === 'admin' || userRole === 'secretario' || userRole === 'administrativo' || userRole === 'integrante_comite') {
    return true;
  }
  if (userRole === 'investigador') {
    return application.applicant_id === userId;
  }
  if (userRole === 'lider_grupo') {
    return application.research_group_id === userGroupId;
  }
  return false;
}
