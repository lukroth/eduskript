import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function checkDB() {
  console.log('=== ALL USERS ===')
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      accountType: true,
      oauthProvider: true,
      oauthProviderId: true,
      studentPseudonym: true
    }
  })
  console.log(JSON.stringify(users, null, 2))
  
  console.log('\n=== ALL CLASS MEMBERSHIPS ===')
  const memberships = await prisma.classMembership.findMany()
  console.log(JSON.stringify(memberships, null, 2))
  
  console.log('\n=== ALL CLASSES ===')
  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      inviteCode: true,
      teacherId: true
    }
  })
  console.log(JSON.stringify(classes, null, 2))
  
  await prisma.$disconnect()
}

checkDB().catch(console.error)
