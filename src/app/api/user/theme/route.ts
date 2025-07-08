import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { theme } = await request.json()

    // Validate theme value
    if (!['light', 'dark', 'system'].includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 })
    }

    // Update user's theme preference using Prisma client
    await prisma.user.update({
      where: { email: session.user.email },
      data: { themePreference: theme }
    })

    return NextResponse.json({ 
      message: 'Theme preference updated successfully',
      themePreference: theme
    })

  } catch (error) {
    console.error('Error updating theme preference:', error)
    return NextResponse.json(
      { error: 'Failed to update theme preference' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's theme preference using Prisma client
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { themePreference: true }
    })

    const themePreference = user?.themePreference || 'system'

    return NextResponse.json({ 
      themePreference
    })

  } catch (error) {
    console.error('Error fetching theme preference:', error)
    return NextResponse.json(
      { error: 'Failed to fetch theme preference' },
      { status: 500 }
    )
  }
}
