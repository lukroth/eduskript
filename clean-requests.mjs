#!/usr/bin/env node

/**
 * Clean up identity reveal requests for testing
 * This script deletes all pending identity reveal requests for a specific teacher's classes
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './prisma/data/dev.db'}`
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const teacherEmail = process.argv[2]

  if (!teacherEmail) {
    console.error('Usage: node clean-requests.mjs <teacher-email>')
    console.error('Example: node clean-requests.mjs teacher@example.com')
    process.exit(1)
  }

  try {
    // Find the teacher
    const teacher = await prisma.user.findUnique({
      where: { email: teacherEmail },
      select: { id: true, name: true, email: true }
    })

    if (!teacher) {
      console.error(`❌ Teacher not found with email: ${teacherEmail}`)
      process.exit(1)
    }

    console.log(`Found teacher: ${teacher.name} (${teacher.email})`)

    // Get all classes for this teacher
    const classes = await prisma.class.findMany({
      where: { teacherId: teacher.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: { identityRevealRequests: true }
        }
      }
    })

    console.log(`\nFound ${classes.length} class(es):`)
    classes.forEach(cls => {
      console.log(`  - ${cls.name} (${cls._count.identityRevealRequests} requests)`)
    })

    // Delete all identity reveal requests for these classes
    const result = await prisma.identityRevealRequest.deleteMany({
      where: {
        classId: { in: classes.map(c => c.id) }
      }
    })

    console.log(`\n✅ Deleted ${result.count} identity reveal request(s)`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
