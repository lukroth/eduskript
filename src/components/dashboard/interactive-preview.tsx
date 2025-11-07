'use client'

import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import type { MarkdownContext } from '@/lib/markdown'

interface InteractivePreviewProps {
  markdown: string
  onContentChange?: (newContent: string) => void
  fileList?: Array<{ id: string; name: string; url?: string; isDirectory?: boolean }>
  theme?: 'light' | 'dark'
}

export function InteractivePreview({
  markdown,
  onContentChange,
  fileList,
  theme = 'light'
}: InteractivePreviewProps) {
  const context: MarkdownContext = {
    fileList,
    theme,
  }

  return (
    <div className="prose-theme" key="markdown-preview">
      <MarkdownRenderer
        content={markdown}
        context={context}
        onContentChange={onContentChange}
      />
    </div>
  )
}
