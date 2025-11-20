import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter, log: ['query', 'error', 'warn'] })

async function testMinimalCreate() {
  try {
    console.log('Testing minimal user creation...')
    
    const user = await prisma.user.create({
      data: {
        name: 'Test Minimal',
        accountType: 'student'
      }
    })
    
    console.log('✅ Created:', user)
    
    await prisma.user.delete({ where: { id: user.id } })
    console.log('✅ Cleaned up')
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testMinimalCreate()
