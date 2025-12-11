/**
 * Student Teacher Annotations API
 *
 * GET /api/student/teacher-annotations?pageId={pageId}
 * Fetch teacher annotations visible to the current student:
 * - Class broadcasts (where student is enrolled)
 * - Individual feedback (targeted at this student)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    if (!pageId) {
      return NextResponse.json(
        { error: 'pageId query parameter is required' },
        { status: 400 }
      )
    }

    // Get all classes the student is enrolled in
    const memberships = await prisma.classMembership.findMany({
      where: { studentId: userId },
      select: {
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const classIds = memberships.map(m => m.classId)

    // Fetch class broadcasts for this page from teachers of enrolled classes
    const classAnnotations = await prisma.userData.findMany({
      where: {
        targetType: 'class',
        targetId: { in: classIds },
        adapter: 'annotations',
        itemId: pageId,
      },
      select: {
        targetId: true,
        data: true,
        updatedAt: true,
      },
    })

    // Map class annotations with class info, filtering out empty/cleared annotations
    const classAnnotationsWithInfo = classAnnotations
      .filter(annotation => {
        // Skip annotations with empty canvasData (cleared by teacher)
        const data = annotation.data as { canvasData?: string } | null
        return data?.canvasData && data.canvasData.length > 0
      })
      .map(annotation => {
        const membership = memberships.find(m => m.classId === annotation.targetId)
        return {
          classId: annotation.targetId,
          className: membership?.class.name ?? 'Unknown Class',
          data: annotation.data,
          updatedAt: annotation.updatedAt.getTime(),
        }
      })

    // Fetch individual feedback targeted at this student
    const individualFeedback = await prisma.userData.findFirst({
      where: {
        targetType: 'student',
        targetId: userId,
        adapter: 'annotations',
        itemId: pageId,
      },
      select: {
        data: true,
        updatedAt: true,
      },
    })

    // Filter out empty individual feedback (cleared by teacher)
    const feedbackData = individualFeedback?.data as { canvasData?: string } | null
    const hasValidFeedback = feedbackData?.canvasData && feedbackData.canvasData.length > 0

    return NextResponse.json({
      classAnnotations: classAnnotationsWithInfo,
      individualFeedback: individualFeedback && hasValidFeedback
        ? {
            data: individualFeedback.data,
            updatedAt: individualFeedback.updatedAt.getTime(),
          }
        : null,
    })
  } catch (error) {
    console.error('[student/teacher-annotations] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
