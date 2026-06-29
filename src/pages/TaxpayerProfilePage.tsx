import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export default function TaxpayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [taxpayer, setTaxpayer] = useState<Taxpayer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    type: 'Business' as Taxpayer['type'],
    status: 'Active' as Taxpayer['status'],
    district: '',
    alias: '',
    businessName: '',
    address: '',
    contact: '',
    email: '',
    phone: '',
    taxRegime: '',
    businessActivity: '',
    bankName: '',
    bankAccount: '',
    authorizedRepresentative: '',
    representativeId: '',
    representativeContact: '',
  })

  const role = user?.role ?? 'Admin'
  const title = user?.title ?? 'System Administrator'
  const canEdit = user?.role === 'Admin' || user?.role === 'Officer'

  useEffect(() => {
    if (id) loadTaxpayer()
  }, [id])

  async function loadTaxpayer() {
    if (!id) return
    setLoading(true)
    try {
      const data = await api.getTaxpayer(id)
      const t = data.taxpayer
      setTaxpayer(t)
      setForm({
        name: t.name,
        type: t.type,
        status: t.status,
        district: t.district,
        alias: t.alias || '',
        businessName: t.businessName || '',
        address: t.address || '',
        contact: t.contact || '',
        email: t.email || '',
        phone: t.phone || '',
        taxRegime: t.taxRegime || '',
        businessActivity: t.businessActivity || '',
        bankName: t.bankName || '',
        bankAccount: t.bankAccount || '',
        authorizedRepresentative: t.authorizedRepresentative || '',
        representativeId: t.representativeId || '',
        representativeContact: t.representativeContact || '',
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load taxpayer')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const updates: any = {}
      Object.keys(form).forEach((key) => {
        const value = form[key as keyof typeof form]
        if (value) updates[key] = value
      })

      const data = await api.updateTaxpayer(id, updates)
      setTaxpayer(data.taxpayer)
      setEditing(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to update taxpayer')
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !taxpayer) return

    setUploadingDoc(true)
    setDocUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', `Verification - ${file.name}`)
      formData.append('type', 'Taxpayer Verification')
      formData.append('taxpayerTin', taxpayer.tin)

      const result = await api.uploadDocument(formData)
      const newDoc = result.document

      setTaxpayer((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          documents: [...(prev.documents || []), { id: newDoc.id, name: newDoc.title, type: newDoc.type, uploadedAt: newDoc.uploadedAt || new Date().toISOString() }],
        }
      })
    } catch (e: any) {
      setDocUploadError(e?.message || 'Failed to upload document')
    } finally {
      setUploadingDoc(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <AdminSidebar role={role} title={title} />
        <main className="admin-dashboard__main">
          <div className="admin-dashboard__content-card" style={{ textAlign: 'center', padding: '48px' }}>
            Loading...
          </div>
        </main>
      </div>
    )
  }

  if (!taxpayer) {
    return (
      <div className="admin-dashboard">
        <AdminSidebar role={role} title={title} />
        <main className="admin-dashboard__main">
          <div className="admin-dashboard__content-card" style={{ textAlign: 'center', padding: '48px' }}>
            <h2>Taxpayer not found</h2>
            <button className="btn btn-primary" onClick={() => navigate('/taxpayers')} style={{ marginTop: '16px' }}>
              Back to Taxpayers
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={role} title={title} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/taxpayers')} style={{ padding: 8 }} aria-label="Back">←</button>
            <div>
              <p className="admin-dashboard__breadcrumb">Taxpayers</p>
              <h1>Taxpayer Profile</h1>
              <p className="admin-dashboard__hero-text">TIN: {taxpayer.tin}</p>
            </div>
          </div>
          {!editing && canEdit && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
          )}
        </header>

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Basic Information */}
            <div className="card">
              <h3>Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Full Name / Company</label>
                  {editing ? (
                    <input className="w-full" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.name}</p>
                  )}
                </div>

                <div>
                  <label>TIN</label>
                  <p style={{ marginTop: '4px' }}>{taxpayer.tin}</p>
                </div>

                <div>
                  <label>Type</label>
                  {editing ? (
                    <select className="w-full" value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                      <option value="Business">Business</option>
                      <option value="Individual">Individual</option>
                      <option value="Organization">Organization</option>
                    </select>
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.type}</p>
                  )}
                </div>

                <div>
                  <label>Status</label>
                  {editing ? (
                    <select className="w-full" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Pending">Pending</option>
                      <option value="Flagged">Flagged</option>
                    </select>
                  ) : (
                    <span className={`status status--${taxpayer.status.toLowerCase()}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                      {taxpayer.status}
                    </span>
                  )}
                </div>

                <div>
                  <label>District</label>
                  {editing ? (
                    <input className="w-full" value={form.district} onChange={(e) => updateField('district', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.district}</p>
                  )}
                </div>

                <div>
                  <label>Alias</label>
                  {editing ? (
                    <input className="w-full" value={form.alias} onChange={(e) => updateField('alias', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.alias || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Registration Date</label>
                  <p style={{ marginTop: '4px' }}>{taxpayer.registered}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card">
              <h3>Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Business Name</label>
                  {editing ? (
                    <input className="w-full" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.businessName || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Address</label>
                  {editing ? (
                    <input className="w-full" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.address || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Email</label>
                  {editing ? (
                    <input type="email" className="w-full" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.email || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Phone</label>
                  {editing ? (
                    <input className="w-full" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.phone || '—'}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label>Contact Person</label>
                  {editing ? (
                    <input className="w-full" value={form.contact} onChange={(e) => updateField('contact', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.contact || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="card">
              <h3>Tax Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Tax Regime</label>
                  {editing ? (
                    <select className="w-full" value={form.taxRegime} onChange={(e) => updateField('taxRegime', e.target.value)}>
                      <option value="">Select tax regime</option>
                      <option value="VAT">VAT</option>
                      <option value="PAYE">PAYE</option>
                      <option value="Corporate Tax">Corporate Tax</option>
                      <option value="Withholding Tax">Withholding Tax</option>
                      <option value="Excise Duty">Excise Duty</option>
                    </select>
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.taxRegime || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Business Activity</label>
                  {editing ? (
                    <input className="w-full" value={form.businessActivity} onChange={(e) => updateField('businessActivity', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.businessActivity || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="card">
              <h3>Bank Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Bank Name</label>
                  {editing ? (
                    <input className="w-full" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.bankName || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Bank Account</label>
                  {editing ? (
                    <input className="w-full" value={form.bankAccount} onChange={(e) => updateField('bankAccount', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.bankAccount || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Authorized Representative */}
            <div className="card">
              <h3>Authorized Representative</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Representative Name</label>
                  {editing ? (
                    <input className="w-full" value={form.authorizedRepresentative} onChange={(e) => updateField('authorizedRepresentative', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.authorizedRepresentative || '—'}</p>
                  )}
                </div>

                <div>
                  <label>Representative ID</label>
                  {editing ? (
                    <input className="w-full" value={form.representativeId} onChange={(e) => updateField('representativeId', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.representativeId || '—'}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label>Representative Contact</label>
                  {editing ? (
                    <input className="w-full" value={form.representativeContact} onChange={(e) => updateField('representativeContact', e.target.value)} />
                  ) : (
                    <p style={{ marginTop: '4px' }}>{taxpayer.representativeContact || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>Verification Documents</h3>
                {editing && (
                  <label className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem', cursor: 'pointer' }}>
                    {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDoc}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                )}
              </div>

              {docUploadError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{docUploadError}</div>}

              {taxpayer.documents && taxpayer.documents.length > 0 ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {taxpayer.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 500 }}>{doc.name}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>{doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b' }}>No verification documents uploaded yet.</p>
              )}
            </div>

            {editing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditing(false); loadTaxpayer(); }} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}