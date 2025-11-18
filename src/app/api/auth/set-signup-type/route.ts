import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')

  if (type === 'student' || type === 'teacher') {
    // Set the account type in a global variable that will be read by the adapter
    (global as any).__nextauth_signup_type = type

    console.log('[SetSignupType] Set signup type to:', type)

    return NextResponse.json({ success: true, type })
  }

  return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
}
