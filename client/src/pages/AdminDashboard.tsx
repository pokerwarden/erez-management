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
  releaseUrl?: string
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

interface Employee {
  id: string
  name: string
  email: string
  activeCaseCount: number
  pendingTaskCount: number
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

        const overdue = tasksRes.data.tasks.filter(
          (t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
        ).length
        const pending = tasksRes.data.tasks.filter((t: any) => t.status !== 'DONE').length

        setStats({
          openCases: casesRes.data.total,
          overdueTasks: overdue,
          pendingTasks: pending,
        })

        // Build employee workload
        const empStats = usersRes.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          activeCaseCount: 0,
          pendingTaskCount: tasksRes.data.tasks.filter((t: any) => t.assigneeId === u.id && t.status !== 'DONE').length,
        }))
        setEmployees(empStats)

        const overviewRes = await api.get('/cases/overview').catch(() => null)
        if (overviewRes) {
          setOverviewCases(overviewRes.data.cases)
          setOverviewUsers(overviewRes.data.users)
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
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <Download className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            גרסה חדשה זמינה: <strong>v{version.latest}</strong> (נוכחית: v{version.current})
          </span>
          <a
            href={version.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline hover:no-underline"
          >
            פרטי גרסה
          </a>
          <span className="text-blue-600 text-xs">פתח "עדכן מערכת" מתפריט התחל</span>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('employeeWorkload')}</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noResults')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-3 font-medium">{t('name')}</th>
                    <th className="text-right py-2 px-3 font-medium">{t('email')}</th>
                    <th className="text-right py-2 px-3 font-medium">{t('pendingTasksCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">{emp.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{emp.email}</td>
                      <td className="py-2 px-3">
                        <Badge variant={emp.pendingTaskCount > 5 ? 'destructive' : 'secondary'}>
                          {emp.pendingTaskCount}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
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
