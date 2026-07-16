import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type UserItem } from '../lib/api'
import './AdminDashboard.css'

export function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ username: '', fullName: '', email: '', password: '', role: 'Officer' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const loadUsers = () => {
    setLoading(true)
    api.getUsers()
      .then((data) => setUsers(data))
      .catch((err) => setError(err?.message || 'Unable to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await api.createUser(formData)
      setFormData({ username: '', fullName: '', email: '', password: '', role: 'Officer' })
      setShowForm(false)
      loadUsers()
      setSuccess('User created successfully')
      setTimeout(() => setSuccess(null), 4000)
      // notify other pages (e.g., Audit Logs) to refresh
      try {
        window.dispatchEvent(new CustomEvent('audit:refresh', { detail: { action: 'USER_CREATE' } }))
      } catch {
        // ignore in older browsers
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to create user')
    } finally {
      setSubmitting(false)
    }
  }

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
            <button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}>Add User</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {success && (
            <div className="user-success" role="status">
              {success}
            </div>
          )}
          {error && <div className="error">{error}</div>}

          {showForm && (
            <form onSubmit={handleSubmit} className="card user-form" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>Create New User</h3>
              <div className="input-row" style={{ gap: 12 }}>
                <div>
                  <label className="form-label">Username</label>
                  <input required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="e.g. jdoe" />
                </div>
                <div>
                  <label className="form-label">Full name</label>
                  <input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="e.g. Jane Doe" />
                </div>
              </div>
              <div className="input-row" style={{ gap: 12, marginTop: 12 }}>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@company.com" />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input required type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter a secure password" />
                </div>
              </div>
              <div className="input-row" style={{ gap: 12, marginTop: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="Officer">Officer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="user-form__actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create User'}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

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
                      <td>{(user as any).fullName || (user as any).name || '-'}</td>
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
