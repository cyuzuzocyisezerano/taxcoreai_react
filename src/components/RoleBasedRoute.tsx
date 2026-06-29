import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasPermission, type Permissions } from '../lib/permissions'

interface RoleBasedRouteProps {
  children: React.ReactNode
  requiredPermission?: keyof Permissions
  allowedRoles?: string[]
}

/**
 * RoleBasedRoute protects routes based on user role and permissions
 */
export function RoleBasedRoute({
  children,
  requiredPermission,
  allowedRoles,
}: RoleBasedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Check if user role is in allowed list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location.pathname, reason: 'Insufficient role permissions' }}
      />
    )
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(user.role as any, requiredPermission)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location.pathname, reason: 'Insufficient permissions' }}
      />
    )
  }

  return children
}
