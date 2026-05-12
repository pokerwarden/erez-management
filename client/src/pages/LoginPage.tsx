import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSetup, setIsSetup] = useState(false)
  const [setupForm, setSetupForm] = useState({ name: '', email: '', password: '' })
  const [setupError, setSetupError] = useState('')

  useEffect(() => {
    if (user) {
      navigate(user.role === 'ADMIN' ? '/admin' : '/my-tasks')
      return
    }
    api.get('/setup/status').then(r => {
      if (!r.data.initialized) setIsSetup(true)
    }).catch(() => {})
  }, [user])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בכניסה')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setSetupError('')
    setLoading(true)
    try {
      await api.post('/setup/init', setupForm)
      await login(setupForm.email, setupForm.password)
    } catch (err: any) {
      setSetupError(err.response?.data?.error || 'שגיאה בהגדרה')
    } finally {
      setLoading(false)
    }
  }

  if (isSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('setupTitle')}</CardTitle>
            <CardDescription>{t('setupDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <Label htmlFor="setup-name">{t('adminName')}</Label>
                <Input
                  id="setup-name"
                  value={setupForm.name}
                  onChange={e => setSetupForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="setup-email">{t('email')}</Label>
                <Input
                  id="setup-email"
                  type="email"
                  value={setupForm.email}
                  onChange={e => setSetupForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="setup-password">{t('password')}</Label>
                <Input
                  id="setup-password"
                  type="password"
                  value={setupForm.password}
                  onChange={e => setSetupForm(p => ({ ...p, password: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              {setupError && <p className="text-destructive text-sm">{setupError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('loading') : t('create')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('loginTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('loading') : t('login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
