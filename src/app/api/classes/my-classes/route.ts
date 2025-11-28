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
                pageSlug: true
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

    // Get student's pseudonym to check for pre-authorizations (join requests)
    const studentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { studentPseudonym: true }
    })

    // Get all pending join requests for this student (via pseudonym match)
    const joinRequests = studentUser?.studentPseudonym
      ? await prisma.preAuthorizedStudent.findMany({
          where: {
            pseudonym: studentUser.studentPseudonym
          },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                description: true,
                inviteCode: true,
                teacher: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        })
      : []

    // Group join requests by class ID
    const requestsByClass = new Map<string, typeof joinRequests>()
    joinRequests.forEach(req => {
      const classId = req.classId
      if (!requestsByClass.has(classId)) {
        requestsByClass.set(classId, [])
      }
      requestsByClass.get(classId)!.push(req)
    })

    return NextResponse.json({
      classes: memberships.map(m => ({
        id: m.class.id,
        name: m.class.name,
        description: m.class.description,
        teacherName: m.class.teacher.name,
        memberCount: m.class._count.memberships,
        joinedAt: m.joinedAt,
      })),
      // Include pending join requests as separate list (not grouped by class)
      joinRequests: joinRequests.map(req => ({
        classId: req.classId,
        className: req.class.name,
        classDescription: req.class.description,
        teacherName: req.class.teacher.name,
        inviteCode: req.class.inviteCode,
        addedAt: req.addedAt
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
