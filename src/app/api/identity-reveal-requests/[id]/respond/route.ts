import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/identity-reveal-requests/[id]/respond - Student responds to a reveal request
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: requestId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.accountType !== 'student') {
      return NextResponse.json({ error: 'Only students can respond to reveal requests' }, { status: 403 })
    }

    const body = await request.json()
    const { approved } = body

    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'approved must be a boolean' }, { status: 400 })
    }

    // Verify the request belongs to this student
    const revealRequest = await prisma.identityRevealRequest.findUnique({
      where: { id: requestId },
      include: {
        teacher: {
          select: {
            id: true
          }
        }
      }
    })

    if (!revealRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (revealRequest.studentId !== session.user.id) {
      return NextResponse.json({ error: 'You do not have permission to respond to this request' }, { status: 403 })
    }

    if (revealRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been responded to' }, { status: 400 })
    }

    // Update the request status
    const updatedRequest = await prisma.identityRevealRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? 'approved' : 'rejected',
        respondedAt: new Date()
      }
    })

    // If approved, we could optionally store the email mapping on the server
    // For now, we'll just mark it as approved and let the teacher know via the student list

    console.log('[API] Student responded to reveal request:', {
      requestId,
      studentId: session.user.id,
      approved,
      teacherId: revealRequest.teacher.id
    })

    return NextResponse.json({
      success: true,
      status: updatedRequest.status
    })
  } catch (error) {
    console.error('[API] Error responding to reveal request:', error)
    return NextResponse.json(
      { error: 'Failed to respond to request' },
      { status: 500 }
    )
  }
}
