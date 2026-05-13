import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { emitToAll, emitToUser } from '../lib/socket'
import axios from 'axios'

const router = Router()

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().optional(),
  billing: z.number().optional().nullable(),
  caseId: z.string().optional(),
  assigneeId: z.string(),
})

router.get('/', requireAuth, async (req, res) => {
  const { assignee, status, caseId, page = '1', limit = '50' } = req.query as Record<string, string>

  const where: Record<string, unknown> = {}
  if (assignee) where.assigneeId = assignee
  if (status) where.status = status
  if (caseId) where.caseId = caseId

  // Employees can only see their own tasks
  if (req.user!.role === 'EMPLOYEE') {
    where.assigneeId = req.user!.id
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
        case: { select: { id: true, caseNumber: true, title: true } },
      },
    }),
    prisma.task.count({ where }),
  ])

  res.json({ tasks, total })
})

router.get('/:id', requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  })
  if (!task) return res.status(404).json({ error: 'Task not found' })

  if (req.user!.role === 'EMPLOYEE' && task.assigneeId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json(task)
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = taskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { dueDate, ...rest } = parsed.data
  const task = await prisma.task.create({
    data: {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdById: req.user!.id,
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  })

  // Notify assignee
  const notification = await prisma.notification.create({
    data: {
      userId: task.assigneeId,
      title: 'משימה חדשה הוקצתה אליך',
      message: `${task.title}`,
      type: 'TASK_ASSIGNED',
      linkTo: task.caseId ? `/cases/${task.caseId}` : '/my-tasks',
    },
  })

  emitToAll('task:created', task)
  emitToUser(task.assigneeId, 'task:assigned', { task, notification })
  emitToUser(task.assigneeId, 'notification:new', notification)

  res.status(201).json(task)
})

router.put('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Task not found' })

  if (req.user!.role === 'EMPLOYEE' && existing.assigneeId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Employees can only update status
  let updateData: Record<string, unknown> = {}
  if (req.user!.role === 'EMPLOYEE') {
    const { status } = z.object({ status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']) }).parse(req.body)
    updateData = { status }
  } else {
    const parsed = taskSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { dueDate, ...rest } = parsed.data
    updateData = { ...rest, dueDate: dueDate ? new Date(dueDate) : undefined }
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  })

  emitToAll('task:updated', task)

  // If reassigned, notify new assignee
  if (updateData.assigneeId && updateData.assigneeId !== existing.assigneeId) {
    const notification = await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        title: 'משימה חדשה הוקצתה אליך',
        message: task.title,
        type: 'TASK_ASSIGNED',
        linkTo: task.caseId ? `/cases/${task.caseId}` : '/my-tasks',
      },
    })
    emitToUser(task.assigneeId, 'task:assigned', { task, notification })
    emitToUser(task.assigneeId, 'notification:new', notification)
  }

  // Check if overdue and notify n8n
  if (task.dueDate && task.dueDate < new Date() && task.status !== 'DONE' && process.env.N8N_WEBHOOK_BASE) {
    axios
      .post(`${process.env.N8N_WEBHOOK_BASE}/task-overdue`, { task, assignee: task.assignee })
      .catch(() => {/* non-critical */})
  }

  res.json(task)
})

router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
