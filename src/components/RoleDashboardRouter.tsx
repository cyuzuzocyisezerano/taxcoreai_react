import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * RoleDashboardRouter redirects users to their appropriate dashboard based on role
 */
export function RoleDashboardRouter() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-loading">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Map roles to their dashboard routes
  const dashboardMap: Record<string, string> = {
    Admin: '/admin',
    Officer: '/admin',
    Auditor: '/auditor',
    Supervisor: '/supervisor',
  }

  const dashboard = dashboardMap[user.role] || '/admin'
  return <Navigate to={dashboard} replace />
}
