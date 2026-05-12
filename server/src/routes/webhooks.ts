import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

// Verify shared secret for n8n → app webhooks
function verifySecret(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const secret = req.headers['authorization']
  if (secret !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

const createTaskSchema = z.object({
  title: z.string().min(1),
  assigneeId: z.string(),
  caseId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
})

// n8n → App: create a task
router.post('/n8n/create-task', verifySecret, async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  // Find a system user or admin to set as createdBy
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) return res.status(500).json({ error: 'No admin user found' })

  const { dueDate, ...rest } = parsed.data
  const task = await prisma.task.create({
    data: {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdById: admin.id,
    },
  })
  res.status(201).json(task)
})

export default router
