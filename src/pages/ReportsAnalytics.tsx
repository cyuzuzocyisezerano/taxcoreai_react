import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DashboardStats, type ReportItem } from '../lib/api'
import './AdminDashboard.css'

export function ReportsAnalytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getDashboardStats(), api.getReports()])
      .then(([statsData, reportsData]) => {
        setStats(statsData)
        setReports(reportsData.reports)
      })
      .catch((err) => setError(err?.message || 'Unable to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Reports & Analytics</p>
            <h1>Reports & Analytics</h1>
            <p className="admin-dashboard__hero-text">Review system metrics, compliance trends, and reporting dashboards.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">Generate Report</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading report data…</p>}

          {!loading && stats && (
            <div className="report-summary-grid">
              <div className="summary-card summary-card--primary">
                <p>Total Taxpayers</p>
                <strong>{stats.totalTaxpayers}</strong>
              </div>
              <div className="summary-card summary-card--success">
                <p>Active Taxpayers</p>
                <strong>{stats.activeTaxpayers}</strong>
              </div>
              <div className="summary-card summary-card--accent">
                <p>Total Documents</p>
                <strong>{stats.totalDocuments}</strong>
              </div>
              <div className="summary-card summary-card--warning">
                <p>Pending Workflows</p>
                <strong>{stats.pendingWorkflows}</strong>
              </div>
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div className="report-list">
              <h2>Recent Reports</h2>
              <ul>
                {reports.map((report) => (
                  <li key={report.id} className="report-item">
                    <strong>{report.name}</strong>
                    <span>{report.type}</span>
                    <p>{new Date(report.generatedAt).toLocaleString()}</p>
                    <span>{report.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && reports.length === 0 && <p>No reports available yet.</p>}
        </section>
      </main>
    </div>
  )
}
