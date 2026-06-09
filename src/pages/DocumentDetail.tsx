import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DocumentItem } from '../lib/api'
import './AdminDashboard.css'

export function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [document, setDocument] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        const res = await api.getDocument(id)
        if (mounted) setDocument(res.document)
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load document')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [id])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Document</p>
            <h1>Document Detail</h1>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading...</p>}
          {!loading && document && (
            <div>
              <h2>{document.title}</h2>
              <p>
                <strong>Type:</strong> {document.type}
              </p>
              <p>
                <strong>Taxpayer TIN:</strong> {document.taxpayerTin}
              </p>
              {document.status && (
                <p>
                  <strong>Status:</strong> {document.status}
                </p>
              )}
              <p>
                <strong>Uploaded:</strong> {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : '—'}
              </p>
              <div style={{ marginTop: 12 }}>
                <a
                  href={`/api/documents/${id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Preview
                </a>
                <a
                  href={`/api/documents/${id}/file`}
                  download
                  className="btn"
                  style={{ marginLeft: 8 }}
                >
                  Download
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
