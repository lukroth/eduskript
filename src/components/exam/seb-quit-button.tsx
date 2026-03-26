'use client'

import { useSyncExternalStore } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

const subscribe = () => () => {}
const getIsInSEB = () =>
  typeof navigator !== 'undefined' &&
  (navigator.userAgent.includes('SEB/') || navigator.userAgent.includes('SafeExamBrowser'))
const getServerSnapshot = () => false

/**
 * A "Quit Safe Exam Browser" button that only renders inside SEB.
 * Navigates to the quitURL which SEB recognizes and triggers its quit flow.
 */
export function SEBQuitButton() {
  const isInSEB = useSyncExternalStore(subscribe, getIsInSEB, getServerSnapshot)

  if (!isInSEB) return null

  return (
    <Button
      variant="destructive"
      onClick={() => { window.location.href = '/api/exams/end-session' }}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Quit Safe Exam Browser
    </Button>
  )
}
