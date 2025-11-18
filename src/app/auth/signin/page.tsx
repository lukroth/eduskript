'use client'

import { useSearchParams } from 'next/navigation'
import { SignInForm } from '@/components/auth/signin-form'
import { getAccountTypeFromWindow } from '@/lib/domain-utils'
import { useMemo } from 'react'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  // Detect account type during render, not in effect
  const accountType = useMemo(() => getAccountTypeFromWindow(), [])

  return <SignInForm accountType={accountType} callbackUrl={callbackUrl} />
}
