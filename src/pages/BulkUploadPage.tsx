import { useState, useEffect } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export default function BulkUploadPage() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileList | null>(null)
  const [taxpayer, setTaxpayer] = useState<string>('')
  const [category, setCategory] = useState('Other')
  const [docType, setDocType] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const role = user?.role ?? 'Admin'
  const titleRole = user?.title ?? 'System Administrator'

  useEffect(() => {
    let mounted = true
    api.getTaxpayers()
      .then((r) => {
        if (!mounted) return
        setTaxpayers(r.taxpayers || [])
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!files || files.length === 0) return setError('Please select files')
    
    const form = new FormData()
    for (let i = 0; i < files.length; i++) {
      form.append('files', files[i])
    }
    form.append('taxpayerTin', taxpayer)
    form.append('category', category)
    if (docType) form.append('type', docType)

    try {
      setError(null)
      setProgress(0)
      await api.uploadDocumentWithProgress(form, (pct) => setProgress(pct))
      // Redirect to documents list
      window.location.href = '/documents'
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
      setProgress(null)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files)
    }
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={role} title={titleRole} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => window.history.back()} style={{ padding: 8 }} aria-label="Back">←</button>
            <div>
              <p className="admin-dashboard__breadcrumb">Document Upload</p>
              <h1>Bulk Upload Documents</h1>
              <p className="admin-dashboard__hero-text">Upload multiple documents at once</p>
            </div>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          <form onSubmit={handleUpload} style={{ display: 'grid', gap: 16 }}>
            {/* File Selection */}
            <div className="card">
              <h3>Select Files</h3>
              <div 
                className="file-drop" 
                style={{ 
                  textAlign: 'center',
                  border: dragActive ? '2px dashed #0d9488' : '2px dashed #e2e8f0',
                  background: dragActive ? '#f0fdfa' : '#f8fafc',
                  padding: '48px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  multiple
                  style={{ display: 'none' }}
                  id="files-upload"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                />
                <label htmlFor="files-upload" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📁</div>
                  <p style={{ fontWeight: 500, marginBottom: '8px', color: '#1e293b' }}>
                    {files && files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload or drag and drop'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    PDF, JPG, PNG, TXT up to 10MB each (max 50 files)
                  </p>
                </label>
              </div>
              
              {files && files.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontWeight: 500, marginBottom: '8px' }}>Selected files:</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Array.from(files).map((file, idx) => (
                      <li key={idx} style={{ padding: '4px 0', fontSize: '0.875rem', color: '#64748b' }}>
                        • {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {progress !== null && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#0d9488', borderRadius: 8, transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                    {progress}%
                  </p>
                </div>
              )}
            </div>

            {/* Document Details */}
            <div className="card">
              <h3>Document Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Taxpayer</label>
                  <select 
                    className="w-full" 
                    value={taxpayer} 
                    onChange={(e) => setTaxpayer(e.target.value)}
                  >
                    <option value="">— Select taxpayer —</option>
                    {taxpayers.map((t) => (
                      <option key={t.id} value={t.tin}>{t.name} — {t.tin}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Category</label>
                  <select 
                    className="w-full" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Other">Other</option>
                    <option value="Filing">Filing</option>
                    <option value="Return">Return</option>
                    <option value="Correspondence">Correspondence</option>
                    <option value="License">License</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Contract">Contract</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Receipt">Receipt</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label>Document Type (optional)</label>
                  <input 
                    className="w-full" 
                    value={docType} 
                    onChange={(e) => setDocType(e.target.value)} 
                    placeholder="e.g. Tax Return, VAT, Compliance" 
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!files || files.length === 0 || progress !== null}>
                {progress !== null ? 'Uploading...' : `Upload ${files ? files.length : 0} Document(s)`}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}