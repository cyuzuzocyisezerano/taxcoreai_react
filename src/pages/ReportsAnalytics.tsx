import { useEffect, useMemo, useRef, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DashboardStats, type ReportItem } from '../lib/api'
import './AdminDashboard.css'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'

export function ReportsAnalytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [reports, setReports] = useState<ReportItem[]>([])
  const [districts, setDistricts] = useState<{ district: string; count: number }[]>([])
  const [docDistribution, setDocDistribution] = useState<{ type: string; count: number }[]>([])
  const [regTrend, setRegTrend] = useState<{ key: string; label: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getDashboardStats(),
      api.getReports(),
      api.getDistrictCounts(),
      api.getDocumentDistribution(),
      api.getRegistrationTrend(),
    ])
      .then(([statsData, reportsData, districtsData, docsData, trendData]) => {
        setStats(statsData)
        setReports(reportsData.reports)
        setDistricts(districtsData.districts || [])
        setDocDistribution(docsData.distribution || [])
        setRegTrend(trendData.trend || [])
      })
      .catch((err) => setError(err?.message || 'Unable to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  // refs for export
  const districtsRef = useRef<HTMLDivElement | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const trendRef = useRef<HTMLDivElement | null>(null)

  function downloadCSV(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function exportCSV(kind: 'districts' | 'documents' | 'trend') {
    try {
      if (kind === 'districts') {
        const txt = await api.getDistrictsCSV()
        downloadCSV(txt, 'districts.csv')
      } else if (kind === 'documents') {
        const txt = await api.getDocumentDistributionCSV()
        downloadCSV(txt, 'document-distribution.csv')
      } else {
        const txt = await api.getRegistrationTrendCSV()
        downloadCSV(txt, 'registration-trend.csv')
      }
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  function exportPNG(ref: HTMLDivElement | null, filename: string) {
    if (!ref) return
    const svg = ref.querySelector('svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    const bbox = svg.getBBox()
    canvas.width = Math.ceil(bbox.width) || 800
    canvas.height = Math.ceil(bbox.height) || 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
      })
    }
    img.onerror = (e) => {
      console.error('SVG to Image error', e)
    }
    img.src = url
  }

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
            <button 
              className="btn btn-primary" 
              onClick={async () => {
                try {
                  setGeneratingReport(true)
                  // Generate a summary report using existing loaded data
                  const timestamp = new Date().toISOString().split('T')[0]
                  const csvContent = [
                    '=== TAXCOREAI ANALYTICS REPORT ===',
                    `Generated: ${new Date().toLocaleString()}`,
                    '',
                    '=== TAXPAYER SUMMARY ===',
                    `Total Taxpayers: ${stats?.totalTaxpayers ?? 0}`,
                    `Active: ${stats?.activeTaxpayers ?? 0}`,
                    '',
                    '=== DOCUMENT SUMMARY ===',
                    `Total Documents: ${stats?.totalDocuments ?? 0}`,
                    '',
                    '=== WORKFLOW SUMMARY ===',
                    `Pending Tasks: ${stats?.pendingWorkflows ?? 0}`,
                    '',
                    '=== DISTRICT BREAKDOWN ===',
                    'District,Count',
                    ...(districts.map(d => `${d.district},${d.count}`)),
                    '',
                    '=== DOCUMENT TYPES ===',
                    'Type,Count',
                    ...(docDistribution.map(d => `${d.type},${d.count}`)),
                    '',
                    '=== REGISTRATION TREND ===',
                    'Month,Count',
                    ...(regTrend.map(m => `${m.label},${m.count}`))
                  ].join('\n')

                  downloadCSV(csvContent, `taxcoreai-report-${timestamp}.csv`)
                  alert('Report generated successfully!')
                } catch (err) {
                  console.error('Failed to generate report:', err)
                  alert('Failed to generate report. Please try again.')
                } finally {
                  setGeneratingReport(false)
                }
              }}
              disabled={generatingReport}
            >
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </header>

        <section className="admin-dashboard__content-card reports-analytics">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading report data…</p>}

          {!loading && stats && (
            <>
              <div className="analytics-summary-cards">
                <div className="analytics-card blue">
                  <div className="analytics-card__value">{stats.totalTaxpayers}</div>
                  <div className="analytics-card__label">Total Taxpayers</div>
                </div>
                <div className="analytics-card green">
                  <div className="analytics-card__value">{stats.activeTaxpayers}</div>
                  <div className="analytics-card__label">Active</div>
                </div>
                <div className="analytics-card red">
                  <div className="analytics-card__value">{stats.flaggedRecords ?? 0}</div>
                  <div className="analytics-card__label">Flagged</div>
                </div>
                <div className="analytics-card purple">
                  <div className="analytics-card__value">{stats.totalDocuments}</div>
                  <div className="analytics-card__label">Documents</div>
                </div>
                <div className="analytics-card orange">
                  <div className="analytics-card__value">{stats.pendingWorkflows}</div>
                  <div className="analytics-card__label">Pending Tasks</div>
                </div>
                <div className="analytics-card teal">
                  <div className="analytics-card__value">5</div>
                  <div className="analytics-card__label">Completed Tasks</div>
                </div>
              </div>

              {/* derived datasets for charts */}
              <div className="analytics-grid">
                <div className="analytics-left">
                  <div className="card chart-card" ref={districtsRef}>
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h2>Taxpayers by District (Top 10)</h2>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => exportCSV('districts')}>Export CSV</button>
                        <button className="btn btn-ghost" onClick={() => exportPNG(districtsRef.current, 'districts.png')}>Export PNG</button>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={districts.map((d) => ({ name: d.district, value: d.count }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#2563eb" radius={[6,6,6,6]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card stats-row">
                    <div className="small-card">
                      <h3>Taxpayer Types</h3>
                      <div className="small-card__content">Individual 12 — Business 35</div>
                    </div>
                    <div className="small-card">
                      <h3>Tax Categories</h3>
                      <div className="small-card__content">Small 16 — Medium 14 — Large 7</div>
                    </div>
                    <div className="small-card">
                      <h3>Workflow Status</h3>
                      <div className="small-card__content">Pending 9 — In Progress 2 — Completed 5</div>
                    </div>
                  </div>
                </div>

                <aside className="analytics-right">
                  <div className="card" ref={docsRef}>
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h2>Document Types Distribution</h2>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => exportCSV('documents')}>Export CSV</button>
                        <button className="btn btn-ghost" onClick={() => exportPNG(docsRef.current, 'documents.png')}>Export PNG</button>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            dataKey="count"
                            data={docDistribution.map((d) => ({ name: d.type, count: d.count }))}
                            innerRadius={36}
                            outerRadius={64}
                            paddingAngle={4}
                          >
                            {docDistribution.map((_, i) => (
                              <Cell key={i} fill={["#1d4ed8", "#7c3aed", "#f59e0b", "#06b6d4", "#10b981"][i % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header"><h2>Top Taxpayer Districts</h2></div>
                    <div className="chart-placeholder small">
                      {districts.slice(0, 8).map((d) => (
                        <div key={d.district} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                          <span>{d.district}</span>
                          <strong>{d.count}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>

              <div className="card large-chart" ref={trendRef}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2>Taxpayer Registration Trend (Last 12 Months)</h2>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => exportCSV('trend')}>Export CSV</button>
                    <button className="btn btn-ghost" onClick={() => exportPNG(trendRef.current, 'registration-trend.png')}>Export PNG</button>
                  </div>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={regTrend.map((m) => ({ month: m.label, value: m.count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ml-summary">
                <div className="ml-summary__inner">
                  <div className="ml-item">
                    <strong>Document Classifier</strong>
                    <div className="ml-value">F1 0.92</div>
                    <div className="ml-sub">Document type model</div>
                  </div>
                  <div className="ml-item">
                    <strong>Compliance Scorer</strong>
                    <div className="ml-value">MAE 0.14</div>
                    <div className="ml-sub">Risk scoring</div>
                  </div>
                  <div className="ml-item">
                    <strong>Anomaly Detector</strong>
                    <div className="ml-value">AUC 0.94</div>
                    <div className="ml-sub">Unusual activity</div>
                  </div>
                  <div className="ml-item">
                    <strong>Risk Engine</strong>
                    <div className="ml-value">FPR 0.06</div>
                    <div className="ml-sub">Audit + filing risk</div>
                  </div>
                </div>
              </div>
            </>
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
