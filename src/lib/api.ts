const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) || '/api'

function buildUrl(path: string): string {
  const normalizedBase = API_BASE.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (normalizedPath.startsWith('/api')) {
    return `${normalizedBase}${normalizedPath}`
  }

  const baseHasApiPrefix = normalizedBase.endsWith('/api')
  const prefix = baseHasApiPrefix ? '' : '/api'
  return `${normalizedBase}${prefix}${normalizedPath}`
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('taxcoreai_token')
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('taxcoreai_token', token)
  } else {
    localStorage.removeItem('taxcoreai_token')
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const controller = new AbortController()
  const timeoutMs = Number((import.meta.env.VITE_API_TIMEOUT_MS as string | undefined) || 30000)
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      headers,
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new ApiError(data.error || 'Request failed', response.status)
    }

    return data as T
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 504)
    }
    throw err
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export interface AuthUser {
  id: string
  username: string
  fullName: string
  email: string
  role: string
  title: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface Taxpayer {
  id: string
  name: string
  tin: string
  type: 'Individual' | 'Business' | 'Organization'
  district: string
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending' | 'Flagged'
  registered: string
  alias: string
  businessName?: string
  address?: string
  contact?: string
  email?: string
  phone?: string
  taxRegime?: 'VAT' | 'PAYE' | 'Corporate Tax' | 'Withholding Tax' | 'Excise Duty'
  businessActivity?: string
  bankName?: string
  bankAccount?: string
  authorizedRepresentative?: string
  representativeId?: string
  representativeContact?: string
  documents?: { id: string; name: string; type: string; uploadedAt: string }[]
}

export interface DashboardStats {
  totalTaxpayers: number
  activeTaxpayers: number
  totalDocuments: number
  pendingWorkflows: number
  flaggedRecords: number
}

export interface DocumentAnalysis {
  text: string | null
  classification: {
    type: string
    confidence: number
  }
  summary?: string | null
  documentType?: string | null
  keyFields?: Record<string, any>
  complianceFlags?: string[]
  riskLevel?: 'low' | 'medium' | 'high' | 'unknown'
  recommendations?: string[]
  analyzedAt: string
  model: string
  error?: string
}

export interface DocumentItem {
  id: string
  title: string
  description?: string
  type: string
  category?: string
  status?: string
  taxpayerName?: string
  taxpayerTin?: string
  taxpayerId?: string
  fileName?: string
  filePath?: string
  fileSize?: number
  mimeType?: string
  fileHash?: string
  version?: number
  parentDocumentId?: string
  periodStart?: string
  periodEnd?: string
  expiryDate?: string
  tags?: any
  metadata?: any
  uploadedBy?: string
  uploadedAt?: string
  analysisStatus?: string
  analysis?: DocumentAnalysis
  analysisJobId?: string
  retentionPolicy?: string
  retentionExpiry?: string
  accessCount?: number
  lastAccessedAt?: string
}

export interface NotificationItem {
  id: string
  userId?: string | null
  title: string
  message?: string
  type: string
  category?: string
  priority?: string
  status?: string
  read: boolean
  readAt?: string
  channels?: string[]
  metadata?: any
  actionUrl?: string
  expiresAt?: string
  createdAt: string
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  inApp: boolean
  categories: {
    document: boolean
    task: boolean
    compliance: boolean
    deadline: boolean
    approval: boolean
    escalation: boolean
    announcement: boolean
  }
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export interface NotificationHistoryItem {
  id: string
  notificationId: string
  userId?: string | null
  action: string
  channel: string
  timestamp: string
}

export interface IntegrationStatus {
  email: {
    enabled: boolean
    provider: string
    status: string
    lastTested: string
  }
  sms: {
    enabled: boolean
    provider: string
    status: string
    lastTested: string
  }
}

export interface WorkflowStage {
  name: string
  status: string
  completedAt?: string | null
}

export interface WorkflowItem {
  id: string
  title: string
  description?: string
  documentId?: string
  taxpayerTin?: string
  taxpayerName?: string
  assignedTo?: string
  assignedUsername?: string
  assignedFullName?: string
  status: string
  priority: string
  dueDate?: string
  currentStage: string
  stages?: WorkflowStage[]
  rejectionReason?: string
  owner: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowComment {
  id: string
  workflowId: string
  userId?: string
  username: string
  comment: string
  createdAt: string
}

export interface WorkflowHistoryItem {
  id: string
  workflowId: string
  action: string
  fromStage?: string
  toStage?: string
  fromStatus?: string
  toStatus?: string
  userId?: string
  username?: string
  comment?: string
  metadata?: any
  createdAt: string
}

export interface WorkflowBatch {
  id: string
  name: string
  description?: string
  status: string
  totalItems: number
  processedItems: number
  failedItems: number
  workflowTemplate?: any
  filters?: any
  workflowIds?: string[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface SLARule {
  id: string
  name: string
  priority: string
  stage: string
  maxHours: number
  escalationUserId?: string
  escalationMessage?: string
  active: boolean
}

export interface WorkflowAnalytics {
  total: number
  overdue: number
  completed: number
  complianceRate: string
  byPriority?: { priority: string; count: number }[]
  byStage?: { current_stage: string; count: number }[]
  byStatus?: { status: string; count: number }[]
  byAssigned?: { assigned_to: string; count: number }[]
}

export interface ReportItem {
  id: string
  name: string
  type: string
  generatedAt: string
  status: string
}

export interface UserItem {
  id: string
  username: string
  fullName: string
  role: string
}

export interface SettingsData {
  featureFlags?: {
    allowRegistration?: boolean
    enableNotifications?: boolean
  }
  defaultTaxYear?: number
  reportingWindowDays?: number
}

export interface AIPrompt {
  id: string
  prompt: string
  description: string
}

export const api = {
  login(username: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  me() {
    return request<{ user: AuthUser }>('/auth/me')
  },

  logout() {
    return request<{ message: string }>('/auth/logout', { method: 'POST' })
  },

  getDashboardStats() {
    return request<DashboardStats>('/dashboard/stats')
  },

  getRecentTaxpayers() {
    return request<{ taxpayers: Taxpayer[] }>('/dashboard/recent-taxpayers')
  },

  getDistrictCounts() {
    return request<{ districts: { district: string; count: number }[] }>(`/dashboard/districts`)
  },

  getDocumentDistribution() {
    return request<{ distribution: { type: string; count: number }[] }>(`/dashboard/document-distribution`)
  },

  getRegistrationTrend() {
    return request<{ trend: { key: string; label: string; count: number }[] }>(`/dashboard/registration-trend`)
  },

  getRecentActivity(limit = 10) {
    return request<{ activity: { type: string; action: string; details: string; timestamp: string; id: string; user?: string }[] }>(
      `/dashboard/recent-activity?limit=${limit}`
    )
  },

  getMetrics() {
    return request<{
      dailyMetrics: { date: string; newTaxpayers: number; newDocuments: number; completedWorkflows: number }[]
      compliance: { analysisRate: string; approvalRate: string }
    }>(`/dashboard/metrics`)
  },
  getDistrictsCSV() {
    return fetch(`${API_BASE}/dashboard/districts.csv`, { headers: { Accept: 'text/csv' } }).then((r) => r.text())
  },

  getDocumentDistributionCSV() {
    return fetch(`${API_BASE}/dashboard/document-distribution.csv`, { headers: { Accept: 'text/csv' } }).then((r) => r.text())
  },

  getRegistrationTrendCSV() {
    return fetch(`${API_BASE}/dashboard/registration-trend.csv`, { headers: { Accept: 'text/csv' } }).then((r) => r.text())
  },

  getTaxpayers(params?: { q?: string; status?: string; type?: string }) {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.status) search.set('status', params.status)
    if (params?.type) search.set('type', params.type)
    const query = search.toString()
    return request<{ taxpayers: Taxpayer[]; total: number }>(
      `/taxpayers${query ? `?${query}` : ''}`,
    )
  },

  getTaxpayer(id: string) {
    return request<{ taxpayer: Taxpayer }>(`/taxpayers/${encodeURIComponent(id)}`)
  },

  updateTaxpayer(id: string, data: Partial<Taxpayer>) {
    return request<{ taxpayer: Taxpayer }>(`/taxpayers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  createTaxpayer(data: {
    name: string
    tin: string
    type: string
    district?: string
    status?: string
    alias?: string
    businessName?: string
    address?: string
    contact?: string
    email?: string
    phone?: string
    taxRegime?: string
    businessActivity?: string
    bankName?: string
    bankAccount?: string
    authorizedRepresentative?: string
    representativeId?: string
    representativeContact?: string
  }) {
    return request<{ taxpayer: Taxpayer }>('/taxpayers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },


  getDocuments(params?: { taxpayerTin?: string; q?: string; category?: string; type?: string; status?: string }) {
    const search = new URLSearchParams()
    if (params?.taxpayerTin) search.set('taxpayerTin', params.taxpayerTin)
    if (params?.q) search.set('q', params.q)
    if (params?.category && params.category !== 'all') search.set('category', params.category)
    if (params?.type && params.type !== 'all') search.set('type', params.type)
    if (params?.status && params.status !== 'all') search.set('status', params.status)
    const query = search.toString()
    return request<{ documents: DocumentItem[]; total: number }>(`/documents${query ? `?${query}` : ''}`)
  },

  getDocument(id: string) {
    return request<{ document: DocumentItem }>(`/documents/${encodeURIComponent(id)}`)
  },

  deleteDocument(id: string) {
    return request<{ message: string }>(`/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  getAuditLogs(limit = 50) {
    return request<{
      logs: { id: string; action: string; username: string; userFullName: string; details: string; createdAt: string }[]
      total: number
    }>(`/audit-logs?limit=${limit}`)
  },

  getUsers() {
    return request<UserItem[]>('/users')
  },

  createUser(data: { username: string; fullName: string; email?: string; password: string; role?: string }) {
    return request<UserItem>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getNotifications(params?: { unreadOnly?: boolean; type?: string; category?: string; priority?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true')
    if (params?.type && params.type !== 'all') searchParams.set('type', params.type)
    if (params?.category && params.category !== 'all') searchParams.set('category', params.category)
    if (params?.priority && params.priority !== 'all') searchParams.set('priority', params.priority)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return request<{ notifications: NotificationItem[]; total: number; unreadCount: number; hasMore: boolean }>(
      `/notifications${query ? `?${query}` : ''}`
    )
  },

  getUnreadCount() {
    return request<{ unreadCount: number }>('/notifications/unread-count')
  },

  getNotification(id: string) {
    return request<{ notification: NotificationItem }>(`/notifications/${encodeURIComponent(id)}`)
  },

  markNotificationRead(id: string) {
    return request<{ notification: NotificationItem }>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    })
  },

  markAllNotificationsRead() {
    return request<{ message: string; count: number }>('/notifications/read-all', {
      method: 'PATCH',
    })
  },

  deleteNotification(id: string) {
    return request<{ message: string }>(`/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  broadcastNotification(data: { title: string; message: string; priority?: string; channels?: string[]; expiresAt?: string }) {
    return request<{ notification: NotificationItem }>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getNotificationPreferences() {
    return request<{ preferences: NotificationPreferences }>('/notifications/preferences')
  },

  updateNotificationPreferences(data: Partial<NotificationPreferences>) {
    return request<{ preferences: NotificationPreferences }>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  getNotificationHistory(params?: { notificationId?: string; action?: string; channel?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.notificationId && params.notificationId !== 'all') searchParams.set('notificationId', params.notificationId)
    if (params?.action && params.action !== 'all') searchParams.set('action', params.action)
    if (params?.channel && params.channel !== 'all') searchParams.set('channel', params.channel)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return request<{ history: NotificationHistoryItem[]; total: number; hasMore: boolean }>(
      `/notifications/history${query ? `?${query}` : ''}`
    )
  },

  getNotificationIntegrationStatus() {
    return request<{ integration: IntegrationStatus }>('/notifications/integration-status')
  },

  testNotificationIntegration(channel: 'email' | 'sms') {
    return request<{ test: any }>('/notifications/integration-test', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    })
  },

  getWorkflows(params?: { status?: string; assignedTo?: string; priority?: string; overdue?: string; stage?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params?.assignedTo) searchParams.set('assignedTo', params.assignedTo)
    if (params?.priority && params.priority !== 'all') searchParams.set('priority', params.priority)
    if (params?.overdue) searchParams.set('overdue', params.overdue)
    if (params?.stage) searchParams.set('stage', params.stage)
    if (params?.search) searchParams.set('search', params.search)
    const query = searchParams.toString()
    return request<{ workflows: WorkflowItem[]; total: number }>(`/workflows${query ? `?${query}` : ''}`)
  },

  getWorkflow(id: string) {
    return request<{ workflow: WorkflowItem }>(`/workflows/${encodeURIComponent(id)}`)
  },

  createWorkflow(data: {
    title: string
    description?: string
    documentId?: string
    taxpayerTin?: string
    taxpayerName?: string
    assignedTo?: string
    priority?: string
    dueDate?: string
    stages?: WorkflowStage[]
  }) {
    return request<{ workflow: WorkflowItem }>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateWorkflow(id: string, data: {
    status?: string
    assignedTo?: string
    priority?: string
    dueDate?: string
    currentStage?: string
    stageAction?: boolean
    comment?: string
  }) {
    return request<{ workflow: WorkflowItem }>(`/workflows/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  approveWorkflow(id: string, comment?: string) {
    return request<{ workflow: WorkflowItem }>(`/workflows/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  },

  rejectWorkflow(id: string, reason?: string, comment?: string) {
    return request<{ workflow: WorkflowItem }>(`/workflows/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, comment }),
    })
  },

  escalateWorkflow(id: string, reason?: string, comment?: string) {
    return request<{ workflow: WorkflowItem }>(`/workflows/${encodeURIComponent(id)}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason, comment }),
    })
  },

  deleteWorkflow(id: string) {
    return request<{ message: string }>(`/workflows/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  getWorkflowComments(id: string) {
    return request<{ comments: WorkflowComment[] }>(`/workflows/${encodeURIComponent(id)}/comments`)
  },

  addWorkflowComment(id: string, comment: string) {
    return request<{ comment: WorkflowComment }>(`/workflows/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  },

  getWorkflowHistory(id: string) {
    return request<{ history: WorkflowHistoryItem[] }>(`/workflows/${encodeURIComponent(id)}/history`)
  },

  getPendingTasks() {
    return request<{ tasks: WorkflowItem[]; total: number }>('/workflows/tasks/pending')
  },

  getUnassignedWorkflows() {
    return request<{ workflows: WorkflowItem[]; total: number }>('/workflows/unassigned')
  },

  getWorkflowUsers() {
    return request<{ users: { id: string; username: string; full_name: string; role: string }[] }>('/workflows/users')
  },

  assignWorkflow(id: string, userId: string, comment?: string) {
    return request<{ workflow: WorkflowItem }>(`/workflows/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId, comment }),
    })
  },

  getWorkflowAnalyticsSLA() {
    return request<WorkflowAnalytics>('/workflows/analytics/sla')
  },

  getWorkflowAnalyticsOverview() {
    return request<WorkflowAnalytics>('/workflows/analytics/overview')
  },

  getWorkflowBatches() {
    return request<{ batches: WorkflowBatch[]; total: number }>('/workflows/batches')
  },

  getWorkflowBatch(id: string) {
    return request<{ batch: WorkflowBatch }>(`/workflows/batches/${encodeURIComponent(id)}`)
  },

  createWorkflowBatch(data: {
    name: string
    description?: string
    filters?: any
    workflowTemplate?: any
    workflowIds?: string[]
  }) {
    return request<{ batch: WorkflowBatch }>('/workflows/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  processWorkflowBatch(id: string) {
    return request<{ message: string; batchId: string }>(`/workflows/batches/${encodeURIComponent(id)}/process`, {
      method: 'POST',
    })
  },

  cancelWorkflowBatch(id: string) {
    return request<{ batch: WorkflowBatch }>(`/workflows/batches/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    })
  },

  getSLARules() {
    return request<{ rules: SLARule[] }>('/workflows/sla-rules')
  },

  createSLARule(data: {
    name: string
    priority: string
    stage: string
    maxHours: number
    escalationUserId?: string
    escalationMessage?: string
  }) {
    return request<{ rule: SLARule }>('/workflows/sla-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  exportWorkflows(format: 'json' | 'csv', params?: { status?: string; priority?: string; assignedTo?: string; overdue?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params?.priority && params.priority !== 'all') searchParams.set('priority', params.priority)
    if (params?.assignedTo) searchParams.set('assignedTo', params.assignedTo)
    if (params?.overdue) searchParams.set('overdue', params.overdue)
    const query = searchParams.toString()
    return request<{ workflows: WorkflowItem[] }>(`/workflows/export/${format}${query ? `?${query}` : ''}`)
  },

  getReports() {
    return request<{ reports: ReportItem[] }>('/reports')
  },

  getSettings() {
    return request<{ settings: SettingsData }>('/settings')
  },

  updateSettings(data: SettingsData) {
    return request<{ settings: SettingsData }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  searchRecords(params?: { q?: string }) {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    const query = search.toString()
    return request<{ taxpayers: Taxpayer[]; documents: DocumentItem[] }>(`/search${query ? `?${query}` : ''}`)
  },

  getAIPrompts() {
    return request<{ prompts: AIPrompt[] }>('/ai-assistant/prompts')
  },

  sendAIMessage(query: string, context?: any) {
    return request<{
      message: string
      quickActions: any[]
      data: any
      intent: string | null
    }>('/ai-assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ query, context }),
    })
  },

  getAIQuickActions() {
    return request<{ quickActions: any[] }>('/ai-assistant/quick-actions')
  },

  getAISuggestions(role?: string) {
    const query = role ? `?role=${role}` : ''
    return request<{ suggestions: any[] }>(`/ai-assistant/suggestions${query}`)
  },

  uploadDocument(form: FormData) {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetch(buildUrl('/documents'), {
      method: 'POST',
      headers,
      body: form,
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new ApiError(data.error || 'Upload failed', r.status)
      return data as { document: DocumentItem }
    })
  },
  uploadDocumentWithProgress(form: FormData, onProgress: (percent: number) => void) {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    return fetch(buildUrl('/documents'), {
      method: 'POST',
      headers,
      body: form,
    }).then(async (r) => {
      onProgress(100)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new ApiError(data.error || 'Upload failed', r.status)
      return data as { document: DocumentItem }
    })
  },

  getJobStatus(jobId: string) {
    return request<{
      jobId: string
      state: string
      progress: number
      result: any
      failedReason: string | null
      createdAt: number
      processedOn: number | null
      finishedOn: number | null
    }>(`/jobs/${encodeURIComponent(jobId)}`)
  },

  getDocumentJobs(documentId: string) {
    return request<{ jobs: { jobId: string; state: string; progress: number; createdAt: number; processedOn: number | null; finishedOn: number | null }[] }>(
      `/jobs/document/${encodeURIComponent(documentId)}`
    )
  },

  analyzeDocument(documentId: string) {
    return request<{ jobId: string; status: string }>(`/documents/${encodeURIComponent(documentId)}/analyze`, {
      method: 'POST',
    })
  },

  getSystemHealth() {
    return request<{ health: any }>('/dashboard/system-health')
  },

  getStorageMetrics() {
    return request<{ storage: any }>('/dashboard/storage')
  },

  getUserActivity() {
    return request<{ activity: any[]; activeUsers: any[]; totalUsers: number; onlineCount: number }>('/dashboard/user-activity')
  },

  getProcessingVolume() {
    return request<{ daily: any; weekly: any; monthly: any; generatedAt: string }>('/dashboard/processing-volume')
  },

  getComplianceMetrics() {
    return request<{ documentCompliance: string; workflowCompliance: string; taxpayerCompliance: string; overallCompliance: string; metrics: any }>('/dashboard/compliance')
  },

  getRealtimeData() {
    return request<{ timestamp: string; recentActivity: any[]; recentNotifications: any[]; systemStatus: string }>('/dashboard/realtime')
  },

  exportMonitoringData(format?: 'json' | 'csv') {
    const query = format ? `?format=${format}` : ''
    return request<any>(`/dashboard/export${query}`)
  },

  // Integrations
  getIntegrations() {
    return request<{ integrations: any[]; total: number }>('/integrations')
  },

  getIntegration(id: string) {
    return request<{ integration: any }>(`/integrations/${encodeURIComponent(id)}`)
  },

  createIntegration(data: { name: string; type: string; config?: Record<string, any>; status?: string }) {
    return request<{ integration: any }>('/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateIntegration(id: string, data: { name?: string; type?: string; config?: Record<string, any>; status?: string }) {
    return request<{ integration: any }>(`/integrations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  deleteIntegration(id: string) {
    return request<{ message: string }>(`/integrations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  testIntegrationConnection(id: string) {
    return request<{ success: boolean; message: string; timestamp: string; responseTime: number }>(
      `/integrations/${encodeURIComponent(id)}/test`,
      { method: 'POST' }
    )
  },
}
