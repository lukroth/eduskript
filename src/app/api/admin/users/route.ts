import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/admin/users - List all users
export async function GET() {
  const { error, session } = await requireAdmin()
  if (error) return error

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        subdomain: true,
        title: true,
        isAdmin: true,
        requirePasswordReset: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: Request) {
  const { error, session } = await requireAdmin()
  if (error) return error

  try {
    const { email, name, subdomain, title, password, isAdmin, requirePasswordReset } = await request.json()

    // Validate required fields
    if (!email || !name || !subdomain || !password) {
      return NextResponse.json(
        { error: 'Email, name, subdomain, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Check if subdomain already exists
    const existingSubdomain = await prisma.user.findUnique({
      where: { subdomain },
    })

    if (existingSubdomain) {
      return NextResponse.json(
        { error: 'User with this subdomain already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        subdomain,
        title: title || null,
        hashedPassword,
        emailVerified: new Date(), // Auto-verify admin-created users
        isAdmin: isAdmin || false,
        requirePasswordReset: requirePasswordReset !== undefined ? requirePasswordReset : true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        subdomain: true,
        title: true,
        isAdmin: true,
        requirePasswordReset: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
