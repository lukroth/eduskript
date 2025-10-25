'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface MarkdownRendererProps {
  content: string
  domain?: string
  skriptId?: string
}

export function MarkdownRenderer({ content, domain, skriptId }: MarkdownRendererProps) {
  const [html, setHtml] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Get the actual theme (resolve 'system' to actual theme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const processMarkdown = async () => {
      try {
        // Import processMarkdown from server-side markdown processor
        const { processMarkdown: serverProcessMarkdown } = await import('@/lib/markdown')

        // Fetch files for this skript if skriptId is provided
        let fileList: Array<{ id: string, name: string, url?: string, isDirectory?: boolean }> = []

        if (skriptId) {
          try {
            console.log('[MarkdownRenderer] Fetching files for skriptId:', skriptId)
            const response = await fetch(`/api/upload?skriptId=${skriptId}`)
            console.log('[MarkdownRenderer] Response status:', response.status)
            if (response.ok) {
              const data = await response.json()
              fileList = data.files || []
              console.log('[MarkdownRenderer] Fetched files:', fileList.map(f => f.name))
              console.log('[MarkdownRenderer] Full file data:', fileList)
            } else {
              console.error('[MarkdownRenderer] Failed to fetch files:', response.statusText)
            }
          } catch (error) {
            console.error('Error fetching files for markdown:', error)
          }
        }

        console.log('[MarkdownRenderer] Processing markdown with:', {
          contentLength: content.length,
          fileListCount: fileList.length,
          theme: resolvedTheme,
          hasSkriptId: !!skriptId,
          contentPreview: content.substring(0, 200)
        })

        const result = await serverProcessMarkdown(content, {
          fileList,
          theme: (resolvedTheme as 'light' | 'dark') || 'light'
        })

        console.log('[MarkdownRenderer] Result:', {
          hasContent: !!result.content,
          contentLength: result.content.length,
          contentPreview: result.content.substring(0, 500)
        })

        setHtml(result.content)
      } catch (error) {
        console.error('Error processing markdown:', error)
        setHtml(`<p>Error rendering content</p>`)
      } finally {
        setIsLoading(false)
      }
    }

    processMarkdown()
  }, [content, domain, skriptId, resolvedTheme, mounted])

  if (!mounted || isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    )
  }

  return (
    <div
      className="prose-theme"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
