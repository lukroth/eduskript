import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateDomainSchema = z.object({
  isActive: z.boolean().optional()
})

// GET - Get a specific custom domain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const domain = await prisma.customDomain.findUnique({
      where: { 
        id,
        userId: user.id // Ensure user owns this domain
      }
    })

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    return NextResponse.json({ domain })
  } catch (error) {
    console.error('Error fetching custom domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a custom domain (activate/deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateDomainSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if domain exists and belongs to user
    const existingDomain = await prisma.customDomain.findUnique({
      where: { 
        id,
        userId: user.id
      }
    })

    if (!existingDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Update the domain
    const updatedDomain = await prisma.customDomain.update({
      where: { id },
      data: validation.data
    })

    return NextResponse.json({ 
      domain: updatedDomain,
      message: 'Domain updated successfully'
    })

  } catch (error) {
    console.error('Error updating custom domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a custom domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if domain exists and belongs to user
    const existingDomain = await prisma.customDomain.findUnique({
      where: { 
        id,
        userId: user.id
      }
    })

    if (!existingDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Delete the domain
    await prisma.customDomain.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Domain deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting custom domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 