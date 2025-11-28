import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inviteCodeRateLimiter, getClientIdentifier } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{
    inviteCode: string
  }>
}

// POST /api/classes/join/[inviteCode] - Student joins a class
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting to prevent invite code enumeration
    const identifier = getClientIdentifier(request)
    const rateLimit = inviteCodeRateLimiter.check(identifier)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      )
    }

    const { inviteCode } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get identity consent from request body
    const body = await request.json().catch(() => ({}))
    const { identityConsent = false } = body

    // Verify user is a student
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        accountType: true,
        studentPseudonym: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.accountType !== 'student') {
      return NextResponse.json(
        { error: 'Only students can join classes' },
        { status: 403 }
      )
    }

    // Find the class by invite code
    const classRecord = await prisma.class.findUnique({
      where: { inviteCode },
      include: {
        teacher: {
          select: {
            name: true,
            pageSlug: true
          }
        }
      }
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    if (!classRecord.isActive) {
      return NextResponse.json(
        { error: 'This class is no longer active' },
        { status: 403 }
      )
    }

    // Check if already a member
    const existingMembership = await prisma.classMembership.findUnique({
      where: {
        classId_studentId: {
          classId: classRecord.id,
          studentId: session.user.id
        }
      }
    })

    if (existingMembership) {
      return NextResponse.json({
        message: 'Already a member of this class',
        class: {
          id: classRecord.id,
          name: classRecord.name,
          description: classRecord.description,
          teacherName: classRecord.teacher.name
        },
        alreadyMember: true
      })
    }

    // Check if this student was pre-authorized (teacher has their email)
    let wasPreAuthorized = false
    if (user.studentPseudonym) {
      const preAuth = await prisma.preAuthorizedStudent.findUnique({
        where: {
          classId_pseudonym: {
            classId: classRecord.id,
            pseudonym: user.studentPseudonym
          }
        }
      })
      wasPreAuthorized = !!preAuth

      // If pre-authorized, teacher has their email - consent is REQUIRED
      if (wasPreAuthorized && !identityConsent) {
        return NextResponse.json({
          error: 'This teacher has your email address. You must consent to identity reveal to join this class.',
          requiresConsent: true
        }, { status: 400 })
      }
    }

    // Create membership with identity consent
    await prisma.classMembership.create({
      data: {
        classId: classRecord.id,
        studentId: session.user.id,
        identityConsent: wasPreAuthorized ? true : (identityConsent || false),
        consentedAt: (wasPreAuthorized || identityConsent) ? new Date() : null
      }
    })

    // If this student was pre-authorized, remove from pre-auth table
    if (wasPreAuthorized && user.studentPseudonym) {
      await prisma.preAuthorizedStudent.deleteMany({
        where: {
          classId: classRecord.id,
          pseudonym: user.studentPseudonym
        }
      })
    }

    console.log('[API] Student joined class:', {
      classId: classRecord.id,
      studentId: session.user.id,
      inviteCode,
      wasPreAuthorized,
      identityConsent: wasPreAuthorized ? true : (identityConsent || false)
    })

    return NextResponse.json({
      message: 'Successfully joined class',
      class: {
        id: classRecord.id,
        name: classRecord.name,
        description: classRecord.description,
        teacherName: classRecord.teacher.name
      },
      identityRevealed: wasPreAuthorized || identityConsent
    }, { status: 201 })
  } catch (error) {
    console.error('[API] Error joining class:', error)
    return NextResponse.json(
      { error: 'Failed to join class' },
      { status: 500 }
    )
  }
}

// GET /api/classes/join/[inviteCode] - Preview class info before joining
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting to prevent invite code enumeration
    const identifier = getClientIdentifier(request)
    const rateLimit = inviteCodeRateLimiter.check(identifier)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      )
    }

    const { inviteCode} = await params

    // Find the class by invite code
    const classRecord = await prisma.class.findUnique({
      where: { inviteCode },
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
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    if (!classRecord.isActive) {
      return NextResponse.json(
        { error: 'This class is no longer active' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      class: {
        name: classRecord.name,
        description: classRecord.description,
        teacherName: classRecord.teacher.name,
        memberCount: classRecord._count.memberships
      }
    })
  } catch (error) {
    console.error('[API] Error previewing class:', error)
    return NextResponse.json(
      { error: 'Failed to preview class' },
      { status: 500 }
    )
  }
}
