import { logAudit } from '../services/audit.service.js'
import { rolePermissions } from './rbac-matrix.js'

function hasPermission(role, permissionKey) {
  const p = rolePermissions[role] || rolePermissions.Officer
  return Boolean(p?.[permissionKey])
}

/**
 * Authorize middleware.
 *
 * - Requires req.user.role to be present (set by authenticate middleware)
 * - On denial, writes an audit log entry.
 */
export function authorize({ permission, actionType } = {}) {
  return async (req, res, next) => {
    const role = req.user?.role
    const permissionKey = permission

    // If permission is missing, treat as public.
    if (!permissionKey) return next()

    const allowed = hasPermission(role, permissionKey)
    if (allowed) return next()

    try {
      await logAudit({
        action: actionType || 'PERMISSION_DENIED',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Denied ${permissionKey} for role ${role}`,
      })
    } catch {
      // ignore audit failures on auth path
    }

    return res.status(403).json({ error: 'Forbidden' })
  }
}

