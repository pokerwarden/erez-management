import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

const CASE_TYPES = ['פלילי', 'אזרחי', 'משפחה', 'עבודה', 'מקרקעין', 'מסחרי', 'אחר']

export default function NewCasePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    title: '', clientName: '', clientEmail: '', clientPhone: '',
    description: '', caseType: '', courtDate: '', courtName: '',
  })
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/cases', form)
      showToast('התיק נוצר בהצלחה', '', 'success')
      navigate(`/cases/${res.data.id}`)
    } catch (err: any) {
      showToast('שגיאה ביצירת התיק', err.response?.data?.error || '', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cases')}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{t('newCase')}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>פרטי תיק</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{t('caseTitle')} *</Label>
                <Input value={form.title} onChange={set('title')} required />
              </div>
              <div className="col-span-2">
                <Label>{t('clientName')} *</Label>
                <Input value={form.clientName} onChange={set('clientName')} required />
              </div>
              <div>
                <Label>{t('email')}</Label>
                <Input type="email" value={form.clientEmail} onChange={set('clientEmail')} />
              </div>
              <div>
                <Label>{t('phone')}</Label>
                <Input value={form.clientPhone} onChange={set('clientPhone')} />
              </div>
              <div>
                <Label>{t('caseType')}</Label>
                <Select value={form.caseType} onValueChange={v => setForm(p => ({ ...p, caseType: v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('courtDate')}</Label>
                <Input type="datetime-local" value={form.courtDate} onChange={set('courtDate')} />
              </div>
              <div className="col-span-2">
                <Label>{t('courtName')}</Label>
                <Input value={form.courtName} onChange={set('courtName')} />
              </div>
              <div className="col-span-2">
                <Label>{t('description')}</Label>
                <Textarea value={form.description} onChange={set('description')} rows={4} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/cases')}>{t('cancel')}</Button>
              <Button type="submit" disabled={loading}>{loading ? t('loading') : t('create')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
