import { useEffect, useState, useCallback } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type WorkflowItem, type WorkflowComment, type WorkflowHistoryItem, type WorkflowBatch, type SLARule, type WorkflowAnalytics } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './AdminDashboard.css'

type Tab = 'workflows' | 'unassigned' | 'batches' | 'sla-rules' | 'analytics'

export function Workflows() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('workflows')
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)

  // Workflow detail modal
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null)
  const [comments, setComments] = useState<WorkflowComment[]>([])
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [escalateReason, setEscalateReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showEscalateModal, setShowEscalateModal] = useState(false)

  // Batches
  const [batches, setBatches] = useState<WorkflowBatch[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [batchDescription, setBatchDescription] = useState('')

  // SLA Rules
  const [slaRules, setSlaRules] = useState<SLARule[]>([])
  const [showSlaModal, setShowSlaModal] = useState(false)
  const [slaName, setSlaName] = useState('')
  const [slaPriority, setSlaPriority] = useState('medium')
  const [slaStage, setSlaStage] = useState('verified')
  const [slaMaxHours, setSlaMaxHours] = useState('48')

  // Analytics
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null)
  
  // Unassigned workflows for supervisor
  const [unassignedWorkflows, setUnassignedWorkflows] = useState<WorkflowItem[]>([])
  
  // User assignment
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningWorkflow, setAssigningWorkflow] = useState<WorkflowItem | null>(null)
  const [availableUsers, setAvailableUsers] = useState<{ id: string; username: string; full_name: string; role: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignComment, setAssignComment] = useState('')

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getWorkflows({
        status: statusFilter,
        priority: priorityFilter,
        stage: stageFilter,
        search: searchQuery || undefined,
        overdue: showOverdueOnly ? 'true' : undefined,
      })
      setWorkflows(data.workflows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workflows')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, stageFilter, searchQuery, showOverdueOnly])

  const loadWorkflowDetail = useCallback(async (id: string) => {
    try {
      const [commentsRes, historyRes] = await Promise.all([
        api.getWorkflowComments(id),
        api.getWorkflowHistory(id),
      ])
      setComments(commentsRes.comments)
      setHistory(historyRes.history)
    } catch (err) {
      console.error('Failed to load workflow detail:', err)
    }
  }, [])

  const loadBatches = useCallback(async () => {
    try {
      const data = await api.getWorkflowBatches()
      setBatches(data.batches)
    } catch (err) {
      console.error('Failed to load batches:', err)
    }
  }, [])

  const loadSlaRules = useCallback(async () => {
    try {
      const data = await api.getSLARules()
      setSlaRules(data.rules)
    } catch (err) {
      console.error('Failed to load SLA rules:', err)
    }
  }, [])

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.getWorkflowAnalyticsOverview()
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }, [])

  const loadUnassignedWorkflows = useCallback(async () => {
    try {
      const data = await api.getUnassignedWorkflows()
      setUnassignedWorkflows(data.workflows)
    } catch (err) {
      console.error('Failed to load unassigned workflows:', err)
    }
  }, [])

  const loadAvailableUsers = useCallback(async () => {
    try {
      const data = await api.getWorkflowUsers()
      setAvailableUsers(data.users)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }, [])

  const handleAssignWorkflow = async () => {
    if (!assigningWorkflow || !selectedUserId) return
    try {
      await api.assignWorkflow(assigningWorkflow.id, selectedUserId, assignComment || undefined)
      setShowAssignModal(false)
      setAssigningWorkflow(null)
      setSelectedUserId('')
      setAssignComment('')
      await loadWorkflows()
      await loadUnassignedWorkflows()
    } catch (err) {
      console.error('Failed to assign workflow:', err)
      alert('Failed to assign workflow')
    }
  }

  const openAssignModal = async (workflow: WorkflowItem) => {
    setAssigningWorkflow(workflow)
    setShowAssignModal(true)
    await loadAvailableUsers()
  }

  useEffect(() => {
    if (activeTab === 'workflows') {
      loadWorkflows()
    } else if (activeTab === 'batches') {
      loadBatches()
    } else if (activeTab === 'sla-rules') {
      loadSlaRules()
    } else if (activeTab === 'analytics') {
      loadAnalytics()
    } else if (activeTab === 'unassigned') {
      loadUnassignedWorkflows()
    }
  }, [activeTab, loadWorkflows, loadBatches, loadSlaRules, loadAnalytics, loadUnassignedWorkflows])

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowDetail(selectedWorkflow.id)
    }
  }, [selectedWorkflow, loadWorkflowDetail])

  const handleSelectWorkflow = async (workflow: WorkflowItem) => {
    setSelectedWorkflow(workflow)
    await loadWorkflowDetail(workflow.id)
  }

  const handleAddComment = async () => {
    if (!selectedWorkflow || !newComment.trim()) return
    try {
      await api.addWorkflowComment(selectedWorkflow.id, newComment)
      setNewComment('')
      await loadWorkflowDetail(selectedWorkflow.id)
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
  }

  const handleApprove = async (comment?: string) => {
    if (!selectedWorkflow) return
    try {
      const result = await api.approveWorkflow(selectedWorkflow.id, comment)
      setSelectedWorkflow(result.workflow)
      await loadWorkflows()
    } catch (err) {
      console.error('Failed to approve workflow:', err)
    }
  }

  const handleReject = async () => {
    if (!selectedWorkflow) return
    try {
      const result = await api.rejectWorkflow(selectedWorkflow.id, rejectReason, newComment)
      setSelectedWorkflow(result.workflow)
      setShowRejectModal(false)
      setRejectReason('')
      setNewComment('')
      await loadWorkflows()
    } catch (err) {
      console.error('Failed to reject workflow:', err)
    }
  }

  const handleEscalate = async () => {
    if (!selectedWorkflow) return
    try {
      const result = await api.escalateWorkflow(selectedWorkflow.id, escalateReason, newComment)
      setSelectedWorkflow(result.workflow)
      setShowEscalateModal(false)
      setEscalateReason('')
      setNewComment('')
      await loadWorkflows()
    } catch (err) {
      console.error('Failed to escalate workflow:', err)
    }
  }

  const handleCreateBatch = async () => {
    if (!batchName.trim()) return
    try {
      await api.createWorkflowBatch({
        name: batchName,
        description: batchDescription,
      })
      setShowBatchModal(false)
      setBatchName('')
      setBatchDescription('')
      await loadBatches()
    } catch (err) {
      console.error('Failed to create batch:', err)
    }
  }

  const handleProcessBatch = async (id: string) => {
    try {
      await api.processWorkflowBatch(id)
      await loadBatches()
    } catch (err) {
      console.error('Failed to process batch:', err)
    }
  }

  const handleCreateSLARule = async () => {
    if (!slaName.trim() || !slaMaxHours) return
    try {
      await api.createSLARule({
        name: slaName,
        priority: slaPriority,
        stage: slaStage,
        maxHours: parseInt(slaMaxHours),
      })
      setShowSlaModal(false)
      setSlaName('')
      setSlaPriority('medium')
      setSlaStage('verified')
      setSlaMaxHours('48')
      await loadSlaRules()
    } catch (err) {
      console.error('Failed to create SLA rule:', err)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const result = await api.exportWorkflows(format, {
        status: statusFilter,
        priority: priorityFilter,
        overdue: showOverdueOnly ? 'true' : undefined,
      })
      if (format === 'csv') {
        const blob = new Blob([result as any], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `workflows-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        console.log('Exported workflows:', result)
      }
    } catch (err) {
      console.error('Failed to export workflows:', err)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc2626'
      case 'high': return '#f59e0b'
      case 'medium': return '#3b82f6'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'in_progress': return '#3b82f6'
      case 'completed': return '#10b981'
      case 'approved': return '#059669'
      case 'rejected': return '#dc2626'
      case 'escalated': return '#7c3aed'
      default: return '#6b7280'
    }
  }

  const isOverdue = (workflow: WorkflowItem) => {
    if (!workflow.dueDate || ['completed', 'approved', 'rejected'].includes(workflow.status)) return false
    return new Date(workflow.dueDate) < new Date()
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Workflows</p>
            <h1>Workflow & Records Processing</h1>
            <p className="admin-dashboard__hero-text">
              Manage record processing workflows, track stages, assign tasks, and monitor SLA compliance.
            </p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-secondary" onClick={() => handleExport('csv')}>Export CSV</button>
            <button className="btn btn-primary" onClick={() => setShowBatchModal(true)}>New Batch</button>
          </div>
        </header>

        {/* Tabs */}
        <div className="admin-dashboard__tabs">
          <button
            className={`admin-dashboard__tab ${activeTab === 'workflows' ? 'admin-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            Workflows
          </button>
          <button
            className={`admin-dashboard__tab ${activeTab === 'unassigned' ? 'admin-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('unassigned')}
            style={{ position: 'relative' }}
          >
            Unassigned
            {unassignedWorkflows.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {unassignedWorkflows.length}
              </span>
            )}
          </button>
          <button
            className={`admin-dashboard__tab ${activeTab === 'batches' ? 'admin-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            Batches
          </button>
          <button
            className={`admin-dashboard__tab ${activeTab === 'sla-rules' ? 'admin-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('sla-rules')}
          >
            SLA Rules
          </button>
          <button
            className={`admin-dashboard__tab ${activeTab === 'analytics' ? 'admin-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <>
            {/* Filters */}
            <section className="admin-dashboard__content-card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-dashboard__search"
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minWidth: '200px' }}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-dashboard__select"
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="escalated">Escalated</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="admin-dashboard__select"
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="admin-dashboard__select"
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="all">All Stages</option>
                  <option value="received">Received</option>
                  <option value="verified">Verified</option>
                  <option value="approved">Approved</option>
                  <option value="archived">Archived</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showOverdueOnly}
                    onChange={(e) => setShowOverdueOnly(e.target.checked)}
                  />
                  <span>Overdue Only</span>
                </label>
              </div>
            </section>

            {/* Workflows Table */}
            <section className="admin-dashboard__content-card">
              {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
              {loading && <p>Loading workflows…</p>}
              {!loading && workflows.length === 0 && <p>No workflows found.</p>}

              {!loading && workflows.length > 0 && (
                <div className="admin-dashboard__table-wrap">
                  <table className="admin-dashboard__table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Current Stage</th>
                        <th>Assigned To</th>
                        <th>Due Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflows.map((workflow) => (
                        <tr key={workflow.id} style={isOverdue(workflow) ? { backgroundColor: '#fef2f2' } : undefined}>
                          <td>
                            <div>
                              <strong>{workflow.title}</strong>
                              {workflow.taxpayerName && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{workflow.taxpayerName}</div>}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                backgroundColor: `${getStatusColor(workflow.status)}20`,
                                color: getStatusColor(workflow.status),
                              }}
                            >
                              {workflow.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                backgroundColor: `${getPriorityColor(workflow.priority)}20`,
                                color: getPriorityColor(workflow.priority),
                              }}
                            >
                              {workflow.priority}
                            </span>
                          </td>
                          <td>{workflow.currentStage}</td>
                          <td>{workflow.assignedFullName || workflow.assignedUsername || workflow.assignedTo || 'Unassigned'}</td>
                          <td style={isOverdue(workflow) ? { color: '#dc2626', fontWeight: 600 } : undefined}>
                            {workflow.dueDate ? new Date(workflow.dueDate).toLocaleDateString() : 'No due date'}
                            {isOverdue(workflow) && ' (Overdue)'}
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                              onClick={() => handleSelectWorkflow(workflow)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* Unassigned Workflows Tab */}
        {activeTab === 'unassigned' && (
          <section className="admin-dashboard__content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Unassigned Workflows</h2>
              <button className="btn btn-secondary" onClick={loadUnassignedWorkflows}>Refresh</button>
            </div>
            {unassignedWorkflows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>All workflows assigned</p>
                <p>There are no unassigned workflows at this time.</p>
              </div>
            ) : (
              <div className="admin-dashboard__table-wrap">
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Current Stage</th>
                      <th>Due Date</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedWorkflows.map((workflow) => (
                      <tr key={workflow.id} style={isOverdue(workflow) ? { backgroundColor: '#fef2f2' } : undefined}>
                        <td>
                          <div>
                            <strong>{workflow.title}</strong>
                            {workflow.taxpayerName && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{workflow.taxpayerName}</div>}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              backgroundColor: `${getStatusColor(workflow.status)}20`,
                              color: getStatusColor(workflow.status),
                            }}
                          >
                            {workflow.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              backgroundColor: `${getPriorityColor(workflow.priority)}20`,
                              color: getPriorityColor(workflow.priority),
                            }}
                          >
                            {workflow.priority}
                          </span>
                        </td>
                        <td>{workflow.currentStage}</td>
                        <td style={isOverdue(workflow) ? { color: '#dc2626', fontWeight: 600 } : undefined}>
                          {workflow.dueDate ? new Date(workflow.dueDate).toLocaleDateString() : 'No due date'}
                          {isOverdue(workflow) && ' (Overdue)'}
                        </td>
                        <td>{new Date(workflow.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            onClick={() => openAssignModal(workflow)}
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Batches Tab */}
        {activeTab === 'batches' && (
          <section className="admin-dashboard__content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Workflow Batches</h2>
              <button className="btn btn-primary" onClick={() => setShowBatchModal(true)}>Create Batch</button>
            </div>
            {batches.length === 0 ? (
              <p>No batches found.</p>
            ) : (
              <div className="admin-dashboard__table-wrap">
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Created By</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id}>
                        <td>
                          <strong>{batch.name}</strong>
                          {batch.description && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{batch.description}</div>}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              backgroundColor: batch.status === 'completed' ? '#10b98120' : batch.status === 'processing' ? '#3b82f620' : '#6b728020',
                              color: batch.status === 'completed' ? '#10b981' : batch.status === 'processing' ? '#3b82f6' : '#6b7280',
                            }}
                          >
                            {batch.status}
                          </span>
                        </td>
                        <td>
                          {batch.totalItems > 0
                            ? `${batch.processedItems} / ${batch.totalItems} (${Math.round((batch.processedItems / batch.totalItems) * 100)}%)`
                            : '0 / 0'}
                        </td>
                        <td>{batch.createdBy || 'System'}</td>
                        <td>{new Date(batch.createdAt).toLocaleDateString()}</td>
                        <td>
                          {batch.status === 'pending' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                              onClick={() => handleProcessBatch(batch.id)}
                            >
                              Process
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* SLA Rules Tab */}
        {activeTab === 'sla-rules' && (
          <section className="admin-dashboard__content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>SLA Rules</h2>
              <button className="btn btn-primary" onClick={() => setShowSlaModal(true)}>Add SLA Rule</button>
            </div>
            {slaRules.length === 0 ? (
              <p>No SLA rules configured.</p>
            ) : (
              <div className="admin-dashboard__table-wrap">
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Priority</th>
                      <th>Stage</th>
                      <th>Max Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaRules.map((rule) => (
                      <tr key={rule.id}>
                        <td><strong>{rule.name}</strong></td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              backgroundColor: `${getPriorityColor(rule.priority)}20`,
                              color: getPriorityColor(rule.priority),
                            }}
                          >
                            {rule.priority}
                          </span>
                        </td>
                        <td>{rule.stage}</td>
                        <td>{rule.maxHours}h</td>
                        <td>{rule.active ? 'Active' : 'Inactive'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <section className="admin-dashboard__content-card">
            <h2 style={{ marginBottom: '1rem' }}>Workflow Analytics</h2>
            {!analytics ? (
              <p>Loading analytics...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Workflows</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{analytics.total}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Overdue</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{analytics.overdue}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Completed</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{analytics.completed}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Compliance Rate</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{analytics.complianceRate}%</div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Assign Workflow Modal */}
        {showAssignModal && assigningWorkflow && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            onClick={() => setShowAssignModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                maxWidth: '500px',
                width: '90%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Assign Workflow</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                Assigning: <strong>{assigningWorkflow.title}</strong>
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="">-- Select a user --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.username}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Comment (Optional)</label>
                <textarea
                  value={assignComment}
                  onChange={(e) => setAssignComment(e.target.value)}
                  placeholder="Add a comment for this assignment..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleAssignWorkflow}
                  disabled={!selectedUserId}
                  style={{ opacity: !selectedUserId ? 0.5 : 1 }}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Detail Modal */}
        {selectedWorkflow && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setSelectedWorkflow(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                maxWidth: '900px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedWorkflow.title}</h2>
                  <p style={{ color: '#6b7280', margin: '0.25rem 0 0' }}>
                    {selectedWorkflow.taxpayerName} {selectedWorkflow.taxpayerTin && `(${selectedWorkflow.taxpayerTin})`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedWorkflow(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              {/* Workflow Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{ color: getStatusColor(selectedWorkflow.status) }}>{selectedWorkflow.status}</span>
                </div>
                <div>
                  <strong>Priority:</strong>{' '}
                  <span style={{ color: getPriorityColor(selectedWorkflow.priority) }}>{selectedWorkflow.priority}</span>
                </div>
                <div>
                  <strong>Current Stage:</strong> {selectedWorkflow.currentStage}
                </div>
                <div>
                  <strong>Assigned To:</strong> {selectedWorkflow.assignedUsername || selectedWorkflow.assignedTo || 'Unassigned'}
                </div>
                <div>
                  <strong>Due Date:</strong> {selectedWorkflow.dueDate ? new Date(selectedWorkflow.dueDate).toLocaleDateString() : 'No due date'}
                </div>
                <div>
                  <strong>Owner:</strong> {selectedWorkflow.owner}
                </div>
              </div>

              {/* Stages */}
              {selectedWorkflow.stages && selectedWorkflow.stages.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>Processing Stages</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedWorkflow.stages.map((stage, idx) => (
                      <div
                        key={stage.name}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.375rem',
                          backgroundColor: stage.status === 'completed' ? '#10b98120' : stage.status === 'in_progress' ? '#3b82f620' : '#f3f4f6',
                          color: stage.status === 'completed' ? '#10b981' : stage.status === 'in_progress' ? '#3b82f6' : '#6b7280',
                          border: stage.name === selectedWorkflow.currentStage ? '2px solid #3b82f6' : '2px solid transparent',
                        }}
                      >
                        {idx + 1}. {stage.name}
                        {stage.completedAt && <div style={{ fontSize: '0.75rem' }}>{new Date(stage.completedAt).toLocaleDateString()}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions - Hide for Auditor role (observation only) */}
              {!['approved', 'rejected'].includes(selectedWorkflow.status) && user?.role !== 'Auditor' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => handleApprove(newComment || undefined)}>Approve</button>
                  <button className="btn btn-secondary" onClick={() => setShowRejectModal(true)}>Reject</button>
                  <button className="btn btn-secondary" onClick={() => setShowEscalateModal(true)}>Escalate</button>
                  {!selectedWorkflow.assignedTo && (
                    <button className="btn btn-secondary" onClick={() => openAssignModal(selectedWorkflow)}>
                      Assign to User
                    </button>
                  )}
                </div>
              )}

              {/* Comments */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Comments</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                  <button className="btn btn-primary" onClick={handleAddComment}>Add</button>
                </div>
                {comments.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No comments yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {comments.map((comment) => (
                      <div key={comment.id} style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{comment.username}</strong>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: '0.25rem 0 0' }}>{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History */}
              <div>
                <h3>History</h3>
                {history.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No history yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {history.map((item) => (
                      <div key={item.id} style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{item.action}</strong>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {item.username}
                          {item.fromStage && item.toStage && `: ${item.fromStage} → ${item.toStage}`}
                          {item.fromStatus && item.toStatus && `: ${item.fromStatus} → ${item.toStatus}`}
                        </div>
                        {item.comment && <p style={{ margin: '0.25rem 0 0' }}>{item.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            onClick={() => setShowRejectModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                maxWidth: '500px',
                width: '90%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Reject Workflow</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleReject}>Reject</button>
              </div>
            </div>
          </div>
        )}

        {/* Escalate Modal */}
        {showEscalateModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            onClick={() => setShowEscalateModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                maxWidth: '500px',
                width: '90%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Escalate Workflow</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Enter escalation reason..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowEscalateModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleEscalate}>Escalate</button>
              </div>
            </div>
          </div>
        )}

        {/* Batch Modal */}
        {showBatchModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            onClick={() => setShowBatchModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                maxWidth: '500px',
                width: '90%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Create Workflow Batch</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Enter batch name..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description (Optional)</label>
                <textarea
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Enter description..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateBatch}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* SLA Rule Modal */}
        {showSlaModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            onClick={() => setShowSlaModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                maxWidth: '500px',
                width: '90%',
                padding: '2rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Add SLA Rule</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rule Name</label>
                <input
                  type="text"
                  value={slaName}
                  onChange={(e) => setSlaName(e.target.value)}
                  placeholder="Enter rule name..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Priority</label>
                <select
                  value={slaPriority}
                  onChange={(e) => setSlaPriority(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Stage</label>
                <select
                  value={slaStage}
                  onChange={(e) => setSlaStage(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                >
                  <option value="received">Received</option>
                  <option value="verified">Verified</option>
                  <option value="approved">Approved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Max Hours</label>
                <input
                  type="number"
                  value={slaMaxHours}
                  onChange={(e) => setSlaMaxHours(e.target.value)}
                  placeholder="48"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowSlaModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateSLARule}>Create</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}