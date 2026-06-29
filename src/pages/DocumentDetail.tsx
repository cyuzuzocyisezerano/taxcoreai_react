import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type DocumentItem, type DocumentAnalysis } from '../lib/api'
import './AdminDashboard.css'

export function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [document, setDocument] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobState, setJobState] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<number>(0)
  const [analyzing, setAnalyzing] = useState(false)

  let pollInterval: number | null = null

  async function pollJobStatus(jobId: string) {
    try {
      const jobStatus = await api.getJobStatus(jobId)
      setJobState(jobStatus.state)
      setJobProgress(jobStatus.progress)
      
      // If job is still running, set up polling
      if (jobStatus.state === 'waiting' || jobStatus.state === 'active') {
        pollInterval = window.setInterval(async () => {
          try {
            const updatedStatus = await api.getJobStatus(jobId)
            setJobState(updatedStatus.state)
            setJobProgress(updatedStatus.progress)
            
            // If job completed, reload document to get analysis
            if (updatedStatus.state === 'completed') {
              if (pollInterval) window.clearInterval(pollInterval)
              const docRes = await api.getDocument(id!)
              setDocument(docRes.document)
              setJobState('completed')
              setAnalyzing(false)
            } else if (updatedStatus.state === 'failed') {
              if (pollInterval) window.clearInterval(pollInterval)
              setJobState('failed')
              setAnalyzing(false)
            }
          } catch (err) {
            console.error('Failed to poll job status:', err)
          }
        }, 2000) // Poll every 2 seconds
      } else if (jobStatus.state === 'completed') {
        // Job already completed, reload document
        const docRes = await api.getDocument(id!)
        setDocument(docRes.document)
        setAnalyzing(false)
      }
    } catch (err) {
      console.error('Failed to get initial job status:', err)
      setAnalyzing(false)
    }
  }

  async function handleAnalyze() {
    if (!id || !document?.fileName) return
    try {
      setAnalyzing(true)
      setError(null)
      setJobState(null)
      setJobProgress(0)
      const res = await api.analyzeDocument(id) as { jobId?: string; status?: string; result?: any }
      if (res?.status === 'completed' && res?.result) {
        const updatedDoc = await api.getDocument(id)
        setDocument(updatedDoc.document)
        setJobState('completed')
        setJobProgress(100)
        setAnalyzing(false)
        return
      }

      if (res?.jobId) {
        pollJobStatus(res.jobId)
      } else {
        setJobState('completed')
        setJobProgress(100)
        setAnalyzing(false)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start analysis')
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!id) return
      try {
        const res = await api.getDocument(id)
        if (mounted) {
          setDocument(res.document)
          
          // If there's a job ID, start polling for status
          if (res.document.analysisJobId) {
            pollJobStatus(res.document.analysisJobId)
          }
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load document')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      if (pollInterval) window.clearInterval(pollInterval)
    }
  }, [id])

  const renderAnalysis = (analysis: DocumentAnalysis) => {
    const getRiskColor = (level: string) => {
      switch (level) {
        case 'low':
          return '#10b981'
        case 'medium':
          return '#f59e0b'
        case 'high':
          return '#ef4444'
        default:
          return '#9ca3af'
      }
    }

    const getConfidenceColor = (confidence: number) => {
      if (confidence > 0.8) return '#10b981'
      if (confidence > 0.5) return '#f59e0b'
      return '#ef4444'
    }

    return (
      <div className="analysis-section">
        <h3>AI Document Analysis</h3>

        {/* Summary Section */}
        {analysis.summary && (
          <div className="analysis-card" style={{ backgroundColor: '#f3f4f6', borderLeft: '4px solid #3b82f6' }}>
            <h4>Summary</h4>
            <p>{analysis.summary}</p>
          </div>
        )}

        {/* Document Type & Classification Row */}
        <div className="analysis-grid">
          <div className="analysis-card">
            <h4>Document Type</h4>
            <div
              className="type-badge"
              style={{
                backgroundColor: '#e0e7ff',
                color: '#4f46e5',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'inline-block',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {analysis.documentType || analysis.classification.type}
            </div>
          </div>

          <div className="analysis-card">
            <h4>Classification</h4>
            <div
              className="classification-badge"
              style={{
                backgroundColor: getConfidenceColor(analysis.classification.confidence),
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'inline-block',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {analysis.classification.type}
            </div>
            <p className="confidence" style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Confidence: {(analysis.classification.confidence * 100).toFixed(1)}%
            </p>
          </div>

          <div className="analysis-card">
            <h4>Risk Level</h4>
            <div
              className="risk-badge"
              style={{
                backgroundColor: getRiskColor(analysis.riskLevel || 'unknown'),
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'inline-block',
                fontSize: '14px',
                fontWeight: '500',
                textTransform: 'capitalize',
              }}
            >
              {analysis.riskLevel || 'Unknown'}
            </div>
          </div>
        </div>

        {/* Key Fields */}
        {analysis.keyFields && Object.keys(analysis.keyFields).length > 0 && (
          <div className="analysis-card">
            <h4>Key Information</h4>
            <div className="key-fields-grid">
              {Object.entries(analysis.keyFields).map(([key, value]) => (
                <div key={key} className="key-field">
                  <span className="field-label">{key.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className="field-value">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Flags */}
        {analysis.complianceFlags && analysis.complianceFlags.length > 0 && (
          <div className="analysis-card" style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
            <h4>Compliance Issues</h4>
            <ul className="compliance-flags">
              {analysis.complianceFlags.map((flag, idx) => (
                <li key={idx} style={{ color: '#991b1b' }}>
                  <span style={{ marginRight: '8px' }}>⚠️</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="analysis-card" style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
            <h4>Recommended Actions</h4>
            <ul className="recommendations">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} style={{ color: '#166534' }}>
                  <span style={{ marginRight: '8px' }}>✓</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Extracted Text Preview */}
        {analysis.text && (
          <div className="analysis-card">
            <h4>Extracted Text Preview</h4>
            <div className="extracted-text" style={{ maxHeight: '200px', overflow: 'auto', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              {analysis.text.substring(0, 500)}
              {analysis.text.length > 500 && '...'}
            </div>
          </div>
        )}

        {/* Analysis Metadata */}
        <div className="analysis-meta">
          <p>
            <strong>Model:</strong> <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '3px' }}>{analysis.model}</code>
          </p>
          <p>
            <strong>Analyzed At:</strong> {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
          {analysis.error && (
            <p style={{ color: '#dc2626' }}>
              <strong>Error:</strong> {analysis.error}
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderJobStatus = () => {
    if (!jobState) return null

    const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
      waiting: { label: 'Queued', color: '#f59e0b', icon: '⏳' },
      active: { label: 'Processing', color: '#3b82f6', icon: '⚙️' },
      completed: { label: 'Completed', color: '#10b981', icon: '✅' },
      failed: { label: 'Failed', color: '#ef4444', icon: '❌' },
    }

    const status = statusConfig[jobState] || statusConfig.waiting

    return (
      <div className="job-status" style={{ borderColor: status.color }}>
        <div className="job-status-header">
          <span className="job-icon">{status.icon}</span>
          <span className="job-label" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        {(jobState === 'waiting' || jobState === 'active') && (
          <div className="job-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${jobProgress}%`,
                  backgroundColor: status.color 
                }}
              />
            </div>
            <span className="progress-text">{jobProgress}%</span>
          </div>
        )}
        {jobState === 'failed' && (
          <p className="job-error">Analysis failed. Please try again or contact support.</p>
        )}
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Document</p>
            <h1>Document Detail</h1>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading...</p>}
          {!loading && document && (
            <div>
              <h2>{document.title}</h2>
              <p>
                <strong>Type:</strong> {document.type}
              </p>
              <p>
                <strong>Taxpayer TIN:</strong> {document.taxpayerTin}
              </p>
              {document.status && (
                <p>
                  <strong>Status:</strong> {document.status}
                </p>
              )}
              <p>
                <strong>Uploaded:</strong> {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : '—'}
              </p>
              
              {renderJobStatus()}

               {document.analysis && renderAnalysis(document.analysis)}

              {document.fileName && !document.analysis && !jobState && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? 'Starting...' : 'Analyze Document'}
                  </button>
                </div>
              )}

              {jobState && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={handleAnalyze} disabled={analyzing || jobState === 'waiting' || jobState === 'active'}>
                    Re-analyze
                  </button>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <a
                  href={`/api/documents/${id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Preview
                </a>
                <a
                  href={`/api/documents/${id}/file`}
                  download
                  className="btn"
                  style={{ marginLeft: 8 }}
                >
                  Download
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}