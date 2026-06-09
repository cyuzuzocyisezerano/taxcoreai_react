import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminSidebar.css'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Taxpayers', to: '/taxpayers' },
  { label: 'Documents', to: '/documents' },
  { label: 'Search & Retrieval', to: '/search-retrieval' },
  { label: 'Workflows', to: '/workflows' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Reports & Analytics', to: '/reports-analytics' },
  { label: 'AI Assistant', to: '/ai-assistant' },
  { label: 'Audit Logs', to: '/audit-logs' },
  { label: 'User Management', to: '/user-management' },
  { label: 'Settings', to: '/settings' },
]

interface AdminSidebarProps {
  role: string
  title: string
}

export function AdminSidebar({ role, title }: AdminSidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="admin-dashboard__sidebar" aria-label="Main navigation">
      <div className="admin-dashboard__brand">
        <div className="admin-dashboard__logo">RRA</div>
        <div>
          <strong>TaxCoreAI</strong>
          <p>Rwanda Revenue Authority</p>
        </div>
      </div>

      <div className="admin-dashboard__role-card">
        <span className="role-badge">{role}</span>
        <p>{title}</p>
      </div>

      <nav className="admin-dashboard__nav" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) =>
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
