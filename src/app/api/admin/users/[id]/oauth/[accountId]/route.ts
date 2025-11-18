import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/admin/users/[id]/oauth/[accountId] - Unlink OAuth account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { id: userId, accountId } = await params

    // Verify the account belongs to the user
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { userId: true, provider: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'OAuth account not found' },
        { status: 404 }
      )
    }

    if (account.userId !== userId) {
      return NextResponse.json(
        { error: 'OAuth account does not belong to this user' },
        { status: 403 }
      )
    }

    // Delete the OAuth account
    await prisma.account.delete({
      where: { id: accountId },
    })

    return NextResponse.json({
      success: true,
      message: `${account.provider} account unlinked successfully`,
    })
  } catch (error) {
    console.error('Error unlinking OAuth account:', error)
    return NextResponse.json(
      { error: 'Failed to unlink OAuth account' },
      { status: 500 }
    )
  }
}
