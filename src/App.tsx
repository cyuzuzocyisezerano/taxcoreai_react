import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { Taxpayers } from './pages/Taxpayers'
import { Documents } from './pages/Documents'
import { DocumentDetail } from './pages/DocumentDetail'
import { SearchRetrieval } from './pages/SearchRetrieval'
import { Workflows } from './pages/Workflows'
import { Notifications } from './pages/Notifications'
import { ReportsAnalytics } from './pages/ReportsAnalytics'
import { AIAssistant } from './pages/AIAssistant'
import { AuditLogs } from './pages/AuditLogs'
import { UserManagement } from './pages/UserManagement'
import { Settings } from './pages/Settings'

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route
            path="/admin"
            element={
              <Protected>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route
            path="/taxpayers"
            element={
              <Protected>
                <Taxpayers />
              </Protected>
            }
          />
          <Route
            path="/documents"
            element={
              <Protected>
                <Documents />
              </Protected>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <Protected>
                <DocumentDetail />
              </Protected>
            }
          />
          <Route
            path="/search-retrieval"
            element={
              <Protected>
                <SearchRetrieval />
              </Protected>
            }
          />
          <Route
            path="/workflows"
            element={
              <Protected>
                <Workflows />
              </Protected>
            }
          />
          <Route
            path="/notifications"
            element={
              <Protected>
                <Notifications />
              </Protected>
            }
          />
          <Route
            path="/reports-analytics"
            element={
              <Protected>
                <ReportsAnalytics />
              </Protected>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <Protected>
                <AIAssistant />
              </Protected>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <Protected>
                <AuditLogs />
              </Protected>
            }
          />
          <Route
            path="/user-management"
            element={
              <Protected>
                <UserManagement />
              </Protected>
            }
          />
          <Route
            path="/settings"
            element={
              <Protected>
                <Settings />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
