import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { getSocket } from '@/lib/socket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, isOverdue } from '@/lib/utils'
import { AlertTriangle, ExternalLink } from 'lucide-react'

const COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE'] as const
type TaskStatus = typeof COLUMNS[number]

const PRIORITY_VARIANTS: Record<string, any> = {
  LOW: 'secondary', MEDIUM: 'outline', HIGH: 'warning', URGENT: 'destructive',
}

const COLUMN_COLORS: Record<TaskStatus, string> = {
  TODO: 'border-t-slate-400',
  IN_PROGRESS: 'border-t-blue-500',
  DONE: 'border-t-green-500',
}

export default function MyTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      const params = user?.role === 'ADMIN' ? '' : `?assignee=${user?.id}`
      const res = await api.get(`/tasks${params}&limit=200`)
      setTasks(res.data.tasks)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    socket.on('task:created', fetchTasks)
    socket.on('task:updated', fetchTasks)
    socket.on('task:assigned', fetchTasks)
    return () => {
      socket.off('task:created', fetchTasks)
      socket.off('task:updated', fetchTasks)
      socket.off('task:assigned', fetchTasks)
    }
  }, [fetchTasks])

  async function updateStatus(taskId: string, status: TaskStatus) {
    await api.put(`/tasks/${taskId}`, { status })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('myTasks')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col} className={`border-t-4 ${COLUMN_COLORS[col]} rounded-lg bg-muted/30`}>
            <div className="p-3 border-b bg-card rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{t(col)}</span>
                <Badge variant="secondary">{tasksByStatus(col).length}</Badge>
              </div>
            </div>

            <div className="p-3 space-y-2 min-h-32">
              {tasksByStatus(col).map(task => (
                <div
                  key={task.id}
                  className="bg-card border rounded-lg p-3 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{task.title}</p>
                    <Badge variant={PRIORITY_VARIANTS[task.priority]} className="shrink-0 text-xs">
                      {t(task.priority)}
                    </Badge>
                  </div>

                  {task.case && (
                    <Link
                      to={`/cases/${task.case.id}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {task.case.caseNumber}: {task.case.title}
                    </Link>
                  )}

                  {task.dueDate && (
                    <div className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) && task.status !== 'DONE' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {isOverdue(task.dueDate) && task.status !== 'DONE' && <AlertTriangle className="h-3 w-3" />}
                      {formatDate(task.dueDate)}
                    </div>
                  )}

                  {/* Status action buttons */}
                  <div className="flex gap-1 flex-wrap">
                    {COLUMNS.filter(c => c !== col).map(nextStatus => (
                      <button
                        key={nextStatus}
                        onClick={() => updateStatus(task.id, nextStatus)}
                        className="text-xs px-2 py-0.5 rounded border hover:bg-accent transition-colors"
                      >
                        → {t(nextStatus)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {tasksByStatus(col).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">אין משימות</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
