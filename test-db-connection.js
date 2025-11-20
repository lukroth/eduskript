import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

async function testConnection() {
  const adapter = new PrismaLibSql({
    url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
  })
  const prisma = new PrismaClient({ adapter })
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query successful:', result)
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
