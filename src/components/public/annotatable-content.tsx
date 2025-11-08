'use client'

import { AnnotationLayer } from '@/components/annotations/annotation-layer'
import { MarkdownRenderer } from './markdown-renderer'

interface AnnotatableContentProps {
  pageId: string
  content: string
  domain?: string
  skriptId?: string
}

export function AnnotatableContent({ pageId, content, domain, skriptId }: AnnotatableContentProps) {
  return (
    <AnnotationLayer pageId={pageId} content={content}>
      <MarkdownRenderer
        content={content}
        domain={domain}
        skriptId={skriptId}
      />
    </AnnotationLayer>
  )
}
