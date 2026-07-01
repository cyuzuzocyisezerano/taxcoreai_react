import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasPermission, type UserRole } from '../lib/permissions'
import './AdminSidebar.css'

interface NavItem {
  label: string
  to: string
  permission?: keyof import('../lib/permissions').Permissions
}

const AUDITOR_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/auditor' },
  { label: 'Taxpayers', to: '/taxpayers', permission: 'canViewTaxpayers' },
  { label: 'Documents', to: '/documents', permission: 'canViewDocuments' },
  { label: 'Workflows', to: '/workflows', permission: 'canViewWorkflows' },
  { label: 'Reports & Analytics', to: '/reports-analytics', permission: 'canViewReports' },
  { label: 'Audit Logs', to: '/audit-logs', permission: 'canViewAuditLogs' },
  { label: 'Notifications', to: '/notifications' },
]

interface AuditorSidebarProps {
  role: string
  title: string
}

export function AuditorSidebar({ role, title }: AuditorSidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Filter nav items based on user permissions
  const visibleItems = AUDITOR_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true
    return hasPermission(role as UserRole, item.permission)
  })

  return (
    <aside className="admin-dashboard__sidebar" aria-label="Main navigation">
      <div className="admin-dashboard__brand">
        <div className="admin-dashboard__logo"><img src="/RRA LOGO.png" alt="RRA Logo" /></div>
        <div>
          <strong>TaxCoreAI</strong>
          <p>Rwanda Revenue Authority</p>
        </div>
      </div>

      <div className="admin-dashboard__role-card">
        <span className="role-badge">
          {role}
        </span>
        <p>{title}</p>
      </div>

      <nav className="admin-dashboard__nav" aria-label="Dashboard sections">
        {visibleItems.map((item) =>
          item.to.startsWith('/') ? (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                `admin-dashboard__nav-item${isActive ? ' admin-dashboard__nav-item--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ) : (
            <a key={item.label} className="admin-dashboard__nav-item" href={item.to}>
              {item.label}
            </a>
          ),
        )}
      </nav>

      <div className="admin-dashboard__sidebar-footer">
        <button type="button" className="btn btn-secondary btn-ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  )
}
