import { useAuth } from '../context/AuthContext'

/**
 * Get the default dashboard route for a user based on their role
 */
export function useDefaultDashboard() {
  const { user } = useAuth()

  if (!user) return '/login'

  const dashboardMap: Record<string, string> = {
    Admin: '/admin',
    Officer: '/admin',
    Auditor: '/auditor',
    Supervisor: '/supervisor',
  }

  return dashboardMap[user.role] || '/admin'
}
