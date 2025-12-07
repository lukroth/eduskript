'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'

export function DashboardNav() {
  const { data: session } = useSession()

  // For students, redirect to last visited teacher page (from localStorage or session fallback)
  // For teachers, redirect to homepage
  const getSignOutUrl = () => {
    if (session?.user?.accountType !== 'student') return '/'

    // Try localStorage first (last visited teacher page)
    try {
      const stored = localStorage.getItem('lastTeacherPage')
      if (stored) {
        const { slug } = JSON.parse(stored)
        if (slug) return `/${slug}`
      }
    } catch {
      // Ignore parse errors
    }

    // Fallback to session (signed up from page)
    if (session?.user?.signedUpFromPageSlug) {
      return `/${session.user.signedUpFromPageSlug}`
    }

    return '/'
  }

  return (
    <nav className="border-b border-border bg-card px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-foreground">
            Eduskript
          </Link>
          <div className="text-sm text-muted-foreground">
            Welcome back, {session?.user?.name}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: getSignOutUrl() })}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}
