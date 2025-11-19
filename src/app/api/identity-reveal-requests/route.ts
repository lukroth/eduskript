import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/identity-reveal-requests - Get all pending requests for the current student
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.accountType !== 'student') {
      return NextResponse.json({ error: 'Only students can view reveal requests' }, { status: 403 })
    }

    const requests = await prisma.identityRevealRequest.findMany({
      where: {
        studentId: session.user.id,
        status: 'pending'
      },
      include: {
        teacher: {
          select: {
            name: true,
            email: true
          }
        },
        class: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('[API] Error fetching reveal requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reveal requests' },
      { status: 500 }
    )
  }
}

// GET /api/identity-reveal-requests/count - Get count of pending requests
export async function HEAD(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.accountType !== 'student') {
      return new NextResponse(null, { status: 401 })
    }

    const count = await prisma.identityRevealRequest.count({
      where: {
        studentId: session.user.id,
        status: 'pending'
      }
    })

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Pending-Count': count.toString()
      }
    })
  } catch (error) {
    console.error('[API] Error counting reveal requests:', error)
    return new NextResponse(null, { status: 500 })
  }
}
