import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Set the account type in a global variable that will be read by the adapter
  (global as any).__nextauth_signup_type = 'teacher'

  // Get the callback URL from the query params
  const searchParams = request.nextUrl.searchParams
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  // Redirect to the actual NextAuth Google signin
  const redirectUrl = new URL('/api/auth/signin/google', request.url)
  redirectUrl.searchParams.set('callbackUrl', callbackUrl)

  return NextResponse.redirect(redirectUrl)
}
