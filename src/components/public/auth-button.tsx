'use client'

import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { LogIn, UserCheck, Pencil } from 'lucide-react'
import { getAccountTypeFromWindow } from '@/lib/domain-utils'

interface AuthButtonProps {
  editUrl?: string // URL to edit current page (only shown if user has permission)
}

export function AuthButton({ editUrl }: AuthButtonProps) {
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const { data: session } = useSession()

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
      <button
        onClick={() => router.push(editUrl)}
        title="Edit this page"
        className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors overflow-hidden"
      >
        <Pencil className="h-4 w-4 text-primary" />
      </button>
    )
  }

  return (
    <button
      onClick={() => router.push('/dashboard')}
      title={`Go to dashboard (${userName})`}
      className="p-2 rounded-md border border-border bg-card hover:bg-muted transition-colors overflow-hidden"
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
    </button>
  )
}
