# Role-Based Access Control (RBAC) System - TaxCoreAI

## Overview

The TaxCoreAI system now includes a comprehensive role-based access control (RBAC) system with four distinct user roles, each with specific permissions and dedicated dashboards:

1. **Admin** - Full system access and control
2. **Officer** - Taxpayer management and document processing
3. **Auditor** - View-only access for audit purposes
4. **Supervisor** - Approval authority with limited creation capabilities

---

## Test Credentials

Use these credentials to test each role:

| Username | Password | Role | Dashboard | Title |
|----------|----------|------|-----------|-------|
| admin | password | Admin | /admin | System Administrator |
| officer | password | Officer | /admin | Taxpayer Officer |
| auditor | password | Auditor | /auditor | Tax Auditor |
| supervisor | password | Supervisor | /supervisor | Audit Supervisor |

---

## Role Definitions

### Admin Role
- **Access Level**: Full system access
- **Dashboard**: `/admin` (AdminDashboard)
- **Key Permissions**:
  - ✓ View all dashboard statistics
  - ✓ Add/Edit/Delete taxpayers
  - ✓ Add/Edit/Delete documents
  - ✓ Create and manage workflows
  - ✓ Approve documents and workflows
  - ✓ Generate reports
  - ✓ Manage users (add/edit/delete)
  - ✓ Access audit logs
  - ✓ Configure system settings

### Officer Role
- **Access Level**: Standard operational access
- **Dashboard**: `/admin` (same as Admin for now, but restricted features)
- **Key Permissions**:
  - ✓ View dashboard statistics
  - ✓ Add/Edit taxpayers (but NOT delete)
  - ✓ Add/Edit documents (but NOT delete)
  - ✓ Create and manage workflows
  - ✓ Approve documents and workflows
  - ✓ Generate reports
  - ✗ Cannot manage users
  - ✗ Cannot access audit logs
  - ✗ Cannot change settings

### Auditor Role
- **Access Level**: READ-ONLY audit access
- **Dashboard**: `/auditor` (AuditorDashboard)
- **Key Permissions**:
  - ✓ View all taxpayer records
  - ✓ View all documents
  - ✓ View workflows (cannot modify)
  - ✓ Generate audit-specific reports
  - ✓ Access audit logs
  - ✓ View notifications
  - ✗ **Cannot add any records**
  - ✗ **Cannot edit any records**
  - ✗ **Cannot delete any records**
  - ✗ **Cannot approve or reject items**
  - ✗ **Cannot manage users**

**Use Case**: Auditors can review records, track changes through audit logs, and generate compliance reports without the ability to modify data.

### Supervisor Role
- **Access Level**: Limited approval authority
- **Dashboard**: `/supervisor` (SupervisorDashboard)
- **Key Permissions**:
  - ✓ View taxpayer records
  - ✓ View documents
  - ✓ **Approve documents and workflows**
  - ✓ View workflows
  - ✓ Generate reports
  - ✓ View notifications
  - ✗ **Cannot add users**
  - ✗ **Cannot add documents** (must be added by Officer)
  - ✗ **Cannot create taxpayers** (must be created by Officer)
  - ✗ **Cannot edit existing records** (must be edited by Officer)
  - ✗ **Cannot access audit logs**
  - ✗ **Cannot manage system settings**

**Use Case**: Supervisors oversee workflows and provide approvals without the ability to add new users, documents, or modify existing records.

---

## Navigation Structure

### Role-Based Dashboard Routing

When users log in, they are automatically redirected to their appropriate dashboard:

```
Admin/Officer → /admin → AdminDashboard
Auditor → /auditor → AuditorDashboard  
Supervisor → /supervisor → SupervisorDashboard
```

Each dashboard:
- Displays role-specific information
- Shows limited action buttons based on permissions
- Uses a custom sidebar with role-specific navigation
- Displays permission restrictions clearly to the user

### Navigation Sidebars

Each role has a customized sidebar:

**AdminSidebar** (Admin & Officer):
- Dashboard, Taxpayers, Documents, Search & Retrieval
- Workflows, Notifications, Reports & Analytics
- AI Assistant, Audit Logs, User Management, Settings

**AuditorSidebar**:
- Dashboard, Taxpayers, Documents, Workflows
- Reports & Analytics, Audit Logs, Notifications

**SupervisorSidebar**:
- Dashboard, Taxpayers, Documents, Workflows
- Reports & Analytics, Notifications

---

## Permission System Implementation

### Permissions Structure (src/lib/permissions.ts)

```typescript
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
  // ... and more
}
```

### Using Permissions in Components

```typescript
import { hasPermission, getPermissions } from '../lib/permissions'

// Check specific permission
if (hasPermission(user.role, 'canAddTaxpayers')) {
  // Show add taxpayer button
}

// Get all permissions for a role
const permissions = getPermissions(user.role)
```

---

## File Structure

### New Files Created

```
src/
├── lib/
│   └── permissions.ts              # Permission system definitions
├── hooks/
│   └── useDefaultDashboard.ts       # Hook for role-based dashboard routing
├── components/
│   ├── AuditorSidebar.tsx          # Auditor navigation sidebar
│   ├── SupervisorSidebar.tsx       # Supervisor navigation sidebar
│   ├── RoleBasedRoute.tsx          # Protected route with role checks
│   └── RoleDashboardRouter.tsx     # Route redirector based on role
└── pages/
    ├── AuditorDashboard.tsx         # Read-only audit dashboard
    ├── SupervisorDashboard.tsx      # Approval-focused dashboard
    └── UnauthorizedPage.tsx         # 403 error page
```

### Modified Files

```
server/src/data/db.json             # Added Auditor and Supervisor users
src/App.tsx                         # Added new routes
src/pages/LoginPage.tsx             # Role-based redirect after login
```

---

## Key Features

### View-Only Audit Access (Auditor)

Auditors can:
- Review all taxpayer data without modifying it
- Track changes through audit logs
- Generate compliance reports
- Monitor workflow status

Auditors cannot:
- Create new records
- Modify existing records
- Delete records
- Approve or reject workflows
- Add users

### Approval-Based Supervision (Supervisor)

Supervisors can:
- Review and approve documents
- Review and approve workflows
- Access all workflow and document information
- Generate reports
- View audit trails

Supervisors cannot:
- Add new users
- Upload documents (must come from Officers)
- Create new taxpayers
- Modify system settings
- Access detailed audit logs

---

## Authentication Flow

1. User logs in with credentials
2. Server validates credentials and returns JWT token
3. Frontend stores token in localStorage
4. User role is extracted from token
5. LoginPage redirects to appropriate dashboard:
   - Admin/Officer → `/admin`
   - Auditor → `/auditor`
   - Supervisor → `/supervisor`

---

## Security Considerations

1. **Frontend Validation**: Permission checks provide UI feedback
2. **Backend Validation**: All API calls should validate permissions server-side (important!)
3. **JWT Token**: Includes user role for quick client-side checks
4. **Audit Logging**: Critical actions are logged for compliance
5. **Read-Only Views**: Auditor UI fully disables modification options

### Important: Backend Permission Checks

The current implementation includes frontend permission checks. For production:
- **Implement server-side permission validation** on all API endpoints
- Check user role and permissions before processing any data modifications
- Log all permission denials for security auditing
- Never rely solely on frontend permission checks

---

## Future Enhancements

1. **Dynamic Permissions**: Allow admins to customize permissions per role
2. **Department-Based Access**: Restrict access based on department/team
3. **Time-Based Permissions**: Temporary elevated access for specific tasks
4. **Fine-Grained Controls**: Document-level or record-level permissions
5. **Permission Audit Trail**: Track all permission changes and denials
6. **Role-Based Features**: Show/hide features based on role capabilities
7. **Custom Dashboards**: Allow roles to customize their dashboard layout

---

## Troubleshooting

### User redirects to wrong dashboard
- Check user's role in database (server/src/data/db.json)
- Verify role is returned correctly from `/auth/me` endpoint
- Clear browser cache and localStorage

### Permission-based button not showing
- Verify permission name matches `Permissions` interface
- Check that `hasPermission()` function is imported correctly
- Verify role name matches database role exactly (case-sensitive)

### Audit logs not visible to Auditor
- Confirm Auditor role has `canViewAuditLogs: true` in permissions.ts
- Check that audit logs are being populated in the system
- Verify AuditLogs component doesn't have additional permission checks

---

## Database Schema for Users

```json
{
  "id": "user-auditor",
  "username": "auditor",
  "passwordHash": "hashed_password",
  "name": "Pierre Mukandayire",
  "role": "Auditor",
  "title": "Tax Auditor"
}
```

---

## Next Steps for Implementation

1. **Implement backend permission checks** on all API endpoints
2. **Add permission checks to existing pages** (Documents, Taxpayers, etc.)
3. **Disable form fields** on pages visited by read-only users
4. **Add permission error handling** for API calls
5. **Create permission matrix documentation** for your organization
6. **Train users** on their role-specific capabilities and limitations

---

## Support

For issues or questions about the role-based access control system, refer to:
- `src/lib/permissions.ts` - Permission definitions
- `src/components/RoleBasedRoute.tsx` - Protected route implementation
- Dashboard components for UI patterns
