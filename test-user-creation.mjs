import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function testCreate() {
  try {
    console.log('Testing user creation with email=null...')
    
    const testUser = await prisma.user.create({
      data: {
        email: null, // NO EMAIL STORAGE FOR STUDENTS
        emailVerified: null,
        name: 'Test Student',
        image: null,
        accountType: 'student',
        studentPseudonym: null,
        oauthProvider: null,
        oauthProviderId: null,
        gdprConsentAt: null,
        lastSeenAt: new Date(),
      },
    })
    
    console.log('✅ User created successfully:', testUser)
    
    // Clean up
    await prisma.user.delete({ where: { id: testUser.id } })
    console.log('✅ Cleaned up test user')
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCreate()
