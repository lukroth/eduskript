'use client'

import { useState, useEffect } from 'react'
import { AnnotationLayer } from '@/components/annotations/annotation-layer'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'

interface AnnotatableContentProps {
  pageId: string
  content: string
  domain?: string
  skriptId?: string
}

export function AnnotatableContent({ pageId, content, domain, skriptId }: AnnotatableContentProps) {
  const [fileList, setFileList] = useState<Array<{ id: string, name: string, url?: string, isDirectory?: boolean }>>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(!!skriptId)

  // Fetch files for this skript if skriptId is provided
  useEffect(() => {
    if (!skriptId) {
      setIsLoadingFiles(false)
      return
    }

    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/upload?skriptId=${skriptId}`)
        if (response.ok) {
          const data = await response.json()
          setFileList(data.files || [])
        }
      } catch (error) {
        console.error('Error fetching files for markdown:', error)
      } finally {
        setIsLoadingFiles(false)
      }
    }

    fetchFiles()
  }, [skriptId])

  // Build context for React markdown renderer
  const context = {
    domain,
    skriptId,
    fileList
  }

  // Show loading state while fetching files
  if (isLoadingFiles) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
      </div>
    )
  }

  return (
    <AnnotationLayer pageId={pageId} content={content}>
      <MarkdownRenderer
        content={content}
        context={context}
      />
    </AnnotationLayer>
  )
}
