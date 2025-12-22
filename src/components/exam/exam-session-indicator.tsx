/**
 * DEV: Exam Session Indicator
 *
 * Shows a floating badge confirming the user has an active exam session.
 * Only visible in development mode for testing SEB authentication flow.
 */

'use client'

interface ExamSessionIndicatorProps {
  userName?: string | null
}

export function ExamSessionIndicator({ userName }: ExamSessionIndicatorProps) {
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 px-3 py-2 bg-green-600 text-white rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>SEB Session Active</span>
      {userName && <span className="opacity-75">({userName})</span>}
    </div>
  )
}
