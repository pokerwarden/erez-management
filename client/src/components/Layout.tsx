import React, { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getSocket } from '@/lib/socket'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users, Settings, LogOut, Bell, X
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  type: string
  linkTo?: string
  createdAt: string
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { toasts, dismissToast } = useToast()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [firmName, setFirmName] = useState('מערכת ניהול תיקים')

  useEffect(() => {
    api.get('/settings').then(r => setFirmName(r.data.firmName)).catch(() => {})
    fetchNotifications()
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNotif = (notif: Notification) => {
      setNotifications(prev => [notif, ...prev])
      setUnreadCount(c => c + 1)
    }

    socket.on('notification:new', handleNotif)
    return () => { socket.off('notification:new', handleNotif) }
  }, [])

  async function fetchNotifications() {
    try {
      const res = await api.get('/notifications?limit=20')
      setNotifications(res.data.notifications)
      setUnreadCount(res.data.unreadCount)
    } catch {}
  }

  async function markRead(id: string) {
    await api.put(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  async function markAllRead() {
    await api.put('/notifications/read-all')
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const navItems = [
    { href: user?.role === 'ADMIN' ? '/admin' : '/my-tasks', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/cases', icon: FolderOpen, label: t('cases') },
    { href: '/my-tasks', icon: CheckSquare, label: t('myTasks') },
    ...(user?.role === 'ADMIN' ? [
      { href: '/admin/employees', icon: Users, label: t('employees') },
      { href: '/admin/settings', icon: Settings, label: t('settings') },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-primary truncate">{firmName}</h1>
          <p className="text-xs text-muted-foreground mt-1">{user?.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {notifOpen && (
              <div className="absolute left-0 top-12 w-80 bg-card border rounded-lg shadow-lg z-50">
                <div className="flex items-center justify-between p-3 border-b">
                  <span className="font-medium text-sm">{t('notifications')}</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                      {t('markAllRead')}
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm p-4">{t('noNotifications')}</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 border-b hover:bg-accent cursor-pointer ${!n.read ? 'bg-blue-50' : ''}`}
                        onClick={() => { markRead(n.id); setNotifOpen(false) }}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Toast container */}
      <div className="fixed bottom-4 left-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-sm ${
              toast.type === 'success' ? 'bg-green-50 border-green-200' :
              toast.type === 'error' ? 'bg-red-50 border-red-200' :
              'bg-card border-border'
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.message && <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismissToast(toast.id)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
