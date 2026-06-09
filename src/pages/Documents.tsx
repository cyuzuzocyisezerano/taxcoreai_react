import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DocumentItem } from '../lib/api'
import UploadModal from '../components/UploadModal'
import './AdminDashboard.css'

export function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await api.getDocuments()
        if (mounted) setDocuments(res.documents || [])
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load documents')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(documents.map((doc) => doc.type).filter(Boolean)))
    return ['all', ...types]
  }, [documents])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = !normalizedSearch || [doc.title, doc.type, doc.taxpayerTin, doc.taxpayerName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch))
      const matchesType = selectedType === 'all' || doc.type === selectedType
      return matchesSearch && matchesType
    })
  }, [documents, normalizedSearch, selectedType])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Documents</p>
            <h1>Document Management</h1>
            <p className="admin-dashboard__hero-text">{loading ? 'Loading documents...' : `${filteredDocuments.length} documents in the system`}</p>
          </div>

          <div className="admin-dashboard__topbar-actions">
            <div className="admin-dashboard__search">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, taxpayer, or document"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {typeOptions.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption === 'all' ? 'All Types' : typeOption}
                </option>
              ))}
            </select>

            <button className="btn btn-primary" type="button" onClick={() => setShowUploadModal(true)}>
              Upload Document
            </button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error ? (
            <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">{error}</div>
          ) : loading ? (
            <div className="min-h-[240px] flex items-center justify-center text-slate-500">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl">📄</div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">No documents found</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Upload your first document to start tracking taxpayer records, evidence, and audit-ready files in one place.
                </p>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => setShowUploadModal(true)}>
                Upload First Document
              </button>
            </div>
          ) : (
            <div>
              <div className="card-header">
                <div>
                  <p className="eyebrow">Document Registry</p>
                  <h2>{filteredDocuments.length} documents available</h2>
                </div>
              </div>

              <div className="admin-dashboard__table-wrap">
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Taxpayer</th>
                      <th>Type</th>
                      <th>Uploaded</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-lg">📄</div>
                            <div>
                              <p className="font-semibold text-slate-900">{doc.title}</p>
                              <span>{doc.fileName ?? doc.type}</span>
                            </div>
                          </div>
                        </td>
                        <td>{doc.taxpayerName ?? doc.taxpayerTin}</td>
                        <td>{doc.type || 'Unknown'}</td>
                        <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      <UploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])}
      />
    </div>
  )
}
