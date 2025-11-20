import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log('All users:')
  console.table(users)

  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      userId: true,
      user: {
        select: {
          email: true,
          name: true,
          isAdmin: true,
        }
      }
    }
  })

  console.log('\nAll OAuth accounts:')
  console.table(accounts)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
