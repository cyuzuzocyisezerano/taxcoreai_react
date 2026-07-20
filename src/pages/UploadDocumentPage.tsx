import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DocumentItem, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export default function UploadDocumentPage() {
  const [file, setFile] = useState<File | null>(null)
  const [taxpayer, setTaxpayer] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('')
  const [tags, setTags] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  async function handleUpload(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault()
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
      setProgress(100)
      if (res?.document?.id) {
        window.location.assign(`/documents/${res.document.id}`)
      } else {
        setError('Upload completed but the document ID was not returned.')
      }
    } catch (e: any) {
      const message = e?.message || 'Upload failed'
      setError(message)
      setProgress(null)
    }
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => window.history.back()} style={{ padding: 8 }} aria-label="Back">←</button>
            <div>
              <p className="admin-dashboard__breadcrumb">Upload Document</p>
              <h1>Upload Document</h1>
              <p className="admin-dashboard__hero-text">Upload and auto-classify tax documents using ML</p>
            </div>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="card">
              <h3>Taxpayer</h3>
              <select value={taxpayer ?? ''} onChange={(e) => setTaxpayer(e.target.value || null)}>
                <option value="">— Select taxpayer —</option>
                {taxpayers.map((t) => (
                  <option key={t.id} value={t.tin}>{t.name} — {t.tin}</option>
                ))}
              </select>
            </div>

            <div className="card">
              <h3>Document Details</h3>
              <label>Document Title *</label>
              <input className="w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. VAT Return — March 2024" />
              <label>Document Type</label>
              <input className="w-full" value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="Auto-detect with ML" />
              <small>Leave blank to let ML auto-classify (works best with .txt files)</small>
              <label>Tags</label>
              <input className="w-full" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. vat, march-2024, annual" />
            </div>

            <div className="card">
              <h3>File</h3>
              <div className="file-drop" style={{ textAlign: 'center' }}>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file && <div style={{ marginTop: 12 }}>{file.name}</div>}
              </div>
              {progress !== null && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 8 }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#0d9488', borderRadius: 8 }} />
                  </div>
                  <div style={{ marginTop: 6 }}>{progress}%</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => window.history.back()}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void handleUpload()}>Upload</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

