'use client'

import { ReactNode } from 'react'
import { AnnotationLayer } from '@/components/annotations/annotation-layer'
import type { Prisma } from '@prisma/client'

/** Public annotation data passed from server */
export interface PublicAnnotation {
  data: Prisma.JsonValue
  userId: string
  user: { name: string | null }
}

interface AnnotationWrapperProps {
  pageId: string
  content: string
  children: ReactNode
  /** Pre-fetched public annotations (from server) */
  publicAnnotations?: PublicAnnotation[]
  /** Whether current user can create public annotations */
  isPageAuthor?: boolean
  /** Whether user is a student in an exam session (for SEB mode where NextAuth session isn't available) */
  isExamStudent?: boolean
}

/**
 * Client-side wrapper that adds annotation functionality to server-rendered content.
 * The children (MDX content) are rendered on the server, this component adds
 * the annotation layer on the client.
 */
export function AnnotationWrapper({ pageId, content, children, publicAnnotations, isPageAuthor, isExamStudent }: AnnotationWrapperProps) {
  return (
    <AnnotationLayer pageId={pageId} content={content} publicAnnotations={publicAnnotations} isPageAuthor={isPageAuthor} isExamStudent={isExamStudent}>
      {children}
    </AnnotationLayer>
  )
}
