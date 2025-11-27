import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { revalidateTag, revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withDatabaseConnection } from '@/lib/db-connection'
import { CACHE_TAGS } from '@/lib/cached-queries'
import { z } from 'zod'

// Base schema for non-admin users
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.optional(
    z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be less than 50 characters')
      .regex(/^[a-z0-9-]+$/, 'Username can only contain lowercase letters, numbers, and hyphens')
      .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Username cannot start or end with a hyphen')
  ),
  webpageDescription: z.string().optional(), // New field for webpage description
  title: z.string().optional(),
  bio: z.string().optional()
})

// Admin schema allows shorter usernames (minimum 1 character)
const adminUpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.optional(
    z.string()
      .min(1, 'Username must be at least 1 character')
      .max(50, 'Username must be less than 50 characters')
      .regex(/^[a-z0-9-]+$/, 'Username can only contain lowercase letters, numbers, and hyphens')
      .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Username cannot start or end with a hyphen')
  ),
  webpageDescription: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional()
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's admin status and current username
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, username: true }
    })

    const body = await request.json()

    // Use admin schema if user is admin, otherwise use regular schema
    const schema = currentUser?.isAdmin ? adminUpdateProfileSchema : updateProfileSchema
    const validatedData = schema.parse(body)

    const result = await withDatabaseConnection(async () => {
      // Check if username is already taken by another user
      if (validatedData.username) {
        const existingUser = await prisma.user.findUnique({
          where: { username: validatedData.username }
        })

        if (existingUser && existingUser.id !== session.user.id) {
          throw new Error('This username is already taken')
        }
      }

      // Update the user profile
      return await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: validatedData.name,
          username: validatedData.username,
          webpageDescription: validatedData.webpageDescription || null,
          title: validatedData.title || null,
          bio: validatedData.bio || null
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          webpageDescription: true,
          title: true,
          bio: true
        }
      })
    })

    // Invalidate caches for the user's public page
    const oldUsername = currentUser?.username
    const newUsername = result.username

    // Revalidate cache tags for both old and new usernames
    if (oldUsername) {
      revalidateTag(CACHE_TAGS.user(oldUsername), 'default')
      revalidateTag(CACHE_TAGS.teacherContent(oldUsername), 'default')
      revalidatePath(`/${oldUsername}`)
    }
    if (newUsername && newUsername !== oldUsername) {
      revalidateTag(CACHE_TAGS.user(newUsername), 'default')
      revalidateTag(CACHE_TAGS.teacherContent(newUsername), 'default')
      revalidatePath(`/${newUsername}`)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating profile:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'This username is already taken') {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
