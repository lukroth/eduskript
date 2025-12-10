'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRealtimeEvents } from './use-realtime-events'

const CACHE_KEY = 'hasPendingInvitations'

/**
 * Hook to check for pending class invitations (students only).
 *
 * Uses multiple strategies for updates:
 * - Initial fetch on mount
 * - Real-time updates via SSE (Server-Sent Events)
 * - Re-fetch on tab visibility change
 * - SessionStorage caching during navigation
 */
export function usePendingInvitations() {
  const { data: session, status } = useSession()
  const [hasPendingInvitations, setHasPendingInvitations] = useState(false)

  const isStudent = status === 'authenticated' && session?.user?.accountType === 'student'

  const checkPendingInvitations = useCallback(() => {
    if (!isStudent) return

    fetch('/api/classes/my-classes?checkOnly=true')
      .then(res => res.json())
      .then(data => {
        const hasPending = !!data.hasPendingInvitations
        setHasPendingInvitations(hasPending)
        sessionStorage.setItem(CACHE_KEY, String(hasPending))
      })
      .catch(() => {
        setHasPendingInvitations(false)
      })
  }, [isStudent])

  // Subscribe to real-time class invitation events via SSE
  useRealtimeEvents(
    ['class-invitation'],
    () => {
      // When we receive a class-invitation event, set to true immediately
      setHasPendingInvitations(true)
      sessionStorage.setItem(CACHE_KEY, 'true')
    },
    { enabled: isStudent }
  )

  useEffect(() => {
    if (!isStudent) return

    // Detect page reload and clear cache
    const navEntries = performance.getEntriesByType('navigation')
    const isReload = navEntries.length > 0 &&
      (navEntries[0] as PerformanceNavigationTiming).type === 'reload'

    if (isReload) {
      sessionStorage.removeItem(CACHE_KEY)
    }

    // Check sessionStorage cache first (unless cleared by reload)
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasPendingInvitations(cached === 'true')
    } else {
      checkPendingInvitations()
    }

    // Re-fetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPendingInvitations()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for invitation status changes from other components (local events)
    const handleInvitationStatusChanged = (e: CustomEvent<{ hasPending: boolean }>) => {
      setHasPendingInvitations(e.detail.hasPending)
    }
    window.addEventListener('invitationStatusChanged', handleInvitationStatusChanged as EventListener)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('invitationStatusChanged', handleInvitationStatusChanged as EventListener)
    }
  }, [isStudent, checkPendingInvitations])

  return hasPendingInvitations
}
