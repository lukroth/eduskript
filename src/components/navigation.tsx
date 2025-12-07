'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { usePendingInvitations } from '@/hooks/use-pending-invitations'

export function Navigation() {
  const { data: session } = useSession()
  const hasPendingInvitations = usePendingInvitations()

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Eduskript.org
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {session ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="relative">
                  <Button variant="ghost">Dashboard</Button>
                  {hasPendingInvitations && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Link>
                <Button
                  variant="outline"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Create account</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
