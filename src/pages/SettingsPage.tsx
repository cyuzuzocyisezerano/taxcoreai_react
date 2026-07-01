import { useState } from 'react'
import './SettingsPage.css'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Edit Profile')
  
  const [formData, setFormData] = useState({
    firstName1: 'Yoshikage',
    firstName2: 'Kira',
    email: 'YoshikageKira@gmail.com',
    phone: '+84 789 373 568',
    country: 'Vietnam',
    city: 'Hai Phong',
    address: 'Hong Bang',
    zipCode: '180000'
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    console.log('Saving settings:', formData)
    // Add your save logic here
  }

  const tabs = ['Edit Profile', 'Preferences', 'Security', 'Data Privacy']

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">Setting</h1>
        
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`settings-tab ${activeTab === tab ? 'settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'Edit Profile' && (
            <>
              <div className="profile-section">
                <div className="profile-avatar">
                  <img src="https://i.pravatar.cc/150?img=5" alt="Profile" />
                  <div className="avatar-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.firstName1}
                        onChange={(e) => handleInputChange('firstName1', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.firstName2}
                        onChange={(e) => handleInputChange('firstName2', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="address-section">
                <h2 className="section-title">Personal Address</h2>
                
                <div className="form-grid">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Zip Code</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Preferences' && (
            <div className="placeholder-content">
              <p>Preferences settings coming soon...</p>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="placeholder-content">
              <p>Security settings coming soon...</p>
            </div>
          )}

          {activeTab === 'Data Privacy' && (
            <div className="placeholder-content">
              <p>Data Privacy settings coming soon...</p>
            </div>
          )}
        </div>

        <div className="settings-actions">
          <button className="save-button" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}