import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Returns all skripts the current user has author permission on. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const skripts = await prisma.skript.findMany({
      where: {
        authors: {
          some: {
            userId: session.user.id,
            permission: 'author',
          },
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json(skripts)
  } catch (error) {
    console.error('Error listing skripts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
