import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleDashboardRouter } from './components/RoleDashboardRouter'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AuditorDashboard } from './pages/AuditorDashboard'
import { SupervisorDashboard } from './pages/SupervisorDashboard'
import { Taxpayers } from './pages/Taxpayers'
import { Documents } from './pages/Documents'
import { DocumentDetail } from './pages/DocumentDetail'
import UploadDocumentPage from './pages/UploadDocumentPage'
import UploadDocumentNewPage from './pages/UploadDocumentNewPage'
import BulkUploadPage from './pages/BulkUploadPage'
import RegisterTaxpayerPage from './pages/RegisterTaxpayerPage'
import TaxpayerProfilePage from './pages/TaxpayerProfilePage'
import { SearchRetrieval } from './pages/SearchRetrieval'
import { Workflows } from './pages/Workflows'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsAnalytics } from './pages/ReportsAnalytics'
import { AIAssistant } from './pages/AIAssistant'
import { AuditLogs } from './pages/AuditLogs'
import { UserManagement } from './pages/UserManagement'
import { SettingsPage } from './pages/SettingsPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { AlertPopup } from './components/AlertPopup'
import { MonitoringDashboard } from './pages/MonitoringDashboard'
import { IntegrationsPage } from './pages/IntegrationsPage'

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AlertPopup />
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
            path="/dashboard/admin"
            element={
              <Protected>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route
            path="/auditor"
            element={
              <Protected>
                <AuditorDashboard />
              </Protected>
            }
          />
          <Route
            path="/dashboard/auditor"
            element={
              <Protected>
                <AuditorDashboard />
              </Protected>
            }
          />
          <Route
            path="/supervisor"
            element={
              <Protected>
                <SupervisorDashboard />
              </Protected>
            }
          />
          <Route
            path="/dashboard/supervisor"
            element={
              <Protected>
                <SupervisorDashboard />
              </Protected>
            }
          />
          <Route
            path="/officer"
            element={
              <Protected>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route
            path="/dashboard/officer"
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
            path="/taxpayers/register"
            element={
              <Protected>
                <RegisterTaxpayerPage />
              </Protected>
            }
          />
          <Route
            path="/taxpayers/:id"
            element={
              <Protected>
                <TaxpayerProfilePage />
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
            path="/upload-document"
            element={
              <Protected>
                <UploadDocumentPage />
              </Protected>
            }
          />
          <Route
            path="/upload-document-new"
            element={
              <Protected>
                <UploadDocumentNewPage />
              </Protected>
            }
          />
          <Route
            path="/bulk-upload"
            element={
              <Protected>
                <BulkUploadPage />
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
                <NotificationsPage />
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
                <SettingsPage />
              </Protected>
            }
          />
          <Route
            path="/monitoring"
            element={
              <Protected>
                <MonitoringDashboard />
              </Protected>
            }
          />
          <Route
            path="/integrations"
            element={
              <Protected>
                <IntegrationsPage />
              </Protected>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <Protected>
                <UnauthorizedPage />
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
