import api from './api'
import { DEMO_USER, DEMO_USERS, DEMO_CASES, DEMO_TASKS, DEMO_SETTINGS } from './demo-data'

export function setupDemoMock() {
  api.interceptors.request.use((config) => {
    // Mark request as demo so response interceptor can handle it
    ;(config as any)._demo = true
    return config
  })

  api.interceptors.response.use(undefined, async (error) => {
    const url: string = error.config?.url || ''

    // Auth
    if (url.includes('/auth/me')) return { data: DEMO_USER }
    if (url.includes('/auth/login')) return { data: { token: 'demo', user: DEMO_USER } }
    if (url.includes('/auth/logout')) return { data: { success: true } }

    // Setup
    if (url.includes('/setup/status')) return { data: { initialized: true } }

    // Settings
    if (url.includes('/settings')) return { data: DEMO_SETTINGS }

    // Users
    if (url.includes('/users')) return { data: DEMO_USERS }

    // Cases list
    if (url.match(/\/cases$/) || url.match(/\/cases\?/)) {
      return { data: { cases: DEMO_CASES, total: DEMO_CASES.length, page: 1, limit: 20 } }
    }

    // Case detail
    if (url.match(/\/cases\/case-\d/)) {
      const id = url.split('/cases/')[1].split('?')[0]
      const found = DEMO_CASES.find(c => c.id === id) || DEMO_CASES[0]
      return { data: { ...found, tasks: DEMO_TASKS.filter(t => t.caseId === found.id), documents: [], comments: [] } }
    }

    // Tasks
    if (url.match(/\/tasks/)) {
      return { data: { tasks: DEMO_TASKS, total: DEMO_TASKS.length } }
    }

    // Comments
    if (url.includes('/comments')) return { data: [] }

    // Documents
    if (url.includes('/documents')) return { data: [] }

    // Notifications
    if (url.includes('/notifications')) return { data: { notifications: [], unreadCount: 0 } }

    // Default: return empty success
    return { data: { success: true } }
  })
}
