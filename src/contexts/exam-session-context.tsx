'use client'

/**
 * Exam Session Context
 *
 * Provides exam session information to client components when a user is
 * authenticated via the exam session cookie (in SEB mode) instead of NextAuth.
 *
 * This allows components like UserDataProvider and AnnotationLayer to know
 * about the authenticated user even when useSession() returns unauthenticated.
 */

import { createContext, useContext, type ReactNode } from 'react'

interface ExamSessionUser {
  id: string
  name?: string | null
  email?: string | null
}

interface ExamSessionContextValue {
  /** Whether user is in an active exam session */
  isInExamSession: boolean
  /** The authenticated user from exam session (null if not in exam) */
  user: ExamSessionUser | null
  /** The page ID this session is for */
  pageId: string | null
}

const ExamSessionContext = createContext<ExamSessionContextValue>({
  isInExamSession: false,
  user: null,
  pageId: null
})

interface ExamSessionProviderProps {
  children: ReactNode
  /** Whether user is in an active exam session */
  isInExamSession?: boolean
  /** User info from exam session */
  user?: ExamSessionUser | null
  /** Page ID for the exam */
  pageId?: string | null
}

/**
 * Provider for exam session context
 *
 * Usage in server component:
 * ```tsx
 * <ExamSessionProvider
 *   isInExamSession={isInExamSession}
 *   user={{ id: userId, name: userName, email: userEmail }}
 *   pageId={pageId}
 * >
 *   {children}
 * </ExamSessionProvider>
 * ```
 */
export function ExamSessionProvider({
  children,
  isInExamSession = false,
  user = null,
  pageId = null
}: ExamSessionProviderProps) {
  return (
    <ExamSessionContext.Provider value={{ isInExamSession, user, pageId }}>
      {children}
    </ExamSessionContext.Provider>
  )
}

/**
 * Hook to access exam session context
 */
export function useExamSession() {
  return useContext(ExamSessionContext)
}
