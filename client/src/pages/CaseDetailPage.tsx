import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getSocket } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowRight, Plus, Paperclip, Send, Trash2, UserPlus, MessageSquare } from 'lucide-react'

const STATUS_VARIANTS: Record<string, any> = {
  OPEN: 'success', IN_PROGRESS: 'info', PENDING_CLIENT: 'warning',
  PENDING_COURT: 'warning', CLOSED: 'secondary', ARCHIVED: 'outline',
}
const PRIORITY_VARIANTS: Record<string, any> = {
  LOW: 'secondary', MEDIUM: 'outline', HIGH: 'warning', URGENT: 'destructive',
}
const STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'PENDING_COURT', 'PENDING_RESPONSE', 'CLOSED', 'ARCHIVED']
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [caseData, setCaseData] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showStatusRequestDialog, setShowStatusRequestDialog] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '' })
  const [statusRequestForm, setStatusRequestForm] = useState({ toUserId: '', message: '' })
  const [statusRequests, setStatusRequests] = useState<any[]>([])
  const [financialForm, setFinancialForm] = useState<any>({})
  const [editingFinancials, setEditingFinancials] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    loadCase()
    loadComments()
    loadStatusRequests()
    if (user?.role === 'ADMIN') {
      api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    }
  }, [id])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    socket.on('case:updated', (data: any) => { if (data.id === id) loadCase() })
    socket.on('task:created', loadCase)
    socket.on('task:updated', loadCase)
    socket.on('comment:created', (c: any) => { if (c.caseId === id) setComments(prev => [...prev, c]) })
    return () => {
      socket.off('case:updated'); socket.off('task:created')
      socket.off('task:updated'); socket.off('comment:created')
    }
  }, [id])

  async function loadCase() {
    try {
      const res = await api.get(`/cases/${id}`)
      setCaseData(res.data)
      setFinancialForm({
        initialPrice: res.data.initialPrice ?? '',
        totalCaseValue: res.data.totalCaseValue ?? '',
        workHours: res.data.workHours ?? '',
        clientProposal: res.data.clientProposal ?? '',
        totalUsed: res.data.totalUsed ?? '',
        courtCaseNumber: res.data.courtCaseNumber ?? '',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadStatusRequests() {
    try {
      const res = await api.get(`/cases/${id}/status-requests`)
      setStatusRequests(res.data)
    } catch { /* non-critical */ }
  }

  async function loadComments() {
    const res = await api.get(`/cases/${id}/comments`)
    setComments(res.data)
  }

  async function updateStatus(status: string) {
    await api.put(`/cases/${id}`, { status })
    loadCase()
    showToast('הסטטוס עודכן', '', 'success')
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    await api.post('/comments', { content: commentText, caseId: id })
    setCommentText('')
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/tasks', { ...taskForm, caseId: id })
    setShowTaskDialog(false)
    setTaskForm({ title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '' })
    showToast('המשימה נוצרה', '', 'success')
    loadCase()
  }

  async function assignUser(userId: string) {
    await api.post(`/cases/${id}/assign`, { userId })
    setShowAssignDialog(false)
    loadCase()
    showToast('המשתמש הוקצה לתיק', '', 'success')
  }

  async function removeAssignee(userId: string) {
    await api.delete(`/cases/${id}/assign/${userId}`)
    loadCase()
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post(`/cases/${id}/documents`, fd)
      loadCase()
      showToast('המסמך הועלה', '', 'success')
    } catch {
      showToast('שגיאה בהעלאת המסמך', '', 'error')
    }
  }

  async function deleteDoc(docId: string) {
    await api.delete(`/documents/${docId}`)
    loadCase()
  }

  async function sendStatusRequest(e: React.FormEvent) {
    e.preventDefault()
    await api.post(`/cases/${id}/status-requests`, statusRequestForm)
    setShowStatusRequestDialog(false)
    setStatusRequestForm({ toUserId: '', message: '' })
    showToast('הבקשה נשלחה', '', 'success')
    loadCase()
    loadStatusRequests()
  }

  async function resolveStatusRequest(reqId: string) {
    await api.put(`/cases/${id}/status-requests/${reqId}/resolve`, {})
    loadStatusRequests()
    loadCase()
    showToast('הבקשה סומנה כנפתרה', '', 'success')
  }

  async function saveFinancials(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = { courtCaseNumber: financialForm.courtCaseNumber || null }
    ;['initialPrice', 'totalCaseValue', 'workHours', 'clientProposal', 'totalUsed'].forEach(k => {
      payload[k] = financialForm[k] !== '' ? parseFloat(financialForm[k]) : null
    })
    await api.put(`/cases/${id}`, payload)
    setEditingFinancials(false)
    loadCase()
    showToast('השדות הפיננסיים עודכנו', '', 'success')
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
  if (!caseData) return <div className="text-center py-12 text-muted-foreground">תיק לא נמצא</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cases')}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">{caseData.caseNumber}</span>
              <Badge variant={STATUS_VARIANTS[caseData.status]}>{t(caseData.status)}</Badge>
            </div>
            <h1 className="text-xl font-bold mt-1">{caseData.title}</h1>
            <p className="text-sm text-muted-foreground">{caseData.clientName} · {caseData.clientPhone}</p>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowStatusRequestDialog(true)}>
              <MessageSquare className="h-4 w-4 me-1" />{t('sendStatusRequest')}
            </Button>
            <Select value={caseData.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{t(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">משימות ({caseData.tasks?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="comments">הערות ({comments.length})</TabsTrigger>
              <TabsTrigger value="documents">מסמכים ({caseData.documents?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="financial">{t('financial')}</TabsTrigger>
              <TabsTrigger value="details">פרטים</TabsTrigger>
            </TabsList>

            {/* Tasks tab */}
            <TabsContent value="tasks" className="space-y-3">
              {user?.role === 'ADMIN' && (
                <Button size="sm" onClick={() => setShowTaskDialog(true)}>
                  <Plus className="h-4 w-4 me-1" />{t('newTask')}
                </Button>
              )}
              {caseData.tasks?.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('noResults')}</p>
              ) : caseData.tasks?.map((task: any) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{task.title}</span>
                    <div className="flex gap-2">
                      <Badge variant={PRIORITY_VARIANTS[task.priority]}>{t(task.priority)}</Badge>
                      {user?.role === 'ADMIN' ? (
                        <Select value={task.status} onValueChange={async (v) => {
                          await api.put(`/tasks/${task.id}`, { status: v })
                          loadCase()
                        }}>
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{t(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{t(task.status)}</Badge>
                      )}
                    </div>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {task.assignee && <span>מוקצה ל: {task.assignee.name}</span>}
                    {task.dueDate && <span>יעד: {formatDate(task.dueDate)}</span>}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Comments tab */}
            <TabsContent value="comments" className="space-y-3">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.user?.name?.[0]}
                    </div>
                    <div className="flex-1 bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{c.user?.name}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={submitComment} className="flex gap-2">
                <Input
                  placeholder={t('writeComment')}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
              </form>
            </TabsContent>

            {/* Documents tab */}
            <TabsContent value="documents" className="space-y-3">
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4 me-1" />{t('uploadDocument')}
                </Button>
              </div>
              {caseData.documents?.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{(doc.fileSize / 1024).toFixed(1)} KB · {formatDate(doc.uploadedAt)}</p>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Financial tab */}
            <TabsContent value="financial" className="space-y-4">
              {user?.role === 'ADMIN' && !editingFinancials && (
                <Button size="sm" variant="outline" onClick={() => setEditingFinancials(true)}>{t('edit')}</Button>
              )}
              {editingFinancials ? (
                <form onSubmit={saveFinancials} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('courtCaseNumber')}</Label>
                      <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={financialForm.courtCaseNumber ?? ''} onChange={e => setFinancialForm((p: any) => ({ ...p, courtCaseNumber: e.target.value }))} />
                    </div>
                    {(['initialPrice', 'totalCaseValue', 'workHours', 'clientProposal', 'totalUsed'] as const).map(k => (
                      <div key={k}>
                        <Label>{t(k)}{k !== 'workHours' ? ' (₪)' : ''}</Label>
                        <input type="number" min="0" step="any" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={financialForm[k] ?? ''} onChange={e => setFinancialForm((p: any) => ({ ...p, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">{t('save')}</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingFinancials(false)}>{t('cancel')}</Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {caseData.courtCaseNumber && (
                    <div><span className="text-muted-foreground">{t('courtCaseNumber')}: </span><span className="font-medium">{caseData.courtCaseNumber}</span></div>
                  )}
                  {([
                    ['initialPrice', t('initialPrice')],
                    ['totalCaseValue', t('totalCaseValue')],
                    ['workHours', t('workHours')],
                    ['clientProposal', t('clientProposal')],
                    ['totalUsed', t('totalUsed')],
                  ] as [string, string][]).map(([k, label]) => caseData[k] != null ? (
                    <div key={k}>
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-medium">{k === 'workHours' ? `${caseData[k]} שע'` : `₪${Number(caseData[k]).toLocaleString()}`}</span>
                    </div>
                  ) : null)}
                  {!caseData.initialPrice && !caseData.totalCaseValue && !caseData.workHours && !caseData.courtCaseNumber && (
                    <p className="col-span-2 text-muted-foreground text-sm">לא הוזנו נתונים פיננסיים</p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Details tab */}
            <TabsContent value="details">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['לקוח', caseData.clientName],
                  ['דוא"ל', caseData.clientEmail],
                  ['טלפון', caseData.clientPhone],
                  ['סוג תיק', caseData.caseType],
                  ['בית משפט', caseData.courtName],
                  ['תאריך דיון', formatDate(caseData.courtDate)],
                  ['נוצר', formatDate(caseData.createdAt)],
                  ['עודכן', formatDate(caseData.updatedAt)],
                ].map(([label, value]) => value ? (
                  <div key={label}>
                    <span className="text-muted-foreground">{label}: </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ) : null)}
                {caseData.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">תיאור:</p>
                    <p>{caseData.description}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {statusRequests.filter(r => !r.resolved).length > 0 && (
            <div className="border border-orange-300 bg-orange-50 rounded-lg p-4">
              <h3 className="font-medium text-sm text-orange-800 mb-2">{t('pendingRequests')}</h3>
              {statusRequests.filter(r => !r.resolved).map(req => (
                <div key={req.id} className="text-xs space-y-1 mb-3 pb-3 border-b border-orange-200 last:border-0 last:mb-0 last:pb-0">
                  <p className="font-medium">{req.fromUser.name} → {req.toUser.name}</p>
                  <p className="text-orange-700">{req.message}</p>
                  <p className="text-orange-500">{formatDateTime(req.createdAt)}</p>
                  {(user?.role === 'ADMIN' || user?.id === req.toUserId) && (
                    <button onClick={() => resolveStatusRequest(req.id)} className="text-xs px-2 py-0.5 rounded border border-orange-400 hover:bg-orange-100 transition-colors">
                      {t('resolveRequest')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{t('assignedTo')}</h3>
              {user?.role === 'ADMIN' && (
                <Button variant="ghost" size="icon" onClick={() => setShowAssignDialog(true)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
            {caseData.assignments?.length === 0 ? (
              <p className="text-xs text-muted-foreground">לא הוקצו עובדים</p>
            ) : caseData.assignments?.map((a: any) => (
              <div key={a.userId} className="flex items-center justify-between py-1">
                <span className="text-sm">{a.user?.name}</span>
                {user?.role === 'ADMIN' && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAssignee(a.userId)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('newTask')}</DialogTitle></DialogHeader>
          <form onSubmit={createTask} className="space-y-4">
            <div>
              <Label>{t('taskTitle')}</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div>
              <Label>{t('description')}</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>{t('assignee')}</Label>
              <Select value={taskForm.assigneeId} onValueChange={v => setTaskForm(p => ({ ...p, assigneeId: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר עובד" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('priority')}</Label>
              <Select value={taskForm.priority} onValueChange={v => setTaskForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{t(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('dueDate')}</Label>
              <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('create')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Request Dialog */}
      <Dialog open={showStatusRequestDialog} onOpenChange={setShowStatusRequestDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('sendStatusRequest')}</DialogTitle></DialogHeader>
          <form onSubmit={sendStatusRequest} className="space-y-4">
            <div>
              <Label>עובד</Label>
              <Select value={statusRequestForm.toUserId} onValueChange={v => setStatusRequestForm(p => ({ ...p, toUserId: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר עובד" /></SelectTrigger>
                <SelectContent>
                  {caseData.assignments?.map((a: any) => (
                    <SelectItem key={a.userId} value={a.userId}>{a.user?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תוכן הבקשה</Label>
              <Textarea
                value={statusRequestForm.message}
                onChange={e => setStatusRequestForm(p => ({ ...p, message: e.target.value }))}
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowStatusRequestDialog(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={!statusRequestForm.toUserId}>שלח</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>הקצה עובד לתיק</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {users
              .filter(u => !caseData.assignments?.find((a: any) => a.userId === u.id))
              .map(u => (
                <div key={u.id} className="flex items-center justify-between border rounded-lg p-3">
                  <span>{u.name}</span>
                  <Button size="sm" onClick={() => assignUser(u.id)}>הקצה</Button>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
