import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const state = location.state as { reason?: string; from?: string } | null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '500px' }}>
        <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#d32f2f' }}>403</h1>
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>Access Denied</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          You don't have permission to access this resource.
        </p>
        {state?.reason && (
          <p style={{ color: '#999', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <strong>Reason:</strong> {state.reason}
          </p>
        )}
        {user && (
          <p style={{ color: '#999', fontSize: '0.875rem', marginBottom: '2rem' }}>
            <strong>Your Role:</strong> {user.role}
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
