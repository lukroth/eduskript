'use client'

/**
 * Dev-only floating button to clear all user data for the current page
 * Only renders in development mode
 */

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { userDataService } from '@/lib/userdata'

interface DevClearDataButtonProps {
  pageId: string
}

export function DevClearDataButton({ pageId }: DevClearDataButtonProps) {
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const handleClear = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      // Auto-hide confirm after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000)
      return
    }

    setIsClearing(true)
    setShowConfirm(false)

    try {
      // 1. Clear IndexedDB data for this page
      await userDataService.deleteAllForPage(pageId)
      console.log('[Dev] Cleared IndexedDB data for page:', pageId)

      // 2. Clear server-side data
      const response = await fetch(`/api/dev/clear-page-data?pageId=${pageId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[Dev] Cleared server data:', result)
      } else {
        console.error('[Dev] Failed to clear server data:', await response.text())
      }

      // 3. Reload the page to reset all state
      window.location.reload()
    } catch (error) {
      console.error('[Dev] Failed to clear data:', error)
      setIsClearing(false)
    }
  }

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className={`
        fixed bottom-4 left-4 z-50
        flex items-center gap-2 px-3 py-2 rounded-lg
        text-sm font-medium shadow-lg
        transition-all duration-200
        ${showConfirm
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title="Clear all user data for this page (dev only)"
    >
      {isClearing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Clearing...
        </>
      ) : showConfirm ? (
        <>
          <Trash2 className="h-4 w-4" />
          Click again to confirm
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          DEV: Clear Page Data
        </>
      )}
    </button>
  )
}
