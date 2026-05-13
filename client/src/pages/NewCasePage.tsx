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
    courtCaseNumber: '',
    initialPrice: '', totalCaseValue: '', workHours: '', clientProposal: '', totalUsed: '',
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
      const payload = {
        ...form,
        initialPrice: form.initialPrice ? parseFloat(form.initialPrice) : undefined,
        totalCaseValue: form.totalCaseValue ? parseFloat(form.totalCaseValue) : undefined,
        workHours: form.workHours ? parseFloat(form.workHours) : undefined,
        clientProposal: form.clientProposal ? parseFloat(form.clientProposal) : undefined,
        totalUsed: form.totalUsed ? parseFloat(form.totalUsed) : undefined,
      }
      const res = await api.post('/cases', payload)
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
              <div>
                <Label>{t('courtCaseNumber')}</Label>
                <Input value={form.courtCaseNumber} onChange={set('courtCaseNumber')} placeholder="מספר שמקצה בית המשפט" />
              </div>
              <div className="col-span-2">
                <Label>{t('description')}</Label>
                <Textarea value={form.description} onChange={set('description')} rows={4} />
              </div>
              <div className="col-span-2 border-t pt-4">
                <h3 className="font-medium mb-3">{t('financial')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('initialPrice')} (₪)</Label>
                    <Input type="number" min="0" value={form.initialPrice} onChange={set('initialPrice')} />
                  </div>
                  <div>
                    <Label>{t('totalCaseValue')} (₪)</Label>
                    <Input type="number" min="0" value={form.totalCaseValue} onChange={set('totalCaseValue')} />
                  </div>
                  <div>
                    <Label>{t('workHours')}</Label>
                    <Input type="number" min="0" step="0.5" value={form.workHours} onChange={set('workHours')} />
                  </div>
                  <div>
                    <Label>{t('clientProposal')} (₪)</Label>
                    <Input type="number" min="0" value={form.clientProposal} onChange={set('clientProposal')} />
                  </div>
                  <div>
                    <Label>{t('totalUsed')} (₪)</Label>
                    <Input type="number" min="0" value={form.totalUsed} onChange={set('totalUsed')} />
                  </div>
                </div>
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
