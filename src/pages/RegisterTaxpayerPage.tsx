import { useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export default function RegisterTaxpayerPage() {
  const { user } = useAuth()
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
  const [success, setSuccess] = useState(false)

  const role = user?.role ?? 'Admin'
  const title = user?.title ?? 'System Administrator'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!name.trim() || !tin.trim() || !type) {
      setError('Name, TIN, and type are required')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await api.createTaxpayer({
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

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/taxpayers'
      }, 1500)
    } catch (e: any) {
      setError(e?.message || 'Failed to register taxpayer')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="admin-dashboard">
        <AdminSidebar role={role} title={title} />
        <main className="admin-dashboard__main">
          <div className="admin-dashboard__content-card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✓</div>
            <h2>Taxpayer Registered Successfully!</h2>
            <p style={{ color: '#64748b', marginTop: '8px' }}>Redirecting to taxpayer list...</p>
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
            <button className="btn btn-ghost" onClick={() => window.history.back()} style={{ padding: 8 }} aria-label="Back">←</button>
            <div>
              <p className="admin-dashboard__breadcrumb">Taxpayers</p>
              <h1>Register Taxpayer</h1>
              <p className="admin-dashboard__hero-text">Register a new taxpayer in the system</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Basic Information */}
            <div className="card">
              <h3>Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Full name / Company <span style={{ color: '#dc2626' }}>*</span></label>
                  <input 
                    className="w-full" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Kigali Trading Company Ltd" 
                  />
                </div>

                <div>
                  <label>TIN <span style={{ color: '#dc2626' }}>*</span></label>
                  <input 
                    className="w-full" 
                    value={tin} 
                    onChange={(e) => setTin(e.target.value)} 
                    placeholder="e.g. 100000001" 
                  />
                </div>

                <div>
                  <label>Type</label>
                  <select className="w-full" value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="Business">Business</option>
                    <option value="Individual">Individual</option>
                    <option value="Organization">Organization</option>
                  </select>
                </div>

                <div>
                  <label>Status</label>
                  <select className="w-full" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label>District</label>
                  <input 
                    className="w-full" 
                    value={district} 
                    onChange={(e) => setDistrict(e.target.value)} 
                    placeholder="e.g. Gasabo" 
                  />
                </div>

                <div>
                  <label>Alias (optional)</label>
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
              <h3>Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Business Name</label>
                  <input 
                    className="w-full" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)} 
                    placeholder="e.g. Kigali Trading Company Ltd" 
                  />
                </div>

                <div>
                  <label>Address</label>
                  <input 
                    className="w-full" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="e.g. KG 123 St, Kigali" 
                  />
                </div>

                <div>
                  <label>Email</label>
                  <input 
                    type="email"
                    className="w-full" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="e.g. info@example.com" 
                  />
                </div>

                <div>
                  <label>Phone</label>
                  <input 
                    className="w-full" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="e.g. +250 788 123 456" 
                  />
                </div>

                <div className="col-span-2">
                  <label>Contact Person</label>
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
              <h3>Tax Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Tax Regime</label>
                  <select className="w-full" value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)}>
                    <option value="">Select tax regime</option>
                    <option value="VAT">VAT</option>
                    <option value="PAYE">PAYE</option>
                    <option value="Corporate Tax">Corporate Tax</option>
                    <option value="Withholding Tax">Withholding Tax</option>
                    <option value="Excise Duty">Excise Duty</option>
                  </select>
                </div>

                <div>
                  <label>Business Activity</label>
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
              <h3>Bank Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Bank Name</label>
                  <input 
                    className="w-full" 
                    value={bankName} 
                    onChange={(e) => setBankName(e.target.value)} 
                    placeholder="e.g. Bank of Kigali" 
                  />
                </div>

                <div>
                  <label>Bank Account</label>
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
              <h3>Authorized Representative</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Representative Name</label>
                  <input 
                    className="w-full" 
                    value={authorizedRepresentative} 
                    onChange={(e) => setAuthorizedRepresentative(e.target.value)} 
                    placeholder="e.g. Jane Smith" 
                  />
                </div>

                <div>
                  <label>Representative ID</label>
                  <input 
                    className="w-full" 
                    value={representativeId} 
                    onChange={(e) => setRepresentativeId(e.target.value)} 
                    placeholder="e.g. 119900001" 
                  />
                </div>

                <div className="col-span-2">
                  <label>Representative Contact</label>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Taxpayer'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}