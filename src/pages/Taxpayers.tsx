import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export function Taxpayers() {
  const { user } = useAuth()
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    console.log('Loading taxpayers with filters:', { search, statusFilter, typeFilter })
    api
      .getTaxpayers({
        q: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      })
      .then((data) => {
        console.log('Taxpayers loaded:', data)
        setTaxpayers(data.taxpayers)
        setTotal(data.total)
      })
      .catch((err) => {
        console.error('Failed to load taxpayers:', err)
      })
  }, [search, statusFilter, typeFilter])

  const role = user?.role ?? 'Admin'
  const title = user?.title ?? 'System Administrator'

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={role} title={title} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Taxpayers</p>
            <h1>Taxpayer Registry</h1>
            <p className="admin-dashboard__hero-text">{total} taxpayers found</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <Link to="/taxpayers/register" className="btn btn-primary">
              Register Taxpayer
            </Link>
            <button className="btn btn-secondary" type="button">Export</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          <div className="taxpayer-filters">
            <input
              type="search"
              placeholder="Search by name, TIN, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending">Pending</option>
              <option value="Flagged">Flagged</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Business">Business</option>
              <option value="Individual">Individual</option>
              <option value="Organization">Organization</option>
            </select>
          </div>

          <div className="admin-dashboard__table-wrap">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Taxpayer</th>
                  <th>TIN</th>
                  <th>Type</th>
                  <th>District</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxpayers.map((taxpayer) => (
                  <tr key={taxpayer.id}>
                    <td>
                      {taxpayer.name}
                      <span>{taxpayer.alias}</span>
                    </td>
                    <td>{taxpayer.tin}</td>
                    <td>{taxpayer.type}</td>
                    <td>{taxpayer.district}</td>
                    <td>
                      <span className={`status status--${taxpayer.status.toLowerCase()}`}>
                        {taxpayer.status}
                      </span>
                    </td>
                    <td>{taxpayer.registered}</td>
                    <td>
                      <Link to={`/taxpayers/${taxpayer.id}`} className="btn btn-ghost">
                        View
                      </Link>
                      <Link to={`/taxpayers/${taxpayer.id}`} className="btn btn-ghost">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
