/**
 * Dev-only endpoint to clear all user data for a specific page
 * Only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pageId = searchParams.get('pageId')

  if (!pageId) {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 })
  }

  try {
    // Delete all user data entries for this user and page
    // This includes quiz answers, code, annotations, etc.
    const deleted = await prisma.userData.deleteMany({
      where: {
        userId: session.user.id,
        itemId: pageId,
      },
    })

    // Also delete quiz-specific entries that might use componentId as itemId
    // Quiz data uses adapter like 'quiz-{componentId}' with itemId as pageId
    const quizDeleted = await prisma.userData.deleteMany({
      where: {
        userId: session.user.id,
        adapter: {
          startsWith: 'quiz-',
        },
        itemId: pageId,
      },
    })

    console.log(`[Dev] Cleared ${deleted.count + quizDeleted.count} user data entries for page ${pageId}`)

    return NextResponse.json({
      success: true,
      deleted: deleted.count + quizDeleted.count,
      pageId,
    })
  } catch (error) {
    console.error('[Dev] Failed to clear page data:', error)
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 })
  }
}
