import React, { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    firmName: '', primaryColor: '#1e40af', emailFrom: '', phone: '', address: '',
  })
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/settings').then(r => {
      setForm({
        firmName: r.data.firmName || '',
        primaryColor: r.data.primaryColor || '#1e40af',
        emailFrom: r.data.emailFrom || '',
        phone: r.data.phone || '',
        address: r.data.address || '',
      })
    }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.put('/settings', form)
      showToast('ההגדרות נשמרו', '', 'success')
    } catch {
      showToast('שגיאה בשמירת ההגדרות', '', 'error')
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('logo', file)
    await api.post('/settings/logo', fd)
    showToast('הלוגו הועלה', '', 'success')
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{t('settings')}</h1>

      <Card>
        <CardHeader><CardTitle>הגדרות המשרד</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('firmName')}</Label>
              <Input value={form.firmName} onChange={e => setForm(p => ({ ...p, firmName: e.target.value }))} />
            </div>
            <div>
              <Label>{t('primaryColor')}</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                  className="h-10 w-16 rounded border cursor-pointer"
                />
                <Input value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>דוא"ל משרד</Label>
              <Input type="email" value={form.emailFrom} onChange={e => setForm(p => ({ ...p, emailFrom: e.target.value }))} />
            </div>
            <div>
              <Label>{t('phone')}</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>{t('address')}</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <Button type="submit">{t('save')}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('firmLogo')}</CardTitle></CardHeader>
        <CardContent>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            {t('uploadLogo')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
