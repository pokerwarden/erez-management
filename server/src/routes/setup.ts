import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

const initSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

router.get('/status', async (_req, res) => {
  const count = await prisma.user.count()
  res.json({ initialized: count > 0 })
})

router.post('/init', async (req, res) => {
  const count = await prisma.user.count()
  if (count > 0) {
    return res.status(403).json({ error: 'Already initialized' })
  }

  const parsed = initSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { name, email, password } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true },
  })

  // Create default firm settings
  await prisma.firmSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  res.json({ success: true, user })
})

router.post('/seed-demo', async (_req, res) => {
  // Clear existing data
  await prisma.task.deleteMany()
  await prisma.caseAssignment.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.case.deleteMany()
  await prisma.user.deleteMany()
  await prisma.firmSettings.deleteMany()

  const hash = await bcrypt.hash('demo1234', 10)

  // Create employees
  const [moshe, rachel, david, admin] = await Promise.all([
    prisma.user.create({ data: { name: 'משה לוי', email: 'moshe@lawfirm.co.il', passwordHash: hash, role: 'EMPLOYEE' } }),
    prisma.user.create({ data: { name: 'רחל כהן', email: 'rachel@lawfirm.co.il', passwordHash: hash, role: 'EMPLOYEE' } }),
    prisma.user.create({ data: { name: 'דוד ישראלי', email: 'david@lawfirm.co.il', passwordHash: hash, role: 'EMPLOYEE' } }),
    prisma.user.create({ data: { name: 'מנהל מערכת', email: 'admin@lawfirm.co.il', passwordHash: hash, role: 'ADMIN' } }),
  ])

  await prisma.firmSettings.create({ data: { id: 'singleton', firmName: 'משרד עורכי דין כהן ושות\'' } })

  // Create cases
  const [case1, case2, case3, case4] = await Promise.all([
    prisma.case.create({ data: { caseNumber: 'ת"א-2024-0041', title: 'תביעת נזיקין - לוי נ\' חברת ביטוח', clientName: 'אברהם לוי', status: 'IN_PROGRESS', courtDate: new Date('2025-06-15') } }),
    prisma.case.create({ data: { caseNumber: 'ת"פ-2024-0118', title: 'ייצוג בהליך פלילי - מדינה נ\' כהן', clientName: 'יעקב כהן', status: 'OPEN', courtDate: new Date('2025-05-28') } }),
    prisma.case.create({ data: { caseNumber: 'ת"ע-2024-0209', title: 'ירושה ועיזבון - משפחת גולן', clientName: 'שרה גולן', status: 'PENDING_CLIENT' } }),
    prisma.case.create({ data: { caseNumber: 'ת"א-2024-0302', title: 'סכסוך מסחרי - שותפות דן', clientName: 'דניאל מזרחי', status: 'OPEN', courtDate: new Date('2025-07-10') } }),
  ])

  // Assign employees to cases
  await Promise.all([
    prisma.caseAssignment.create({ data: { caseId: case1.id, userId: moshe.id } }),
    prisma.caseAssignment.create({ data: { caseId: case1.id, userId: rachel.id } }),
    prisma.caseAssignment.create({ data: { caseId: case2.id, userId: david.id } }),
    prisma.caseAssignment.create({ data: { caseId: case3.id, userId: rachel.id } }),
    prisma.caseAssignment.create({ data: { caseId: case4.id, userId: moshe.id } }),
    prisma.caseAssignment.create({ data: { caseId: case4.id, userId: david.id } }),
  ])

  // Create tasks
  await prisma.task.createMany({ data: [
    { title: 'הגשת כתב תביעה מתוקן', caseId: case1.id, assigneeId: moshe.id, createdById: admin.id, status: 'IN_PROGRESS', priority: 'URGENT', dueDate: new Date('2025-05-20') },
    { title: 'איסוף חוות דעת רפואית', caseId: case1.id, assigneeId: moshe.id, createdById: admin.id, status: 'TODO', priority: 'HIGH', dueDate: new Date('2025-05-30') },
    { title: 'עיון בתיק בית המשפט', caseId: case1.id, assigneeId: rachel.id, createdById: admin.id, status: 'DONE', priority: 'MEDIUM' },
    { title: 'הכנת תחשיב נזק', caseId: case1.id, assigneeId: rachel.id, createdById: admin.id, status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2025-05-25') },
    { title: 'הכנה לדיון ראשון', caseId: case2.id, assigneeId: david.id, createdById: admin.id, status: 'TODO', priority: 'URGENT', dueDate: new Date('2025-05-27') },
    { title: 'עיון בראיות התביעה', caseId: case2.id, assigneeId: david.id, createdById: admin.id, status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: 'יצירת קשר עם לקוח לחתימה', caseId: case3.id, assigneeId: rachel.id, createdById: admin.id, status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2025-06-01') },
    { title: 'בדיקת צוואה ונכסי עיזבון', caseId: case3.id, assigneeId: rachel.id, createdById: admin.id, status: 'TODO', priority: 'LOW' },
    { title: 'ניסוח הסכם שותפות', caseId: case4.id, assigneeId: moshe.id, createdById: admin.id, status: 'TODO', priority: 'HIGH', dueDate: new Date('2025-06-05') },
    { title: 'בדיקת חוזים קיימים', caseId: case4.id, assigneeId: david.id, createdById: admin.id, status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: 'תיאום ישיבת גישור', caseId: case4.id, assigneeId: david.id, createdById: admin.id, status: 'TODO', priority: 'HIGH', dueDate: new Date('2025-06-10') },
  ]})

  res.json({ success: true, message: 'נתוני דמו נטענו בהצלחה' })
})

export default router
