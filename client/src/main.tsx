import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import AdminDashboard from '@/pages/AdminDashboard'
import CasesPage from '@/pages/CasesPage'
import CaseDetailPage from '@/pages/CaseDetailPage'
import NewCasePage from '@/pages/NewCasePage'
import MyTasksPage from '@/pages/MyTasksPage'
import EmployeesPage from '@/pages/EmployeesPage'
import SettingsPage from '@/pages/SettingsPage'
import './index.css'
import { setupDemoMock } from '@/lib/demo-mock'
if (import.meta.env.VITE_DEMO_MODE === 'true') setupDemoMock()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/my-tasks" replace />
  return <>{children}</>
}

function DownloadBanner() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null
  return (
    <a
      href="https://github.com/pokerwarden/erez-management/releases/latest/download/LawFirmSystem-Setup-v1.0.0.exe"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#2563eb',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '12px',
        fontFamily: 'Heebo, sans-serif',
        fontWeight: 600,
        fontSize: '14px',
        textDecoration: 'none',
        boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
      }}
    >
      ⬇️ הורד והתקן את המערכת
    </a>
  )
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.VITE_DEMO_MODE === 'true' ? '/erez-management' : '/'}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/my-tasks" replace />} />
              <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
              <Route path="cases/new" element={<AdminRoute><NewCasePage /></AdminRoute>} />
              <Route path="cases/:id" element={<ProtectedRoute><CaseDetailPage /></ProtectedRoute>} />
              <Route path="my-tasks" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />
              <Route path="admin/employees" element={<AdminRoute><EmployeesPage /></AdminRoute>} />
              <Route path="admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
      <DownloadBanner />
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
