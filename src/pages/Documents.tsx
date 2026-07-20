import { useEffect, useState, useCallback } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type DocumentItem, type Taxpayer } from '../lib/api'
import { hasPermission } from '../lib/permissions'
import './AdminDashboard.css'

export function Documents() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const role = user?.role ?? 'Admin'
  const title = user?.title ?? 'System Administrator'
  const canUploadDocuments = hasPermission((role as any) ?? 'Admin', 'canAddDocuments')

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.q = search
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (typeFilter !== 'all') params.type = typeFilter
      if (statusFilter !== 'all') params.status = statusFilter

      const data = await api.getDocuments(params)
      setDocuments(data.documents || [])
    } catch (e) {
      console.error('Failed to load documents:', e)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, typeFilter, statusFilter])

  const loadTaxpayers = useCallback(async () => {
    try {
      const data = await api.getTaxpayers()
      setTaxpayers(data.taxpayers || [])
    } catch (e) {
      console.error('Failed to load taxpayers:', e)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
    loadTaxpayers()
  }, [loadDocuments, loadTaxpayers])

  async function handleExport(format: 'json' | 'csv') {
    try {
      const response = await fetch(`/api/documents/export?format=${format}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `documents.${format}`
      a.click()
    } catch (e: any) {
      alert(e?.message || 'Export failed')
    }
  }

  async function handleViewDocument(doc: DocumentItem) {
    setSelectedDocument(doc)
    setShowPreview(true)
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await api.deleteDocument(docId)
      loadDocuments()
    } catch (e: any) {
      alert(e?.message || 'Delete failed')
    }
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={role} title={title} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Documents</p>
            <h1>Document Management</h1>
            <p className="admin-dashboard__hero-text">{documents.length} documents found</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-secondary" type="button" onClick={() => handleExport('csv')}>
              Export CSV
            </button>
            {canUploadDocuments && (
              <>
                <button className="btn btn-secondary" type="button" onClick={() => window.location.href = '/bulk-upload'}>
                  Bulk Upload
                </button>
                <button className="btn btn-primary" type="button" onClick={() => window.location.href = '/upload-document-new'}>
                  Upload Document
                </button>
              </>
            )}
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          <div className="taxpayer-filters">
            <input
              type="search"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="Filing">Filing</option>
              <option value="Return">Return</option>
              <option value="Correspondence">Correspondence</option>
              <option value="License">License</option>
              <option value="Certificate">Certificate</option>
              <option value="Contract">Contract</option>
              <option value="Invoice">Invoice</option>
              <option value="Receipt">Receipt</option>
              <option value="Other">Other</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Tax Return">Tax Return</option>
              <option value="VAT">VAT</option>
              <option value="Compliance">Compliance</option>
              <option value="Invoice">Invoice</option>
              <option value="Other">Other</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="Expired">Expired</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Flagged">Flagged</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>Loading documents...</div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
              No documents found. Upload your first document to get started.
            </div>
          ) : (
            <div className="admin-dashboard__table-wrap">
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Taxpayer</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.title}</strong>
                        {doc.fileName && <span style={{ display: 'block', fontSize: '0.875rem', color: '#64748b' }}>{doc.fileName}</span>}
                      </td>
                      <td>{doc.category || 'Other'}</td>
                      <td>{doc.type}</td>
                      <td>{doc.taxpayerName || '—'}</td>
                      <td>
                        <span className={`status status--${(doc.status || 'Active').toLowerCase().replace(' ', '-')}`}>
                          {doc.status || 'Active'}
                        </span>
                      </td>
                      <td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}</td>
                      <td>
                        <button className="btn btn-ghost" onClick={() => handleViewDocument(doc)}>View</button>
                        <button className="btn btn-ghost" onClick={() => handleDeleteDocument(doc.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Document Preview Modal */}
      {showPreview && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedDocument.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {selectedDocument.type} • {selectedDocument.category} • {selectedDocument.status}
                </p>
              </div>
              <button className="text-gray-500 hover:text-gray-700 text-2xl" onClick={() => setShowPreview(false)}>✕</button>
            </header>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label style={{ fontWeight: 500 }}>Taxpayer</label>
                  <p>{selectedDocument.taxpayerName || '—'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: 500 }}>TIN</label>
                  <p>{selectedDocument.taxpayerTin || '—'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: 500 }}>Uploaded</label>
                  <p>{selectedDocument.uploadedAt ? new Date(selectedDocument.uploadedAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: 500 }}>File</label>
                  <p>{selectedDocument.fileName || '—'}</p>
                </div>
              </div>

              {selectedDocument.description && (
                <div className="mb-6">
                  <label style={{ fontWeight: 500 }}>Description</label>
                  <p style={{ marginTop: '4px' }}>{selectedDocument.description}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
                {selectedDocument.fileName && (
                  <a href={`/api/documents/${selectedDocument.id}/file`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}