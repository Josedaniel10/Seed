import { UserRole, Request, Application } from '../../types/database.ts';

/**
 * Institutional permissions matrix based on user roles and RLS policies
 */
export interface RolePermissions {
  canFiling: boolean;
  canViewAllRequests: boolean;
  canViewAllApplications: boolean; // Alias
  canValidateDocuments: boolean;
  canAssignReviewers: boolean;
  canSubmitConcept: boolean;
  canManageSessions: boolean;
  canRecordDecisions: boolean;
  canManageCatalog: boolean;
  canManageUsers: boolean;
  isReadOnlyKanban: boolean;
}

export const PERMISSIONS_MATRIX: Record<string, RolePermissions> = {
  researcher: {
    canFiling: true,
    canViewAllRequests: false,
    canViewAllApplications: false,
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: true,
  },
  investigador: {
    canFiling: true,
    canViewAllRequests: false,
    canViewAllApplications: false,
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: true,
  },
  administrative: {
    canFiling: false,
    canViewAllRequests: true,
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
  administrativo: {
    canFiling: false,
    canViewAllRequests: true,
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
  committee_member: {
    canFiling: false,
    canViewAllRequests: true,
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
  integrante_comite: {
    canFiling: false,
    canViewAllRequests: true,
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
  miembro_comite: {
    canFiling: false,
    canViewAllRequests: true,
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
  secretary: {
    canFiling: false,
    canViewAllRequests: true,
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
  secretario: {
    canFiling: false,
    canViewAllRequests: true,
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
  leader: {
    canFiling: false,
    canViewAllRequests: false,
    canViewAllApplications: false,
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: true,
  },
  lider_grupo: {
    canFiling: false,
    canViewAllRequests: false,
    canViewAllApplications: false,
    canValidateDocuments: false,
    canAssignReviewers: false,
    canSubmitConcept: false,
    canManageSessions: false,
    canRecordDecisions: false,
    canManageCatalog: false,
    canManageUsers: false,
    isReadOnlyKanban: true,
  },
  lider: {
    canFiling: false,
    canViewAllRequests: false,
    canViewAllApplications: false,
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
    canViewAllRequests: true,
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
 * Checks whether a user has permission to view a specific request based on RLS rules
 */
export function canUserViewRequest(
  userRole: UserRole,
  userId: string,
  userGroupId: string | null,
  request: Request
): boolean {
  if (
    userRole === 'admin' ||
    userRole === 'secretary' ||
    userRole === 'secretario' ||
    userRole === 'administrative' ||
    userRole === 'administrativo' ||
    userRole === 'committee_member' ||
    userRole === 'integrante_comite' ||
    userRole === 'miembro_comite'
  ) {
    return true;
  }
  if (userRole === 'researcher' || userRole === 'investigador') {
    return request.applicant_id === userId;
  }
  if (userRole === 'leader' || userRole === 'lider_grupo' || userRole === 'lider') {
    return request.research_group_id === userGroupId;
  }
  return false;
}

export const canUserViewApplication = canUserViewRequest;
