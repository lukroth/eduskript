/**
 * Exam Session Start API Route
 *
 * This route handles creating an exam session after token validation.
 * It exists because Server Components cannot set cookies during render.
 *
 * Flow:
 * 1. Page validates SEB token, determines session is needed
 * 2. Page redirects to this route with userId, skriptId, and returnUrl
 * 3. This route creates the session, sets the cookie, and redirects back
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createExamSession } from '@/lib/exam-tokens'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  const searchParams = request.nextUrl.searchParams

  const userId = searchParams.get('userId')
  const skriptId = searchParams.get('skriptId')
  const returnUrl = searchParams.get('returnUrl')

  if (!userId || !skriptId || !returnUrl) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  // Create the exam session
  const sessionId = await createExamSession(userId, pageId, skriptId)

  // Set the cookie
  const cookieStore = await cookies()
  cookieStore.set('exam_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 4 * 60 * 60, // 4 hours
    path: '/',
  })

  // Redirect back to the exam page (without the seb_token since session is now active)
  // Use forwarded host/proto headers when behind a proxy (like ngrok), otherwise
  // request.nextUrl.origin would resolve to localhost which SEB can't reach
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin

  const redirectUrl = new URL(returnUrl, origin)
  redirectUrl.searchParams.delete('seb_token')

  return NextResponse.redirect(redirectUrl)
}
