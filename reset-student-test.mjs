import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function reset() {
  console.log('Resetting student test data...\n')

  // Delete all class memberships for students
  const deleted = await prisma.classMembership.deleteMany({
    where: {
      student: {
        accountType: 'student'
      }
    }
  })
  console.log(`✅ Deleted ${deleted.count} class membership(s)`)

  // Delete all OAuth accounts for students
  const students = await prisma.user.findMany({
    where: { accountType: 'student' },
    select: { id: true }
  })

  for (const student of students) {
    await prisma.account.deleteMany({
      where: { userId: student.id }
    })
    await prisma.session.deleteMany({
      where: { userId: student.id }
    })
  }
  console.log('✅ Deleted OAuth accounts and sessions')

  // Delete all students
  const deletedUsers = await prisma.user.deleteMany({
    where: { accountType: 'student' }
  })
  console.log(`✅ Deleted ${deletedUsers.count} student(s)`)

  // Check remaining pre-authorizations
  const preAuths = await prisma.preAuthorizedStudent.findMany({
    include: {
      class: {
        select: { name: true }
      }
    }
  })

  console.log(`\n📋 ${preAuths.length} pre-authorization(s) remain:`)
  preAuths.forEach(pa => {
    console.log(`  - ${pa.class.name}: ${pa.pseudonym}`)
  })

  await prisma.$disconnect()
}

reset().catch(err => {
  console.error('Error:', err)
  prisma.$disconnect()
})
