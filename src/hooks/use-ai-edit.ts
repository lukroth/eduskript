'use client'

import { useState, useCallback } from 'react'
import type { EditProposal, EditResponse, PageEdit } from '@/lib/ai/types'

interface UseAIEditOptions {
  skriptId: string
  pageId?: string
  /** Current editor content - used instead of fetching from DB */
  currentContent?: string
}

interface UseAIEditReturn {
  proposal: EditProposal | null
  isLoading: boolean
  error: string | null
  requestEdit: (instruction: string) => Promise<void>
  applyEdits: (edits: PageEdit[]) => Promise<void>
  clearProposal: () => void
}

export function useAIEdit({ skriptId, pageId, currentContent }: UseAIEditOptions): UseAIEditReturn {
  const [proposal, setProposal] = useState<EditProposal | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestEdit = useCallback(
    async (instruction: string) => {
      setIsLoading(true)
      setError(null)

      // Use AbortController with 2-minute timeout for large edits
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      try {
        const response = await fetch('/api/ai/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skriptId, pageId, instruction, currentContent }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data: EditResponse = await response.json()

        if (!data.success || !data.proposal) {
          throw new Error(data.error || 'Failed to get edit proposal')
        }

        setProposal(data.proposal)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out. Try a smaller edit or fewer pages.')
        } else {
          const message = err instanceof Error ? err.message : 'An error occurred'
          setError(message)
        }
      } finally {
        clearTimeout(timeoutId)
        setIsLoading(false)
      }
    },
    [skriptId, pageId, currentContent]
  )

  const applyEdits = useCallback(
    async (edits: PageEdit[]) => {
      // Separate new pages from existing page edits
      const newPages = edits.filter((e) => e.isNew)
      const existingEdits = edits.filter((e) => !e.isNew)

      // Apply edits to existing pages
      const editResults = await Promise.allSettled(
        existingEdits.map(async (edit) => {
          const response = await fetch(`/api/pages/${edit.pageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: edit.proposedContent }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || `Failed to update page: ${edit.pageTitle}`)
          }

          return edit.pageId
        })
      )

      // Create new pages
      const createResults = await Promise.allSettled(
        newPages.map(async (edit) => {
          const response = await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              skriptId,
              title: edit.pageTitle,
              slug: edit.pageSlug,
              content: edit.proposedContent,
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || `Failed to create page: ${edit.pageTitle}`)
          }

          return edit.pageSlug
        })
      )

      // Check for failures
      const allResults = [...editResults, ...createResults]
      const failures = allResults.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      )

      if (failures.length > 0) {
        const messages = failures.map((f) => f.reason?.message || 'Unknown error')
        throw new Error(`Some edits failed: ${messages.join(', ')}`)
      }

      // Clear proposal on success
      setProposal(null)
    },
    [skriptId]
  )

  const clearProposal = useCallback(() => {
    setProposal(null)
    setError(null)
  }, [])

  return {
    proposal,
    isLoading,
    error,
    requestEdit,
    applyEdits,
    clearProposal,
  }
}
