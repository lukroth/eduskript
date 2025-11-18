import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Set the account type in a global variable that will be read by the adapter
  (global as any).__nextauth_signup_type = 'student'

  // Get the callback URL from the query params
  const searchParams = request.nextUrl.searchParams
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  // Redirect to NextAuth with the provider specified
  const redirectUrl = new URL('/api/auth/signin', request.url)
  redirectUrl.searchParams.set('callbackUrl', callbackUrl)

  return NextResponse.redirect(redirectUrl)
}
