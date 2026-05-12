/**
 * Seed script — for development/testing only.
 * Run with: npx ts-node prisma/seed.ts
 * DO NOT run in production.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed must not run in production')
  }

  console.log('Seeding database...')

  // Create firm settings
  await prisma.firmSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', firmName: 'כהן ושות׳ — עורכי דין' },
    update: {},
  })

  // Create users
  const adminHash = await bcrypt.hash('admin1234', 12)
  const empHash = await bcrypt.hash('emp12345', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cohen-law.co.il' },
    create: { name: 'דוד כהן', email: 'admin@cohen-law.co.il', passwordHash: adminHash, role: 'ADMIN' },
    update: {},
  })

  const emp1 = await prisma.user.upsert({
    where: { email: 'sara@cohen-law.co.il' },
    create: { name: 'שרה לוי', email: 'sara@cohen-law.co.il', passwordHash: empHash, role: 'EMPLOYEE' },
    update: {},
  })

  const emp2 = await prisma.user.upsert({
    where: { email: 'avi@cohen-law.co.il' },
    create: { name: 'אבי שפירא', email: 'avi@cohen-law.co.il', passwordHash: empHash, role: 'EMPLOYEE' },
    update: {},
  })

  // Create sample cases
  const case1 = await prisma.case.create({
    data: {
      caseNumber: `2024-${Math.floor(Math.random() * 90000 + 10000)}`,
      title: 'כהן נ׳ שות׳ יצוא — תביעה חוזית',
      clientName: 'משה כהן',
      clientEmail: 'moshe@example.com',
      clientPhone: '050-1234567',
      status: 'IN_PROGRESS',
      caseType: 'מסחרי',
      description: 'תביעה בגין הפרת חוזה סחר. הלקוח מבקש פיצויים בסך 500,000 ש"ח.',
      courtDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      courtName: 'בית משפט המחוזי תל אביב',
      assignments: { create: [{ userId: admin.id }, { userId: emp1.id }] },
    },
  })

  const case2 = await prisma.case.create({
    data: {
      caseNumber: `2024-${Math.floor(Math.random() * 90000 + 10000)}`,
      title: 'גירושין — לוי-שפירא',
      clientName: 'רחל לוי',
      clientPhone: '052-7654321',
      status: 'OPEN',
      caseType: 'משפחה',
      assignments: { create: [{ userId: emp2.id }] },
    },
  })

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'הכנת כתב תביעה',
        description: 'הכין את כתב התביעה לבית המשפט',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        caseId: case1.id,
        assigneeId: emp1.id,
        createdById: admin.id,
      },
      {
        title: 'איסוף מסמכים',
        description: 'איסוף כל החוזים הרלוונטיים',
        status: 'TODO',
        priority: 'MEDIUM',
        caseId: case1.id,
        assigneeId: emp1.id,
        createdById: admin.id,
      },
      {
        title: 'פגישה עם הלקוח',
        status: 'TODO',
        priority: 'URGENT',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
        caseId: case2.id,
        assigneeId: emp2.id,
        createdById: admin.id,
      },
    ],
  })

  console.log('Seed complete!')
  console.log('Admin:    admin@cohen-law.co.il / admin1234')
  console.log('Employee: sara@cohen-law.co.il  / emp12345')
  console.log('Employee: avi@cohen-law.co.il   / emp12345')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
