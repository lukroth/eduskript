import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function checkAccounts() {
  const accounts = await prisma.account.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          accountType: true
        }
      }
    }
  })

  console.log(`Found ${accounts.length} OAuth accounts:`)
  accounts.forEach(acc => {
    console.log(`\n- Provider: ${acc.provider}`)
    console.log(`  Provider Account ID: ${acc.providerAccountId}`)
    console.log(`  User ID: ${acc.userId}`)
    console.log(`  User exists: ${acc.user ? 'YES' : 'NO (ORPHANED!)'}`)
    if (acc.user) {
      console.log(`  User: ${acc.user.name} (${acc.user.email || 'NO EMAIL'}) - ${acc.user.accountType}`)
    }
  })

  await prisma.$disconnect()
}

checkAccounts()
