'use client'

import { useSearchParams } from 'next/navigation'
import { SignInForm } from '@/components/auth/signin-form'

export default function StudentSignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  return <SignInForm accountType="student" callbackUrl={callbackUrl} />
}
