'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { BookOpen, Settings, Users, ChevronLeft, ChevronRight, Shield, GraduationCap, User, Camera, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePendingInvitations } from '@/hooks/use-pending-invitations'

const navigation = [
  { name: 'Page Builder', href: '/dashboard/page-builder', icon: BookOpen },
  { name: 'Page settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Collaborate', href: '/dashboard/collaborate', icon: Users },
]

const teacherNavigation = [
  { name: 'Page Builder', href: '/dashboard/page-builder', icon: BookOpen },
  { name: 'Page settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Collaborate', href: '/dashboard/collaborate', icon: Users },
  { name: 'Classes', href: '/dashboard/classes', icon: GraduationCap },
]

const studentNavigation = [
  { name: 'My Classes', href: '/dashboard/my-classes', icon: GraduationCap },
  { name: 'My Snaps', href: '/dashboard/my-snaps', icon: Camera },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session } = useSession()
  const hasPendingInvitations = usePendingInvitations()
  const [lastTeacherPage, setLastTeacherPage] = useState<{ slug: string; name: string } | null>(null)

  // Determine which navigation to show based on account type
  const isStudent = session?.user?.accountType === 'student'
  const isTeacher = session?.user?.accountType === 'teacher'

  const navItems = isStudent ? studentNavigation : isTeacher ? teacherNavigation : navigation

  // Load last visited teacher page from localStorage (students only)
  useEffect(() => {
    if (!isStudent) return

    try {
      const stored = localStorage.getItem('lastTeacherPage')
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLastTeacherPage(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors
    }
  }, [isStudent])

  return (
    <div className={cn(
      "bg-card border-r border-border min-h-screen transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16 min-w-16" : "w-64"
    )}>
      <div className="p-4 flex-1 flex flex-col">
        {/* Toggle Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </Button>
        </div>


        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            // Highlight page-builder for both /dashboard and /dashboard/page-builder
            const isActive = pathname === item.href ||
                           (item.href === '/dashboard/page-builder' && pathname === '/dashboard')

            // Show red dot on My Classes if there are pending invitations
            const showDot = hasPendingInvitations && item.href === '/dashboard/my-classes'

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors relative',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isCollapsed ? 'justify-center px-2' : ''
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5" />
                {!isCollapsed && <span>{item.name}</span>}
                {showDot && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            )
          })}

          {/* Admin Panel Link (only visible to admins) */}
          {session?.user?.isAdmin && (
            <>
              <div className="my-4 border-t border-border" />
              <Link
                href="/dashboard/admin"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                  pathname === '/dashboard/admin'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isCollapsed ? 'justify-center px-2' : ''
                )}
                title={isCollapsed ? 'Admin Panel' : undefined}
              >
                <Shield className="w-5 h-5" />
                {!isCollapsed && <span>Admin Panel</span>}
              </Link>
            </>
          )}
        </nav>

        {/* Back to Teacher Page link (students only) */}
        {isStudent && (lastTeacherPage || session?.user?.signedUpFromPageSlug) && (
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href={`/${lastTeacherPage?.slug || session?.user?.signedUpFromPageSlug}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                isCollapsed ? 'justify-center px-2' : ''
              )}
              title={isCollapsed ? `Back to ${lastTeacherPage?.name || session?.user?.signedUpFromPageSlug}` : undefined}
            >
              <ExternalLink className="w-5 h-5" />
              {!isCollapsed && <span>Back to {lastTeacherPage?.name || session?.user?.signedUpFromPageSlug}</span>}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
