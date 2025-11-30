'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogIn, UserCheck, Pencil } from 'lucide-react'
import { getAccountTypeFromWindow } from '@/lib/domain-utils'

interface AuthButtonProps {
  pageId?: string // Page ID to check edit permissions (lazy loaded)
}

export function AuthButton({ pageId }: AuthButtonProps) {
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const { data: session, status } = useSession()
  const [editUrl, setEditUrl] = useState<string | null>(null)

  // Fetch edit permissions client-side (only when logged in and pageId is provided)
  useEffect(() => {
    // Skip if not authenticated, no pageId, or student account
    if (status !== 'authenticated' || !pageId || session?.user?.accountType === 'student') {
      return
    }

    let cancelled = false

    fetch(`/api/pages/${pageId}/can-edit`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setEditUrl(data.canEdit && data.editUrl ? data.editUrl : null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditUrl(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pageId, status, session?.user?.accountType])

  const handleSignIn = () => {
    // Detect account type based on domain
    const accountType = getAccountTypeFromWindow()
    const accountTypeParam = accountType === 'student' ? 'student' : 'teacher'

    router.push(`/auth/signin?type=${accountTypeParam}&callbackUrl=${encodeURIComponent(pathname)}`)
  }

  if (!session) {
    // Not logged in - show login button
    return (
      <button
        onClick={handleSignIn}
        title="Login"
        className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors"
      >
        <LogIn className="h-4 w-4" />
      </button>
    )
  }

  // Logged in - show edit button or user avatar/icon
  const isStudent = session.user?.accountType === 'student'
  const userName = isStudent
    ? (session.user?.studentPseudonym
        ? `Student ${session.user.studentPseudonym.substring(0, 4)}`
        : 'Student')
    : session.user?.name || 'User'

  // If user can edit this page, show edit button instead of dashboard button
  if (editUrl && !isStudent) {
    return (
      <Link
        href={editUrl}
        title="Edit this page"
        className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors overflow-hidden inline-flex items-center justify-center"
      >
        <Pencil className="h-4 w-4 text-primary" />
      </Link>
    )
  }

  return (
    <Link
      href="/dashboard"
      title={`Go to dashboard (${userName})`}
      className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors overflow-hidden inline-flex items-center justify-center"
    >
      {session.user?.image && !isStudent ? (
        // Show profile picture for teachers (Microsoft provides it, not stored on server)
        // For students: don't show image even if Microsoft provides one (privacy)
        <Image
          src={session.user.image}
          alt={userName}
          width={16}
          height={16}
          className="rounded-sm opacity-90 hover:opacity-100 transition-opacity"
        />
      ) : (
        // Show icon for students or teachers without images
        <UserCheck className="h-4 w-4 text-primary" />
      )}
    </Link>
  )
}
