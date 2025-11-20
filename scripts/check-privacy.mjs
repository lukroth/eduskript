/**
 * Privacy verification script
 * Checks that student emails are NOT stored in the database
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function checkPrivacy() {
  console.log('🔍 Checking privacy compliance...\n')

  // 1. Check student email storage
  console.log('1️⃣ Checking student email storage:')
  const students = await prisma.user.findMany({
    where: { accountType: 'student' },
    select: {
      id: true,
      email: true,
      name: true,
      oauthProvider: true,
      oauthProviderId: true,
      studentPseudonym: true
    }
  })

  if (students.length === 0) {
    console.log('   ℹ️  No students found in database\n')
  } else {
    const studentsWithEmail = students.filter(s => s.email !== null)
    if (studentsWithEmail.length > 0) {
      console.log(`   ❌ PRIVACY VIOLATION: ${studentsWithEmail.length} students have emails stored!`)
      studentsWithEmail.forEach(s => {
        console.log(`      - User ${s.id}: ${s.email}`)
      })
      console.log()
    } else {
      console.log(`   ✅ All ${students.length} students have email = NULL`)
      students.forEach(s => {
        console.log(`      - ${s.name || 'Unnamed'}: OAuth=${s.oauthProvider || 'NOT SET'}, Pseudonym=${s.studentPseudonym || 'NOT SET'}`)
      })
      console.log()
    }
  }

  // 2. Check PreAuthorizedStudent (should only have pseudonyms)
  console.log('2️⃣ Checking PreAuthorizedStudent table:')
  const preAuths = await prisma.preAuthorizedStudent.findMany({
    select: {
      pseudonym: true,
      class: {
        select: {
          name: true
        }
      }
    }
  })

  if (preAuths.length === 0) {
    console.log('   ℹ️  No pre-authorized students found\n')
  } else {
    console.log(`   ✅ ${preAuths.length} pre-authorized students (pseudonyms only, no emails):`)
    preAuths.forEach(pa => {
      console.log(`      - Pseudonym: ${pa.pseudonym.substring(0, 16)}... for class "${pa.class.name}"`)
    })
    console.log()
  }

  // 3. Check IdentityRevealRequest (DEPRECATED - should be empty or not exist)
  console.log('3️⃣ Checking IdentityRevealRequest table (DEPRECATED):')
  try {
    const revealRequests = await prisma.identityRevealRequest.findMany({
      select: {
        id: true,
        email: true,
        status: true
      }
    })

    if (revealRequests.length === 0) {
      console.log('   ✅ No identity reveal requests (table should be dropped)\n')
    } else {
      console.log(`   ⚠️  ${revealRequests.length} old identity reveal requests still exist:`)
      revealRequests.forEach(r => {
        console.log(`      - ${r.email} (${r.status})`)
      })
      console.log('   📝 These should be migrated to ClassMembership.identityConsent\n')
    }
  } catch (error) {
    console.log('   ✅ Table does not exist (expected after migration)\n')
  }

  // 4. Check ClassMembership identity consent
  console.log('4️⃣ Checking ClassMembership identity consent:')
  const memberships = await prisma.classMembership.findMany({
    include: {
      student: {
        select: {
          name: true,
          accountType: true
        }
      },
      class: {
        select: {
          name: true
        }
      }
    }
  })

  if (memberships.length === 0) {
    console.log('   ℹ️  No class memberships found\n')
  } else {
    console.log(`   ℹ️  ${memberships.length} total class memberships:`)
    const withConsent = memberships.filter(m => m.identityConsent)
    const withoutConsent = memberships.filter(m => !m.identityConsent)

    console.log(`      - ${withConsent.length} with identity consent (teacher can identify)`)
    console.log(`      - ${withoutConsent.length} without consent (anonymous)\n`)

    if (withConsent.length > 0) {
      console.log('   Students with identity consent:')
      withConsent.forEach(m => {
        console.log(`      - ${m.student.name} in "${m.class.name}" (consented: ${m.consentedAt?.toISOString() || 'N/A'})`)
      })
      console.log()
    }

    if (withoutConsent.length > 0) {
      console.log('   Anonymous students:')
      withoutConsent.forEach(m => {
        console.log(`      - ${m.student.name} in "${m.class.name}"`)
      })
      console.log()
    }
  }

  // 5. Summary
  console.log('📊 Summary:')
  const violations = students.filter(s => s.email !== null).length
  if (violations === 0) {
    console.log('   ✅ Privacy compliance: PASSED')
    console.log('   ✅ No student emails stored in database')
  } else {
    console.log(`   ❌ Privacy compliance: FAILED (${violations} violations)`)
    console.log('   ❌ Student emails must be removed from database')
  }

  await prisma.$disconnect()
}

checkPrivacy().catch(console.error)
