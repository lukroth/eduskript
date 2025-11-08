import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Check if the current user is authenticated and is an admin.
 * Returns the session if authorized, or a NextResponse error if not.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      ),
      session: null,
    }
  }

  if (!session.user.isAdmin) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
      session: null,
    }
  }

  return {
    error: null,
    session,
  }
}
