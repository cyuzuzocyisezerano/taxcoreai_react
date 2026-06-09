import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type WorkflowItem } from '../lib/api'
import './AdminDashboard.css'

export function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getWorkflows()
      .then((data) => setWorkflows(data.workflows))
      .catch((err) => setError(err?.message || 'Unable to load workflows'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Workflows</p>
            <h1>Workflow Management</h1>
            <p className="admin-dashboard__hero-text">Track, assign, and manage taxpayer review workflows.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">New Workflow</button>
            <button className="btn btn-secondary">View All</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading workflows…</p>}
          {!loading && workflows.length === 0 && <p>No workflow items found.</p>}

          {!loading && workflows.length > 0 && (
            <div className="admin-dashboard__table-wrap">
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Stage</th>
                    <th>Owner</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => (
                    <tr key={workflow.id}>
                      <td>{workflow.title}</td>
                      <td>{workflow.stage}</td>
                      <td>{workflow.owner}</td>
                      <td>{workflow.dueDate}</td>
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
