import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/classes/[id]/students - List students in a class
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: classId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify class exists and user owns it
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    })

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classRecord.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this class' },
        { status: 403 }
      )
    }

    // Get all members
    const memberships = await prisma.classMembership.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentPseudonym: true,
            lastSeenAt: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    return NextResponse.json({
      students: memberships.map(m => ({
        id: m.student.id,
        displayName: m.student.name, // e.g., "Student a1b2"
        pseudonym: m.student.studentPseudonym, // e.g., "a1b2c3d4e5f6g7h8"
        email: `student_${m.student.studentPseudonym}@eduskript.local`,
        joinedAt: m.joinedAt,
        lastSeenAt: m.student.lastSeenAt
      }))
    })
  } catch (error) {
    console.error('[API] Error listing class students:', error)
    return NextResponse.json(
      { error: 'Failed to list students' },
      { status: 500 }
    )
  }
}
