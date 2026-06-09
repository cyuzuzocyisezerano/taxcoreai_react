import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DocumentItem, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export function SearchRetrieval() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])

  useEffect(() => {
    if (!query) {
      setTaxpayers([])
      setDocuments([])
      setError(null)
      return
    }

    let mounted = true

    async function search() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.searchRecords({ q: query })
        if (mounted) {
          setTaxpayers(data.taxpayers)
          setDocuments(data.documents)
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Search failed')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    search()

    return () => {
      mounted = false
    }
  }, [query])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Search & Retrieval</p>
            <h1>Search Records</h1>
            <p className="admin-dashboard__hero-text">Search across taxpayers, documents, and workflows for fast retrieval.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <div className="admin-dashboard__search">
              <input
                type="search"
                placeholder="Search taxpayer, document, TIN..."
                aria-label="Search records"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Searching records…</p>}
          {!loading && !query && <p>Enter a search term to retrieve taxpayers and documents from the system.</p>}

          {!loading && query && (
            <>
              <div className="section-heading">
                <h2>Taxpayer results</h2>
              </div>
              {taxpayers.length === 0 ? (
                <p>No taxpayers matched your search.</p>
              ) : (
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>TIN</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxpayers.map((taxpayer) => (
                      <tr key={taxpayer.id}>
                        <td>{taxpayer.name}</td>
                        <td>{taxpayer.tin}</td>
                        <td>{taxpayer.type}</td>
                        <td>{taxpayer.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="section-heading">
                <h2>Document results</h2>
              </div>
              {documents.length === 0 ? (
                <p>No documents matched your search.</p>
              ) : (
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Taxpayer TIN</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id}>
                        <td>{document.title}</td>
                        <td>{document.type}</td>
                        <td>{document.taxpayerTin}</td>
                        <td>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
