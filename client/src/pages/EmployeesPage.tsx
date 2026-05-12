import React, { useEffect, useState } from 'react'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function EmployeesPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const res = await api.get('/users')
    setUsers(res.data)
    setLoading(false)
  }

  function openCreate() {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' })
    setShowDialog(true)
  }

  function openEdit(user: any) {
    setEditUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setShowDialog(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editUser) {
        const data: any = { name: form.name, email: form.email, role: form.role }
        if (form.password) data.password = form.password
        await api.put(`/users/${editUser.id}`, data)
        showToast('המשתמש עודכן', '', 'success')
      } else {
        await api.post('/users', form)
        showToast('המשתמש נוצר', '', 'success')
      }
      setShowDialog(false)
      fetchUsers()
    } catch (err: any) {
      showToast('שגיאה', err.response?.data?.error || '', 'error')
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('האם למחוק את המשתמש?')) return
    await api.delete(`/users/${id}`)
    showToast('המשתמש נמחק', '', 'success')
    fetchUsers()
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('employees')}</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 me-1" />הוסף עובד
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-right py-3 px-4 font-medium">{t('name')}</th>
              <th className="text-right py-3 px-4 font-medium">{t('email')}</th>
              <th className="text-right py-3 px-4 font-medium">תפקיד</th>
              <th className="text-right py-3 px-4 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t hover:bg-muted/50">
                <td className="py-3 px-4 font-medium">{u.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                <td className="py-3 px-4">
                  <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>{t(u.role)}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? 'ערוך עובד' : 'הוסף עובד'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('name')}</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <Label>{t('email')}</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <Label>{editUser ? 'סיסמה חדשה (השאר ריק לשמירת הקיימת)' : t('password')}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required={!editUser}
                minLength={8}
              />
            </div>
            <div>
              <Label>תפקיד</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('ADMIN')}</SelectItem>
                  <SelectItem value="EMPLOYEE">{t('EMPLOYEE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{t('cancel')}</Button>
              <Button type="submit">{editUser ? t('save') : t('create')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
