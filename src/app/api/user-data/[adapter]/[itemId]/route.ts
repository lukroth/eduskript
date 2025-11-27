/**
 * User Data Item API
 *
 * GET /api/user-data/[adapter]/[itemId]
 * Fetch a single user data item.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    adapter: string
    itemId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { adapter, itemId } = await params

    const item = await prisma.userData.findUnique({
      where: {
        userId_adapter_itemId: {
          userId,
          adapter,
          itemId: decodeURIComponent(itemId),
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      adapter: item.adapter,
      itemId: item.itemId,
      data: item.data,
      version: item.version,
      updatedAt: item.updatedAt.getTime(),
    })
  } catch (error) {
    console.error('[user-data/item] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
