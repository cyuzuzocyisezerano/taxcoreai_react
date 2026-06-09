const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || '/api'

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

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed', response.status)
  }

  return data as T
}

export interface AuthUser {
  id: string
  username: string
  name: string
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
  type: string
  district: string
  status: string
  registered: string
  alias: string
}

export interface DashboardStats {
  totalTaxpayers: number
  activeTaxpayers: number
  totalDocuments: number
  pendingWorkflows: number
  flaggedRecords: number
}

export interface DocumentItem {
  id: string
  title: string
  type: string
  taxpayerName?: string
  taxpayerTin?: string
  uploadedAt?: string
  fileName?: string
  status?: string
}

export interface NotificationItem {
  id: string
  title: string
  type: string
  status: string
  createdAt: string
}

export interface WorkflowItem {
  id: string
  title: string
  stage: string
  owner: string
  dueDate: string
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

  getPendingTasks() {
    return request<{ tasks: { id: string; label: string; priority: string }[] }>(
      '/dashboard/pending-tasks',
    )
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

  getDocuments(params?: { taxpayerTin?: string; q?: string }) {
    const search = new URLSearchParams()
    if (params?.taxpayerTin) search.set('taxpayerTin', params.taxpayerTin)
    if (params?.q) search.set('q', params.q)
    const query = search.toString()
    return request<{ documents: DocumentItem[]; total: number }>(`/documents${query ? `?${query}` : ''}`)
  },

  getDocument(id: string) {
    return request<{ document: DocumentItem }>(`/documents/${encodeURIComponent(id)}`)
  },

  getAuditLogs(limit = 50) {
    return request<{
      logs: { id: string; action: string; username: string; details: string; createdAt: string }[]
      total: number
    }>(`/audit-logs?limit=${limit}`)
  },

  getUsers() {
    return request<UserItem[]>('/users')
  },

  getNotifications() {
    return request<{ notifications: NotificationItem[] }>('/notifications')
  },

  getWorkflows() {
    return request<{ workflows: WorkflowItem[] }>('/workflows')
  },

  getReports() {
    return request<{ reports: ReportItem[] }>('/reports')
  },

  getSettings() {
    return request<{ settings: SettingsData }>('/settings')
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

  uploadDocument(form: FormData) {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return fetch(`${API_BASE}/documents`, {
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
    return new Promise<{ document: DocumentItem }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/documents`)
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100)
          onProgress(pct)
        }
      }
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText || '{}')
          if (xhr.status >= 200 && xhr.status < 300) resolve(res)
          else reject(new ApiError(res.error || 'Upload failed', xhr.status))
        } catch (err) {
          reject(new ApiError('Upload failed', xhr.status))
        }
      }
      xhr.onerror = () => reject(new ApiError('Network error', 0))
      xhr.send(form)
    })
  },
}
