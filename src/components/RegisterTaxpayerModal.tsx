import { useMemo, useState } from 'react'
import { api, type Taxpayer } from '../lib/api'

type Props = {
  visible: boolean
  onClose: () => void
  onCreated: (taxpayer: Taxpayer) => void
}

export function RegisterTaxpayerModal({ visible, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [tin, setTin] = useState('')
  const [type, setType] = useState<'Business' | 'Individual' | 'Organization'>('Business')
  const [district, setDistrict] = useState('Gasabo')
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Suspended' | 'Pending'>('Pending')
  const [alias, setAlias] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [taxRegime, setTaxRegime] = useState('')
  const [businessActivity, setBusinessActivity] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [authorizedRepresentative, setAuthorizedRepresentative] = useState('')
  const [representativeId, setRepresentativeId] = useState('')
  const [representativeContact, setRepresentativeContact] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(name.trim() && tin.trim() && type)
  }, [name, tin, type])

  if (!visible) return null

  async function handleSubmit() {
    if (!canSubmit) {
      setError('Name, TIN, and type are required')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const result = await api.createTaxpayer({
        name,
        tin,
        type,
        district,
        status,
        alias: alias || undefined,
        businessName: businessName || undefined,
        address: address || undefined,
        contact: contact || undefined,
        email: email || undefined,
        phone: phone || undefined,
        taxRegime: taxRegime || undefined,
        businessActivity: businessActivity || undefined,
        bankName: bankName || undefined,
        bankAccount: bankAccount || undefined,
        authorizedRepresentative: authorizedRepresentative || undefined,
        representativeId: representativeId || undefined,
        representativeContact: representativeContact || undefined,
      })

      onCreated(result.taxpayer)

      // reset
      setName('')
      setTin('')
      setType('Business')
      setDistrict('Gasabo')
      setStatus('Pending')
      setAlias('')
      setBusinessName('')
      setAddress('')
      setContact('')
      setEmail('')
      setPhone('')
      setTaxRegime('')
      setBusinessActivity('')
      setBankName('')
      setBankAccount('')
      setAuthorizedRepresentative('')
      setRepresentativeId('')
      setRepresentativeContact('')
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to register taxpayer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Register Taxpayer</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name / Company <span className="text-red-500">*</span></label>
                <input
                  className="w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kigali Trading Company Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TIN <span className="text-red-500">*</span></label>
                <input
                  className="w-full"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder="e.g. 100000001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="Business">Business</option>
                  <option value="Individual">Individual</option>
                  <option value="Organization">Organization</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input
                  className="w-full"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Gasabo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alias (optional)</label>
                <input
                  className="w-full"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g. KTC Group"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  className="w-full"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Kigali Trading Company Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  className="w-full"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. KG 123 St, Kigali"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. info@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  className="w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +250 788 123 456"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  className="w-full"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900">Tax Information</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Regime</label>
                <select
                  className="w-full"
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                >
                  <option value="">Select tax regime</option>
                  <option value="VAT">VAT</option>
                  <option value="PAYE">PAYE</option>
                  <option value="Corporate Tax">Corporate Tax</option>
                  <option value="Withholding Tax">Withholding Tax</option>
                  <option value="Excise Duty">Excise Duty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Activity</label>
                <input
                  className="w-full"
                  value={businessActivity}
                  onChange={(e) => setBusinessActivity(e.target.value)}
                  placeholder="e.g. Wholesale Trade"
                />
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900">Bank Information</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  className="w-full"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Bank of Kigali"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                <input
                  className="w-full"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 1234567890"
                />
              </div>
            </div>
          </div>

          {/* Authorized Representative */}
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900">Authorized Representative</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative Name</label>
                <input
                  className="w-full"
                  value={authorizedRepresentative}
                  onChange={(e) => setAuthorizedRepresentative(e.target.value)}
                  placeholder="e.g. Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative ID</label>
                <input
                  className="w-full"
                  value={representativeId}
                  onChange={(e) => setRepresentativeId(e.target.value)}
                  placeholder="e.g. 119900001"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative Contact</label>
                <input
                  className="w-full"
                  value={representativeContact}
                  onChange={(e) => setRepresentativeContact(e.target.value)}
                  placeholder="e.g. +250 788 987 654"
                />
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
        </div>

        <footer className="px-4 py-3 border-t flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium disabled:opacity-60"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default RegisterTaxpayerModal

