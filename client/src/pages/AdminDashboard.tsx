import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen, AlertTriangle, CheckSquare, Plus } from 'lucide-react'
import { formatDate, isOverdue } from '@/lib/utils'

interface Stats {
  openCases: number
  overdueTasks: number
  pendingTasks: number
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
    </div>
  )
}
