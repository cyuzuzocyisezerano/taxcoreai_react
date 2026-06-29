/**
 * Role-based permission system for TaxCoreAI
 */

export type UserRole = 'Admin' | 'Officer' | 'Auditor' | 'Supervisor'

export interface Permissions {
  canViewDashboard: boolean
  canViewTaxpayers: boolean
  canAddTaxpayers: boolean
  canEditTaxpayers: boolean
  canDeleteTaxpayers: boolean
  canViewDocuments: boolean
  canAddDocuments: boolean
  canEditDocuments: boolean
  canDeleteDocuments: boolean
  canApproveDocuments: boolean
  canViewWorkflows: boolean
  canCreateWorkflows: boolean
  canEditWorkflows: boolean
  canApproveWorkflows: boolean
  canViewReports: boolean
  canGenerateReports: boolean
  canViewUsers: boolean
  canAddUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canViewAuditLogs: boolean
  canViewNotifications: boolean
  canViewSettings: boolean
  canEditSettings: boolean
}

const PERMISSIONS: Record<UserRole, Permissions> = {
  Admin: {
    canViewDashboard: true,
    canViewTaxpayers: true,
    canAddTaxpayers: true,
    canEditTaxpayers: true,
    canDeleteTaxpayers: true,
    canViewDocuments: true,
    canAddDocuments: true,
    canEditDocuments: true,
    canDeleteDocuments: true,
    canApproveDocuments: true,
    canViewWorkflows: true,
    canCreateWorkflows: true,
    canEditWorkflows: true,
    canApproveWorkflows: true,
    canViewReports: true,
    canGenerateReports: true,
    canViewUsers: true,
    canAddUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canViewAuditLogs: true,
    canViewNotifications: true,
    canViewSettings: true,
    canEditSettings: true,
  },
  Officer: {
    canViewDashboard: true,
    canViewTaxpayers: true,
    canAddTaxpayers: true,
    canEditTaxpayers: true,
    canDeleteTaxpayers: false,
    canViewDocuments: true,
    canAddDocuments: true,
    canEditDocuments: true,
    canDeleteDocuments: false,
    canApproveDocuments: true,
    canViewWorkflows: true,
    canCreateWorkflows: true,
    canEditWorkflows: true,
    canApproveWorkflows: true,
    canViewReports: true,
    canGenerateReports: true,
    canViewUsers: false,
    canAddUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewAuditLogs: false,
    canViewNotifications: true,
    canViewSettings: false,
    canEditSettings: false,
  },
  Auditor: {
    canViewDashboard: true,
    canViewTaxpayers: true,
    canAddTaxpayers: false,
    canEditTaxpayers: false,
    canDeleteTaxpayers: false,
    canViewDocuments: true,
    canAddDocuments: false,
    canEditDocuments: false,
    canDeleteDocuments: false,
    canApproveDocuments: false,
    canViewWorkflows: true,
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canApproveWorkflows: false,
    canViewReports: true,
    canGenerateReports: false,
    canViewUsers: false,
    canAddUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewAuditLogs: true,
    canViewNotifications: true,
    canViewSettings: false,
    canEditSettings: false,
  },
  Supervisor: {
    canViewDashboard: true,
    canViewTaxpayers: true,
    canAddTaxpayers: false,
    canEditTaxpayers: false,
    canDeleteTaxpayers: false,
    canViewDocuments: true,
    canAddDocuments: false,
    canEditDocuments: false,
    canDeleteDocuments: false,
    canApproveDocuments: true,
    canViewWorkflows: true,
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canApproveWorkflows: true,
    canViewReports: true,
    canGenerateReports: false,
    canViewUsers: false,
    canAddUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewAuditLogs: false,
    canViewNotifications: true,
    canViewSettings: false,
    canEditSettings: false,
  },
}

/**
 * Get permissions for a specific role
 */
export function getPermissions(role: UserRole): Permissions {
  return PERMISSIONS[role] || PERMISSIONS.Officer
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof Permissions): boolean {
  return getPermissions(role)[permission] ?? false
}

/**
 * Check if role can access a feature
 */
export function canAccess(role: UserRole, feature: string): boolean {
  const permissionKey = `can${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof Permissions
  return hasPermission(role, permissionKey)
}
