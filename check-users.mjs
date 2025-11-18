import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
