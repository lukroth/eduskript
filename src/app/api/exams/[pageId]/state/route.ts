/**
 * Exam State API Route
 *
 * Manages exam lifecycle per class:
 * - GET: Retrieve exam state for a class
 * - POST: Set exam state directly (teacher only)
 *
 * States (teachers can freely switch between any):
 * - "closed": Students cannot enter at all
 * - "lobby": Students can enter but see waiting room until opened
 * - "open": Students can take the exam
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events'

type ExamState = 'closed' | 'lobby' | 'open'
const VALID_STATES: ExamState[] = ['closed', 'lobby', 'open']

/**
 * GET /api/exams/[pageId]/state?classId=xxx
 * Get exam state for a specific class
 * Accessible by: teacher (page author) or students in the class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'classId query parameter is required' },
        { status: 400 }
      )
    }

    // Check if exam state exists
    const examState = await prisma.examState.findUnique({
      where: {
        pageId_classId: { pageId, classId }
      },
      include: {
        class: {
          select: { id: true, name: true }
        }
      }
    })

    if (!examState) {
      // No exam state means exam hasn't been unlocked for this class
      return NextResponse.json({
        state: null,
        message: 'Exam not unlocked for this class'
      })
    }

    return NextResponse.json({
      id: examState.id,
      state: examState.state,
      openedAt: examState.openedAt,
      closedAt: examState.closedAt,
      className: examState.class.name
    })
  } catch (error) {
    console.error('Error fetching exam state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/exams/[pageId]/state
 * Set exam state directly
 * Body: { classId: string, state: "closed" | "lobby" | "open" }
 * Only accessible by page authors who are also the class teacher
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pageId } = await params
    const body = await request.json()
    const { classId, state: newState } = body

    if (!classId || !newState) {
      return NextResponse.json(
        { error: 'classId and state are required' },
        { status: 400 }
      )
    }

    if (!VALID_STATES.includes(newState)) {
      return NextResponse.json(
        { error: 'state must be "closed", "lobby", or "open"' },
        { status: 400 }
      )
    }

    // Verify user is a page author
    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        authors: {
          some: { userId: session.user.id }
        }
      }
    })

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found or access denied' },
        { status: 404 }
      )
    }

    // Verify user is the teacher of this class
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: session.user.id
      }
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Class not found or you are not the teacher' },
        { status: 403 }
      )
    }

    // Check if exam state exists (should be created when class was unlocked)
    let examState = await prisma.examState.findUnique({
      where: {
        pageId_classId: { pageId, classId }
      }
    })

    // If no exam state, create one (fallback for existing unlocks before this feature)
    if (!examState) {
      examState = await prisma.examState.create({
        data: {
          pageId,
          classId,
          state: 'closed'
        }
      })
    }

    // Track timestamps based on state changes
    let openedAt: Date | null = examState.openedAt
    let closedAt: Date | null = examState.closedAt

    // If transitioning to open, set openedAt
    if (newState === 'open' && examState.state !== 'open') {
      openedAt = new Date()
      closedAt = null // Clear closedAt when opening
    }
    // If transitioning away from open, set closedAt
    else if (newState !== 'open' && examState.state === 'open') {
      closedAt = new Date()
    }

    // Update the exam state
    const updatedState = await prisma.examState.update({
      where: {
        pageId_classId: { pageId, classId }
      },
      data: {
        state: newState,
        openedAt,
        closedAt
      },
      include: {
        class: {
          select: { id: true, name: true }
        }
      }
    })

    // Emit SSE event for waiting room real-time updates
    await eventBus.publish(`exam:${pageId}:${classId}`, {
      type: 'exam-state-change',
      pageId,
      classId,
      state: newState as ExamState,
      timestamp: Date.now()
    })

    return NextResponse.json({
      id: updatedState.id,
      state: updatedState.state,
      openedAt: updatedState.openedAt,
      closedAt: updatedState.closedAt,
      className: updatedState.class.name
    })
  } catch (error) {
    console.error('Error updating exam state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
