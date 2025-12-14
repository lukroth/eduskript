'use client'

/**
 * Hook for students to receive teacher annotations
 *
 * Fetches teacher annotations (class broadcasts and individual feedback)
 * and subscribes to real-time updates via SSE.
 *
 * USAGE: Called by student-facing components (annotation-layer, code-editor)
 * to receive teacher content. The hook is intentionally "dumb" - it fetches
 * everything for the page and lets consumers filter by their needs.
 *
 * DATA FLOW:
 * 1. Initial fetch from /api/student/teacher-annotations
 * 2. SSE subscription for real-time updates
 * 3. On SSE event, refetch entire dataset (not incremental)
 *
 * TRADE-OFF: Refetching all data on any update is simple but wasteful.
 * For pages with many broadcasts, consider adding event payload with
 * changed data to enable incremental updates.
 *
 * SWR-LIKE PATTERN: Shows stale data while fetching to prevent UI flicker.
 * isLoading is only true on initial load, not on refetch.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRealtimeEvents } from './use-realtime-events'

export interface TeacherClassAnnotation {
  classId: string
  className: string
  data: unknown
  updatedAt: number
}

export interface TeacherClassSnaps {
  classId: string
  className: string
  data: unknown
  updatedAt: number
}

/**
 * Code highlights broadcast for a class
 * editorId identifies which code editor on the page this belongs to
 * (extracted from adapter name: code-highlights-{editorId})
 */
export interface TeacherClassCodeHighlights {
  classId: string
  className: string
  editorId: string
  data: unknown  // Actually BroadcastHighlightsData but typed as unknown for flexibility
  updatedAt: number
}

export interface TeacherIndividualFeedback {
  data: unknown
  updatedAt: number
}

/**
 * Code highlights targeted at a specific student
 * Structure mirrors TeacherClassCodeHighlights but without class info
 */
export interface TeacherIndividualCodeHighlights {
  editorId: string
  data: unknown  // Actually BroadcastHighlightsData but typed as unknown for flexibility
  updatedAt: number
}

export interface TeacherBroadcastData {
  classAnnotations: TeacherClassAnnotation[]
  classSnaps: TeacherClassSnaps[]
  classCodeHighlights: TeacherClassCodeHighlights[]
  individualFeedback: TeacherIndividualFeedback | null
  individualSnapFeedback: TeacherIndividualFeedback | null
  individualCodeHighlights: TeacherIndividualCodeHighlights[]
}

/**
 * Hook to receive teacher annotations for a specific page
 *
 * @param pageId - The page ID to fetch annotations for
 * @returns Object with teacher annotations and loading state
 */
export function useTeacherBroadcast(pageId: string) {
  const { status } = useSession()
  const [classAnnotations, setClassAnnotations] = useState<TeacherClassAnnotation[]>([])
  const [classSnaps, setClassSnaps] = useState<TeacherClassSnaps[]>([])
  const [classCodeHighlights, setClassCodeHighlights] = useState<TeacherClassCodeHighlights[]>([])
  const [individualFeedback, setIndividualFeedback] = useState<TeacherIndividualFeedback | null>(null)
  const [individualSnapFeedback, setIndividualSnapFeedback] = useState<TeacherIndividualFeedback | null>(null)
  const [individualCodeHighlights, setIndividualCodeHighlights] = useState<TeacherIndividualCodeHighlights[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch teacher annotations from API
  // Uses SWR pattern: keep showing stale data while fetching, then swap when ready.
  // This prevents UI flicker during refetch.
  const fetchAnnotations = useCallback(async () => {
    if (status !== 'authenticated' || !pageId) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      // Don't set isLoading=true on refetch - keeps stale data visible (SWR pattern)
      // Only set loading on initial fetch (when we have no data yet)

      // Add timestamp to prevent browser caching
      const res = await fetch(`/api/student/teacher-annotations?pageId=${encodeURIComponent(pageId)}&_t=${Date.now()}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`)
      }

      const data: TeacherBroadcastData = await res.json()
      console.log('[useTeacherBroadcast] Fetched data:', {
        classAnnotationsCount: data.classAnnotations?.length ?? 0,
        classSnapsCount: data.classSnaps?.length ?? 0,
        classCodeHighlightsCount: data.classCodeHighlights?.length ?? 0,
        hasIndividualFeedback: !!data.individualFeedback,
        hasIndividualSnapFeedback: !!data.individualSnapFeedback,
        individualCodeHighlightsCount: data.individualCodeHighlights?.length ?? 0
      })
      setClassAnnotations(data.classAnnotations || [])
      setClassSnaps(data.classSnaps || [])
      setClassCodeHighlights(data.classCodeHighlights || [])
      setIndividualFeedback(data.individualFeedback || null)
      setIndividualSnapFeedback(data.individualSnapFeedback || null)
      setIndividualCodeHighlights(data.individualCodeHighlights || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teacher annotations')
    } finally {
      setIsLoading(false)
    }
  }, [pageId, status])

  // Initial fetch
  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  // Subscribe to real-time updates
  // Note: Snaps share the same SSE events as annotations (teacher-annotations-update, teacher-feedback)
  // since both are fetched together in a single API call
  useRealtimeEvents(
    ['teacher-annotations-update', 'teacher-feedback'],
    (event) => {
      console.log('[useTeacherBroadcast] Received SSE event:', event.type, 'pageId:', (event as { pageId?: string }).pageId, 'current pageId:', pageId)
      // Check if event is for this page
      if (event.type === 'teacher-annotations-update') {
        if (event.pageId === pageId) {
          console.log('[useTeacherBroadcast] Event matches page, refetching class broadcasts')
          // Refetch to get updated class data (annotations + snaps)
          fetchAnnotations()
        }
      } else if (event.type === 'teacher-feedback') {
        if (event.pageId === pageId) {
          console.log('[useTeacherBroadcast] Event matches page, refetching individual feedback')
          // Refetch to get updated individual feedback (annotations + snaps)
          fetchAnnotations()
        }
      }
    },
    { enabled: status === 'authenticated' }
  )

  return {
    classAnnotations,
    classSnaps,
    classCodeHighlights,
    individualFeedback,
    individualSnapFeedback,
    individualCodeHighlights,
    isLoading,
    error,
    refetch: fetchAnnotations,
  }
}
