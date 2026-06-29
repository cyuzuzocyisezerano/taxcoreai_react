import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { hasPermission, type UserRole } from '../lib/permissions'
import { api } from '../lib/api'
import './AdminSidebar.css'

interface NavItem {
  label: string
  to: string
  permission?: keyof import('../lib/permissions').Permissions
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Taxpayers', to: '/taxpayers', permission: 'canViewTaxpayers' },
  { label: 'Documents', to: '/documents', permission: 'canViewDocuments' },
  { label: 'Search & Retrieval', to: '/search-retrieval', permission: 'canViewDocuments' },
  { label: 'Workflows', to: '/workflows', permission: 'canViewWorkflows' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Reports & Analytics', to: '/reports-analytics', permission: 'canViewReports' },
  { label: 'Integrations', to: '/integrations', permission: 'canViewSettings' },
  { label: 'Monitoring', to: '/monitoring', permission: 'canViewSettings' },
  { label: 'AI Assistant', to: '/ai-assistant', permission: 'canViewDocuments' },
  { label: 'Audit Logs', to: '/audit-logs', permission: 'canViewAuditLogs' },
  { label: 'User Management', to: '/user-management', permission: 'canViewUsers' },
  { label: 'Settings', to: '/settings', permission: 'canViewSettings' },
]

interface AdminSidebarProps {
  role?: string
  title?: string
}

export function AdminSidebar({ role, title }: AdminSidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const effectiveRole = (user?.role ?? role ?? 'Officer') as UserRole
  const effectiveTitle = user?.title ?? title ?? 'Taxpayer Officer'
  const [unreadCount, setUnreadCount] = useState(0)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Filter nav items based on user permissions
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true
    return hasPermission(effectiveRole, item.permission)
  })

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await api.getUnreadCount()
        setUnreadCount(data.unreadCount)
      } catch (err) {
        // Silently fail - user may not be logged in
      }
    }
    loadUnreadCount()
  }, [])

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
        <span className="role-badge">{effectiveRole}</span>
        <p>{effectiveTitle}</p>
      </div>

      <nav className="admin-dashboard__nav" aria-label="Dashboard sections">
        {visibleItems.map((item) => {
          const isNotifications = item.to === '/notifications'
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                `admin-dashboard__nav-item${isActive ? ' admin-dashboard__nav-item--active' : ''}`
              }
            >
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                {item.label}
                {isNotifications && unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="admin-dashboard__sidebar-footer">
        <button type="button" className="btn btn-secondary btn-ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  )
}
