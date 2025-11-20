import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function checkJoinRequests() {
  console.log('\n=== CHECKING JOIN REQUESTS ===\n')

  // Get all students
  const students = await prisma.user.findMany({
    where: { accountType: 'student' },
    select: {
      id: true,
      name: true,
      email: true,
      studentPseudonym: true,
      oauthProvider: true,
      oauthProviderId: true
    }
  })

  console.log(`Found ${students.length} student(s):\n`)
  students.forEach(s => {
    console.log(`- ID: ${s.id}`)
    console.log(`  Name: ${s.name}`)
    console.log(`  Email: ${s.email || 'NULL (privacy-protected)'}`)
    console.log(`  Pseudonym: ${s.studentPseudonym}`)
    console.log(`  OAuth: ${s.oauthProvider}:${s.oauthProviderId}`)
    console.log()
  })

  // Get all pre-authorized students
  const preAuths = await prisma.preAuthorizedStudent.findMany({
    include: {
      class: {
        select: {
          id: true,
          name: true,
          teacher: {
            select: { name: true }
          }
        }
      }
    }
  })

  console.log(`\nFound ${preAuths.length} pre-authorization(s):\n`)
  preAuths.forEach(pa => {
    console.log(`- Class: ${pa.class.name} (Teacher: ${pa.class.teacher.name})`)
    console.log(`  Pseudonym: ${pa.pseudonym}`)
    console.log(`  Added: ${pa.addedAt}`)

    // Check if pseudonym matches any student
    const matchingStudent = students.find(s => s.studentPseudonym === pa.pseudonym)
    if (matchingStudent) {
      console.log(`  ✅ MATCHES STUDENT: ${matchingStudent.name} (${matchingStudent.id})`)
    } else {
      console.log(`  ❌ NO MATCHING STUDENT`)
    }
    console.log()
  })

  await prisma.$disconnect()
}

checkJoinRequests().catch(err => {
  console.error('Error:', err)
  prisma.$disconnect()
})
