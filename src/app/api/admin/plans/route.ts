import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/plans - List all plans (including inactive)
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ plans })
  } catch (err) {
    console.error('Error fetching plans:', err)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// POST /api/admin/plans - Create a plan
export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { name, slug, priceChf, interval, features, isActive, trialDays, isDefaultTrial } = await request.json()

    if (!name || !slug || priceChf === undefined || !interval) {
      return NextResponse.json(
        { error: 'name, slug, priceChf, and interval are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.plan.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'A plan with this slug already exists' }, { status: 409 })
    }

    // If setting as default trial, unset on all other plans
    if (isDefaultTrial) {
      await prisma.plan.updateMany({
        where: { isDefaultTrial: true },
        data: { isDefaultTrial: false },
      })
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        priceChf: Number(priceChf),
        interval,
        features: features ?? {},
        isActive: isActive ?? true,
        trialDays: trialDays != null ? Number(trialDays) : null,
        isDefaultTrial: isDefaultTrial ?? false,
      },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (err) {
    console.error('Error creating plan:', err)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
