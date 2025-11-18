import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Record consent timestamp
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { gdprConsentAt: new Date() },
      select: {
        id: true,
        gdprConsentAt: true,
        accountType: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully',
      consentedAt: user.gdprConsentAt,
    })
  } catch (error) {
    console.error('Error recording consent:', error)
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    )
  }
}
