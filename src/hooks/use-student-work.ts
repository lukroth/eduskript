'use client'

/**
 * Hook for teachers to fetch a student's work
 *
 * Fetches the student's personal annotations, code, snaps, etc.
 * from the /api/classes/[classId]/students/[studentId]/user-data endpoint.
 *
 * This allows teachers to see what students have drawn/written on a page.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface StudentWorkData {
  annotations?: {
    data: { canvasData?: string; [key: string]: unknown }
    updatedAt: number
  }
  code?: {
    data: unknown
    updatedAt: number
  }
  snaps?: {
    data: unknown
    updatedAt: number
  }
  [key: string]: { data: unknown; updatedAt: number } | undefined
}

interface UseStudentWorkOptions {
  classId: string | null
  studentId: string | null
  pageId: string
  adapters?: string[]
}

interface UseStudentWorkResult {
  data: StudentWorkData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Default adapters as a stable reference
const DEFAULT_ADAPTERS = ['annotations', 'code', 'snaps']

export function useStudentWork({
  classId,
  studentId,
  pageId,
  adapters
}: UseStudentWorkOptions): UseStudentWorkResult {
  const [data, setData] = useState<StudentWorkData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stable reference for adapters - only update if content actually changes
  const adaptersRef = useRef<string[]>(adapters || DEFAULT_ADAPTERS)
  const adaptersKey = (adapters || DEFAULT_ADAPTERS).join(',')

  // Track last fetched key to avoid duplicate requests
  const lastFetchKeyRef = useRef<string>('')

  const fetchStudentWork = useCallback(async () => {
    if (!classId || !studentId || !pageId) {
      setData(null)
      setIsLoading(false)
      return
    }

    // Create a unique key for this request
    const fetchKey = `${classId}:${studentId}:${pageId}:${adaptersKey}`

    // Skip if we already fetched this exact data
    if (lastFetchKeyRef.current === fetchKey && data !== null) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        pageId,
        adapters: adaptersRef.current.join(',')
      })

      const response = await fetch(
        `/api/classes/${classId}/students/${studentId}/user-data?${params}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch: ${response.status}`)
      }

      const result = await response.json()
      setData(result.data || null)
      lastFetchKeyRef.current = fetchKey
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student work')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [classId, studentId, pageId, adaptersKey, data])

  useEffect(() => {
    fetchStudentWork()
  }, [classId, studentId, pageId, adaptersKey]) // Don't include fetchStudentWork to avoid loop

  return {
    data,
    isLoading,
    error,
    refetch: fetchStudentWork
  }
}
