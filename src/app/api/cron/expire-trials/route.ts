/**
 * Cron endpoint to batch-expire trialing subscriptions past their end date.
 * Intended to run daily via Koyeb cron or similar scheduler.
 *
 * Auth: Bearer token must match CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find all expired trials
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: 'trialing',
        currentPeriodEnd: { lt: now },
      },
      select: { id: true, userId: true },
    })

    if (expiredTrials.length === 0) {
      return NextResponse.json({ expired: 0 })
    }

    // Batch update subscriptions
    await prisma.subscription.updateMany({
      where: {
        id: { in: expiredTrials.map((t) => t.id) },
      },
      data: {
        status: 'cancelled',
        cancelledAt: now,
      },
    })

    // Reset each user's billingPlan to 'free'
    const userIds = [...new Set(expiredTrials.map((t) => t.userId))]
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { billingPlan: 'free' },
    })

    return NextResponse.json({ expired: expiredTrials.length, userIds })
  } catch (error) {
    console.error('[cron/expire-trials] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
