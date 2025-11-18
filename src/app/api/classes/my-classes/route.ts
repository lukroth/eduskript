import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/classes/my-classes - Get student's enrolled classes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a student
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountType: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.accountType !== 'student') {
      return NextResponse.json(
        { error: 'Only students can view enrolled classes' },
        { status: 403 }
      )
    }

    // Get all classes the student is enrolled in
    const memberships = await prisma.classMembership.findMany({
      where: {
        studentId: session.user.id
      },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                name: true,
                subdomain: true
              }
            },
            _count: {
              select: {
                memberships: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    return NextResponse.json({
      classes: memberships.map(m => ({
        id: m.class.id,
        name: m.class.name,
        description: m.class.description,
        teacherName: m.class.teacher.name,
        memberCount: m.class._count.memberships,
        joinedAt: m.joinedAt
      }))
    })
  } catch (error) {
    console.error('[API] Error getting student classes:', error)
    return NextResponse.json(
      { error: 'Failed to get classes' },
      { status: 500 }
    )
  }
}
