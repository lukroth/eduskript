'use client'

import { useState, useRef, useCallback } from 'react'

interface ImageWithResizeProps {
  src: string
  alt?: string
  title?: string
  style?: React.CSSProperties
  onWidthChange?: (markdown: string) => void
}

export function ImageWithResize({ src, alt = '', title, style, onWidthChange }: ImageWithResizeProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentWidth, setCurrentWidth] = useState<number>(() => {
    // Parse initial width from style
    if (style?.width && typeof style.width === 'string' && style.width.includes('%')) {
      return parseFloat(style.width)
    }
    return 100
  })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - containerRect.left
    const newWidthPercent = Math.max(10, Math.min(100, (relativeX / containerRect.width) * 100))

    setCurrentWidth(Math.round(newWidthPercent))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (isDragging && onWidthChange) {
      // Notify parent about width change
      onWidthChange(`![${alt}](${src}){width=${Math.round(currentWidth)}%}`)
    }
    setIsDragging(false)
  }, [isDragging, currentWidth, alt, src, onWidthChange])

  // Attach mouse listeners when dragging
  useState(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  })

  return (
    <div
      ref={containerRef}
      className="relative inline-block my-4 group"
      style={{ width: `${currentWidth}%`, ...style }}
    >
      {/* Image */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        title={title}
        loading="lazy"
        decoding="async"
        className="w-full h-auto rounded-md"
      />

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-all ${
          isDragging ? 'opacity-100 bg-primary/30' : ''
        }`}
      >
        {/* Visual indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-primary/40 group-hover:bg-primary/60 rounded-full transition-colors" />
      </div>

      {/* Width indicator */}
      {(isDragging || currentWidth < 100) && (
        <div className="absolute top-2 left-2 bg-background/95 backdrop-blur border border-border/50 px-2 py-1 rounded text-[10px] font-mono text-foreground z-10 pointer-events-none">
          {Math.round(currentWidth)}%
        </div>
      )}
    </div>
  )
}
