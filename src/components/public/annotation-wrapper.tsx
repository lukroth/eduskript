'use client'

import { ReactNode } from 'react'
import { AnnotationLayer } from '@/components/annotations/annotation-layer'

interface AnnotationWrapperProps {
  pageId: string
  content: string
  children: ReactNode
}

/**
 * Client-side wrapper that adds annotation functionality to server-rendered content.
 * The children (MDX content) are rendered on the server, this component adds
 * the annotation layer on the client.
 */
export function AnnotationWrapper({ pageId, content, children }: AnnotationWrapperProps) {
  return (
    <AnnotationLayer pageId={pageId} content={content}>
      {children}
    </AnnotationLayer>
  )
}
