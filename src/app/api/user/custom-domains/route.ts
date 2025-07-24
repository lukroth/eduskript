import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addDomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/, 'Invalid domain format')
})

// GET - List user's custom domains
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        customDomains: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ domains: user.customDomains })
  } catch (error) {
    console.error('Error fetching custom domains:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a new custom domain
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = addDomainSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { domain } = validation.data

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subdomain: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.subdomain) {
      return NextResponse.json({ 
        error: 'You must have a subdomain set up before adding custom domains' 
      }, { status: 400 })
    }

    // Check if domain already exists
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain }
    })

    if (existingDomain) {
      return NextResponse.json({ 
        error: 'This domain is already registered' 
      }, { status: 409 })
    }

    // Create the custom domain
    const customDomain = await prisma.customDomain.create({
      data: {
        domain,
        userId: user.id,
        isActive: false // Initially inactive until DNS is verified
      }
    })

    return NextResponse.json({ 
      domain: customDomain,
      message: 'Domain added successfully. Please configure your DNS settings.',
      dnsInstructions: {
        type: 'CNAME',
        name: domain,
        value: process.env.CUSTOM_DOMAIN_TARGET || 'eduskript.org',
        ttl: 300
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error adding custom domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 