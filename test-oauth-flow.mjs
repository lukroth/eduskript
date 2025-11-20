import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function testOAuthFlow() {
  const testEmail = 'test@example.com'
  const provider = 'azure-ad'
  const providerId = 'test-123'
  
  console.log('Step 1: Create student user without email...')
  const user = await prisma.user.create({
    data: {
      email: null,
      name: 'Test Student',
      accountType: 'student',
      lastSeenAt: new Date()
    }
  })
  console.log('✅ User created:', user.id)
  
  console.log('\nStep 2: Create OAuth Account...')
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      type: 'oauth',
      provider,
      providerAccountId: providerId,
      access_token: 'fake-token',
      token_type: 'Bearer'
    }
  })
  console.log('✅ Account linked')
  
  console.log('\nStep 3: Update user with OAuth info...')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      oauthProvider: provider,
      oauthProviderId: providerId,
      studentPseudonym: `pseudo-${providerId}`
    }
  })
  console.log('✅ User updated with OAuth info')
  
  console.log('\nStep 4: Cleanup...')
  await prisma.account.delete({ where: { id: account.id } })
  await prisma.user.delete({ where: { id: user.id } })
  console.log('✅ Cleanup complete')
  
  await prisma.$disconnect()
}

testOAuthFlow().catch(err => {
  console.error('❌ Error:', err.message)
  prisma.$disconnect()
})
