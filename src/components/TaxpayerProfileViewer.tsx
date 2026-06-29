import { useState, useEffect } from 'react'
import { api, type Taxpayer, type DocumentItem } from '../lib/api'
import { useAuth } from '../context/AuthContext'

type Props = {
  taxpayerId: string
  onClose: () => void
  onUpdated: (taxpayer: Taxpayer) => void
}

export function TaxpayerProfileViewer({ taxpayerId, onClose, onUpdated }: Props) {
  const [taxpayer, setTaxpayer] = useState<Taxpayer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)
  const { user } = useAuth()

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

  useEffect(() => {
    loadTaxpayer()
  }, [taxpayerId])

  async function loadTaxpayer() {
    setLoading(true)
    try {
      const data = await api.getTaxpayer(taxpayerId)
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
    setSaving(true)
    setError(null)
    try {
      const updates: any = {}
      Object.keys(form).forEach((key) => {
        const value = form[key as keyof typeof form]
        if (value) updates[key] = value
      })

      const data = await api.updateTaxpayer(taxpayerId, updates)
      setTaxpayer(data.taxpayer)
      onUpdated(data.taxpayer)
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">Loading...</div>
      </div>
    )
  }

  if (!taxpayer) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">Taxpayer not found</div>
      </div>
    )
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

  const canEdit = user?.role === 'Admin' || user?.role === 'Officer'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Taxpayer Profile</h3>
            <p className="text-sm text-gray-500">TIN: {taxpayer.tin}</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700 text-2xl" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

          {/* Basic Information */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name / Company</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TIN</label>
                <p className="text-sm text-gray-900">{taxpayer.tin}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                {editing ? (
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                    <option value="Business">Business</option>
                    <option value="Individual">Individual</option>
                    <option value="Organization">Organization</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.type}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {editing ? (
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                    <option value="Flagged">Flagged</option>
                  </select>
                ) : (
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold status status--${taxpayer.status.toLowerCase()}`}>
                    {taxpayer.status}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.district} onChange={(e) => updateField('district', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.district}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alias</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.alias} onChange={(e) => updateField('alias', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.alias || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                <p className="text-sm text-gray-900">{taxpayer.registered}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.businessName || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.address || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {editing ? (
                  <input type="email" className="w-full border rounded px-3 py-2 text-sm" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.email || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.phone || '—'}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.contact} onChange={(e) => updateField('contact', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.contact || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Tax Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Regime</label>
                {editing ? (
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.taxRegime} onChange={(e) => updateField('taxRegime', e.target.value)}>
                    <option value="">Select tax regime</option>
                    <option value="VAT">VAT</option>
                    <option value="PAYE">PAYE</option>
                    <option value="Corporate Tax">Corporate Tax</option>
                    <option value="Withholding Tax">Withholding Tax</option>
                    <option value="Excise Duty">Excise Duty</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.taxRegime || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Activity</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.businessActivity} onChange={(e) => updateField('businessActivity', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.businessActivity || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Bank Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.bankName || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.bankAccount} onChange={(e) => updateField('bankAccount', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.bankAccount || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Authorized Representative */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Authorized Representative</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative Name</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.authorizedRepresentative} onChange={(e) => updateField('authorizedRepresentative', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.authorizedRepresentative || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative ID</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.representativeId} onChange={(e) => updateField('representativeId', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.representativeId || '—'}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative Contact</label>
                {editing ? (
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.representativeContact} onChange={(e) => updateField('representativeContact', e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900">{taxpayer.representativeContact || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <h4 className="text-sm font-semibold text-gray-900">Verification Documents</h4>
              <label className="px-3 py-1.5 rounded bg-teal-600 text-white text-xs font-medium cursor-pointer hover:bg-teal-700 disabled:opacity-60">
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDoc}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </label>
            </div>

            {docUploadError && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">{docUploadError}</div>}

            {taxpayer.documents && taxpayer.documents.length > 0 ? (
              <div className="space-y-2">
                {taxpayer.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No verification documents uploaded yet.</p>
            )}
          </div>
        </div>

        <footer className="px-6 py-4 border-t flex justify-end gap-2">
          {editing ? (
            <>
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                onClick={() => {
                  setEditing(false)
                  loadTaxpayer()
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium disabled:opacity-60"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={onClose}>
                Close
              </button>
              {canEdit && (
                <button
                  className="px-4 py-2 rounded bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  )
}