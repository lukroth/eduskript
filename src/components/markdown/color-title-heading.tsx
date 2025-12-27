'use client'

import { type ReactNode, useRef, useEffect, useState } from 'react'

interface ColorTitleHeadingProps {
  id?: string
  children: ReactNode
  className?: string
}

/**
 * Color title h1 with animated rainbow shadow effect.
 *
 * Creates a duplicate of the heading content for the rainbow shadow.
 * This approach handles inline <code> elements correctly because both
 * the foreground and shadow have identical HTML structure.
 *
 * The CSS ::before approach (using data-heading-text plain text) doesn't work
 * when the heading contains <code> elements because monospace fonts have
 * different character widths than the heading font.
 */
export function ColorTitleHeading({ id, children, className = '' }: ColorTitleHeadingProps) {
  const shadowRef = useRef<HTMLSpanElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <h1
      id={id}
      className={`color-title-js relative ${className}`}
    >
      {/* Rainbow shadow - positioned behind, duplicates content structure */}
      {mounted && (
        <span
          ref={shadowRef}
          aria-hidden="true"
          className="color-title-shadow"
        >
          {children}
        </span>
      )}

      {/* Foreground content with anchor link */}
      {id ? (
        <a href={`#${id}`} className="heading-link no-underline hover:underline relative z-10">
          {children}
        </a>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </h1>
  )
}
