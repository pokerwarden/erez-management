import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { getSocket } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  OPEN: 'success',
  IN_PROGRESS: 'info',
  PENDING_CLIENT: 'warning',
  PENDING_COURT: 'warning',
  CLOSED: 'secondary',
  ARCHIVED: 'outline',
}

export default function CasesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await api.get(`/cases?${params}`)
      setCases(res.data.cases)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => { fetchCases() }, [fetchCases])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const refresh = () => fetchCases()
    socket.on('case:created', refresh)
    socket.on('case:updated', refresh)
    return () => { socket.off('case:created', refresh); socket.off('case:updated', refresh) }
  }, [fetchCases])

  const STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'PENDING_COURT', 'CLOSED', 'ARCHIVED']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('cases')}</h1>
        {user?.role === 'ADMIN' && (
          <Button asChild size="sm">
            <Link to="/cases/new"><Plus className="h-4 w-4 me-1" />{t('newCase')}</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{t(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-right py-3 px-4 font-medium">{t('caseNumber')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('caseTitle')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('clientName')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('status')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('courtDate')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('assignedTo')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('updatedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{t('loading')}</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">{t('noResults')}</td></tr>
            ) : cases.map(c => (
              <tr
                key={c.id}
                className="border-t hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <td className="py-3 px-4 font-mono text-xs">{c.caseNumber}</td>
                <td className="py-3 px-4 font-medium">{c.title}</td>
                <td className="py-3 px-4 text-muted-foreground">{c.clientName}</td>
                <td className="py-3 px-4">
                  <Badge variant={STATUS_VARIANTS[c.status] || 'outline'}>{t(c.status)}</Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{formatDate(c.courtDate)}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 flex-wrap">
                    {c.assignments?.slice(0, 3).map((a: any) => (
                      <span key={a.userId} className="text-xs bg-secondary rounded-full px-2 py-0.5">{a.user?.name}</span>
                    ))}
                    {c.assignments?.length > 3 && <span className="text-xs text-muted-foreground">+{c.assignments.length - 3}</span>}
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{formatDate(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">סה"כ {total} תיקים</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>הקודם</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>הבא</Button>
          </div>
        </div>
      )}
    </div>
  )
}
