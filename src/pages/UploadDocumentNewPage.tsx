import { useState, useEffect } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export default function UploadDocumentNewPage() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [taxpayer, setTaxpayer] = useState<string>('')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('')
  const [tags, setTags] = useState('')
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
    if (!file) return setError('Please select a file')
    
    const form = new FormData()
    form.append('file', file)
    form.append('title', title || file.name)
    if (taxpayer) form.append('taxpayerTin', taxpayer)
    if (docType) form.append('type', docType)
    if (tags) form.append('tags', tags)

    try {
      setError(null)
      setProgress(0)
      const res = await api.uploadDocumentWithProgress(form, (pct) => setProgress(pct))
      // Redirect to document detail or show success
      window.location.href = `/documents/${res.document.id}`
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
      setFile(e.dataTransfer.files[0])
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
              <h1>Upload Document</h1>
              <p className="admin-dashboard__hero-text">Upload and auto-classify tax documents using ML</p>
            </div>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          <form onSubmit={handleUpload} style={{ display: 'grid', gap: 16 }}>
            {/* Taxpayer Selection */}
            <div className="card">
              <h3>Taxpayer</h3>
              <select value={taxpayer} onChange={(e) => setTaxpayer(e.target.value)}>
                <option value="">— Select taxpayer —</option>
                {taxpayers.map((t) => (
                  <option key={t.id} value={t.tin}>{t.name} — {t.tin}</option>
                ))}
              </select>
            </div>

            {/* Document Details */}
            <div className="card">
              <h3>Document Details</h3>
              <label>Document Title <span style={{ color: '#dc2626' }}>*</span></label>
              <input 
                className="w-full" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. VAT Return — March 2024" 
                required 
              />
              
              <label>Document Type</label>
              <input 
                className="w-full" 
                value={docType} 
                onChange={(e) => setDocType(e.target.value)} 
                placeholder="Auto-detect with ML" 
              />
              <small style={{ color: '#7c3aed', marginTop: '4px', display: 'block' }}>
                Leave blank to let ML auto-classify (works best with .txt files)
              </small>
              
              <label>Tags</label>
              <input 
                className="w-full" 
                value={tags} 
                onChange={(e) => setTags(e.target.value)} 
                placeholder="e.g. vat, march-2024, annual" 
              />
            </div>

            {/* File Upload */}
            <div className="card">
              <h3>File</h3>
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
                  style={{ display: 'none' }}
                  id="file-upload"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📄</div>
                  <p style={{ fontWeight: 500, marginBottom: '8px', color: '#1e293b' }}>
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    PDF, JPG, PNG, TXT up to 10MB
                  </p>
                </label>
              </div>
              
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

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!file || progress !== null}>
                {progress !== null ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}