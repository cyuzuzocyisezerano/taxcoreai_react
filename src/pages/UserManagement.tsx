import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type UserItem } from '../lib/api'
import './AdminDashboard.css'

export function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getUsers()
      .then((data) => setUsers(data))
      .catch((err) => setError(err?.message || 'Unable to load users'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">User Management</p>
            <h1>User Management</h1>
            <p className="admin-dashboard__hero-text">Manage system users, roles, and access permissions.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">Add User</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading users…</p>}

          {!loading && users.length === 0 && <p>No users found.</p>}

          {!loading && users.length > 0 && (
            <div className="admin-dashboard__table-wrap">
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.fullName}</td>
                      <td>{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
