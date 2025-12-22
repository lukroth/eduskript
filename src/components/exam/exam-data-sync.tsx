'use client'

/**
 * Exam Data Sync Component
 *
 * This component handles data synchronization for students in SEB exam mode.
 * It provides exam session context AND directly sets the sync engine user,
 * enabling data sync when NextAuth session isn't available.
 *
 * The problem: UserDataProvider uses useSession() from NextAuth, but in SEB
 * mode students are authenticated via exam_session cookie, not NextAuth.
 *
 * The solution: This component:
 * 1. Wraps children with ExamSessionProvider (so useExamSession() returns the correct data)
 * 2. Directly sets the user on the sync engine (for the initial sync trigger)
 */

import { useEffect } from 'react'
import { ExamSessionProvider } from '@/contexts/exam-session-context'
import { syncEngine } from '@/lib/userdata/sync-engine'
import { createLogger } from '@/lib/logger'

const log = createLogger('exam:data-sync')

interface ExamDataSyncProps {
  /** The authenticated user's ID from the exam session */
  userId: string
  /** Optional user name for display */
  userName?: string | null
  /** Optional user email for display */
  userEmail?: string | null
  /** The page ID this exam session is for */
  pageId: string
  /** Children to render */
  children: React.ReactNode
}

/**
 * Provides exam session authentication context and data sync for SEB mode
 *
 * Place this inside the component tree for exam pages where the user
 * is authenticated via exam_session cookie rather than NextAuth.
 *
 * This component:
 * - Provides ExamSessionContext so useSyncedUserData knows we're authenticated
 * - Sets the sync engine user directly for the initial sync
 */
export function ExamDataSync({ userId, userName, userEmail, pageId, children }: ExamDataSyncProps) {
  useEffect(() => {
    log('Setting sync engine user for exam session', { userId: userId.substring(0, 8) + '...' })

    // Set the user on the sync engine directly
    // This triggers the initial sync and allows queued items to be sent
    syncEngine.setUser(userId)

    // Note: We don't clean up on unmount because the page will redirect
    // when the exam ends, and a page refresh will reset everything anyway
  }, [userId])

  return (
    <ExamSessionProvider
      isInExamSession={true}
      user={{ id: userId, name: userName, email: userEmail }}
      pageId={pageId}
    >
      {children}
    </ExamSessionProvider>
  )
}
