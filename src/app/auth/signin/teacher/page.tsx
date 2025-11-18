'use client'

import { useSearchParams } from 'next/navigation'
import { SignInForm } from '@/components/auth/signin-form'

export default function TeacherSignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  return <SignInForm accountType="teacher" callbackUrl={callbackUrl} />
}
