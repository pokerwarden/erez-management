import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen, AlertTriangle, CheckSquare, Plus, RefreshCw, Download } from 'lucide-react'
import { formatDate, isOverdue } from '@/lib/utils'

interface VersionInfo {
  current: string
  latest?: string
  updateAvailable: boolean
  downloadUrl?: string
  changelog?: string
  releaseDate?: string
  error?: string
  checking: boolean
}

interface Stats {
  openCases: number
  overdueTasks: number
  pendingTasks: number
}

interface OverviewCase {
  id: string
  caseNumber: string
  courtCaseNumber?: string
  title: string
  status: string
  assignments: { userId: string; user: { id: string; name: string } }[]
  tasks: { id: string; status: string; assigneeId: string }[]
}

interface OverviewUser {
  id: string
  name: string
}

interface EmployeeTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string
  case?: { id: string; caseNumber: string; title: string }
}

interface Employee {
  id: string
  name: string
  email: string
  activeCaseCount: number
  pendingTaskCount: number
  tasks: EmployeeTask[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ openCases: 0, overdueTasks: 0, pendingTasks: 0 })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState<VersionInfo>({ current: '', updateAvailable: false, checking: false })
  const [overviewCases, setOverviewCases] = useState<OverviewCase[]>([])
  const [overviewUsers, setOverviewUsers] = useState<OverviewUser[]>([])

  async function checkForUpdates() {
    setVersion(v => ({ ...v, checking: true }))
    try {
      const res = await api.get('/version/check')
      setVersion({ ...res.data, checking: false })
    } catch {
      setVersion(v => ({ ...v, checking: false, error: 'שגיאה בבדיקת עדכונים' }))
    }
  }

  useEffect(() => {
    // Load current version quietly on mount
    api.get('/version').then(res => {
      setVersion(v => ({ ...v, current: res.data.version }))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [casesRes, tasksRes, usersRes] = await Promise.all([
          api.get('/cases?status=OPEN&limit=1'),
          api.get('/tasks?limit=200'),
          api.get('/users'),
        ])

        const allTasks: any[] = tasksRes.data.tasks ?? []
        const overdue = allTasks.filter(
          (t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
        ).length
        const pending = allTasks.filter((t: any) => t.status !== 'DONE').length

        setStats({
          openCases: casesRes.data.total,
          overdueTasks: overdue,
          pendingTasks: pending,
        })

        // Build employee workload with tasks
        const empStats = (usersRes.data ?? [])
          .filter((u: any) => u.role === 'EMPLOYEE')
          .map((u: any) => {
            const myTasks = allTasks.filter((t: any) => t.assigneeId === u.id && t.status !== 'DONE')
            return {
              id: u.id,
              name: u.name,
              email: u.email,
              activeCaseCount: 0,
              pendingTaskCount: myTasks.length,
              tasks: myTasks,
            }
          })
        setEmployees(empStats)

        const overviewRes = await api.get('/cases/overview').catch(() => null)
        if (overviewRes?.data?.cases) {
          setOverviewCases(overviewRes.data.cases)
          setOverviewUsers(overviewRes.data.users ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/cases/new"><Plus className="h-4 w-4 me-1" />{t('newCase')}</Link>
          </Button>
        </div>
      </div>

      {/* Update banner */}
      {version.updateAvailable && version.latest ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 space-y-1">
          <div className="flex items-center gap-3">
            <Download className="h-4 w-4 shrink-0" />
            <span className="flex-1 font-medium">
              גרסה חדשה זמינה: <strong>v{version.latest}</strong>
              {version.releaseDate ? ` (${version.releaseDate})` : ''}
              {' '}— נוכחית: v{version.current}
            </span>
          </div>
          {version.changelog ? (
            <div className="pr-7 text-blue-700 text-xs">{version.changelog}</div>
          ) : null}
          <div className="pr-7 text-blue-600 text-xs">
            להתקנה: היכנס לשרת והרץ <code className="bg-blue-100 rounded px-1">./update.sh</code>
          </div>
        </div>
      ) : null}

      {/* Version footer + check button */}
      {!version.updateAvailable && version.current ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>גרסה: v{version.current}</span>
          <button
            onClick={checkForUpdates}
            disabled={version.checking}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${version.checking ? 'animate-spin' : ''}`} />
            {version.checking ? 'בודק...' : 'בדוק עדכונים'}
          </button>
          {version.error && <span className="text-destructive">{version.error}</span>}
          {!version.updateAvailable && version.latest && (
            <span className="text-green-600">המערכת מעודכנת</span>
          )}
        </div>
      ) : null}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('totalOpenCases')}</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.openCases}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('overdueTasks')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.overdueTasks > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {stats.overdueTasks}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('pendingTasks')}</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employee workload */}
      <div>
        <h2 className="text-base font-semibold mb-3">{t('employeeWorkload')}</h2>
        {employees.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noResults')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {employees.map(emp => (
              <Card key={emp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{emp.name}</CardTitle>
                    <Badge variant={emp.pendingTaskCount > 5 ? 'destructive' : emp.pendingTaskCount > 2 ? 'warning' : 'secondary'}>
                      {emp.pendingTaskCount} משימות
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {emp.tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">אין משימות פתוחות</p>
                  ) : (
                    <ul className="space-y-2">
                      {emp.tasks.slice(0, 5).map((task: EmployeeTask) => (
                        <li key={task.id} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0 last:pb-0">
                          <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
                            task.priority === 'URGENT' ? 'bg-red-500' :
                            task.priority === 'HIGH'   ? 'bg-orange-400' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-slate-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            {task.case && (
                              <Link to={`/cases/${task.case.id}`} className="text-muted-foreground hover:text-primary truncate block">
                                {task.case.caseNumber}
                              </Link>
                            )}
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            {task.status === 'IN_PROGRESS' ? (
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">בטיפול</span>
                            ) : task.dueDate && isOverdue(task.dueDate) ? (
                              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">באיחור</span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                      {emp.tasks.length > 5 && (
                        <li className="text-xs text-muted-foreground text-center pt-1">
                          +{emp.tasks.length - 5} משימות נוספות
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Cross-employee overview */}
      {overviewCases.length > 0 && overviewUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('overview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-3 font-medium">תיק</th>
                    <th className="text-right py-2 px-3 font-medium">סטטוס</th>
                    {overviewUsers.map(u => (
                      <th key={u.id} className="text-right py-2 px-3 font-medium">{u.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overviewCases.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <Link to={`/cases/${c.id}`} className="font-medium hover:underline text-primary">{c.title}</Link>
                        <div className="text-xs text-muted-foreground">{c.courtCaseNumber || c.caseNumber}</div>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{t(c.status)}</td>
                      {overviewUsers.map(u => {
                        const isAssigned = c.assignments.some(a => a.userId === u.id)
                        if (!isAssigned) return <td key={u.id} className="py-2 px-3 text-center text-muted-foreground">—</td>
                        const userTasks = c.tasks.filter(task => task.assigneeId === u.id)
                        let label = 'לביצוע'
                        let cls = 'bg-slate-100 text-slate-700'
                        if (userTasks.length === 0) { label = 'מוקצה'; cls = 'bg-blue-100 text-blue-700' }
                        else if (userTasks.every(task => task.status === 'DONE')) { label = 'הושלם'; cls = 'bg-green-100 text-green-700' }
                        else if (userTasks.some(task => task.status === 'IN_PROGRESS')) { label = 'בטיפול'; cls = 'bg-yellow-100 text-yellow-700' }
                        return (
                          <td key={u.id} className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
