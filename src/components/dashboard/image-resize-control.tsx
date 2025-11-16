'use client'

import { useState, useEffect } from 'react'

interface ImageResizeControlProps {
  imageElement: HTMLImageElement
  onWidthChange: (widthPercent: number) => void
}

export function ImageResizeControl({ imageElement, onWidthChange }: ImageResizeControlProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [currentWidth, setCurrentWidth] = useState(100)

  useEffect(() => {
    // Get initial width from the image element
    const computedStyle = window.getComputedStyle(imageElement)
    const width = computedStyle.width

    if (width.includes('%')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentWidth(parseFloat(width))
    } else if (imageElement.parentElement) {
      const parentWidth = imageElement.parentElement.offsetWidth
      const imgWidth = imageElement.offsetWidth
       
      setCurrentWidth(Math.round((imgWidth / parentWidth) * 100))
    }
  }, [imageElement])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!imageElement.parentElement) return

      const parentRect = imageElement.parentElement.getBoundingClientRect()
      const relativeX = e.clientX - parentRect.left
      const newWidthPercent = Math.max(10, Math.min(100, (relativeX / parentRect.width) * 100))

      setCurrentWidth(Math.round(newWidthPercent))
      imageElement.style.width = `${Math.round(newWidthPercent)}%`
      imageElement.style.height = 'auto'
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onWidthChange(currentWidth)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, currentWidth, imageElement, onWidthChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  return (
    <>
      {/* Resize handle - sticks to the right edge of the image */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize group hover:bg-primary/20 transition-colors ${
          isDragging ? 'bg-primary/30' : ''
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Visual indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-primary/40 group-hover:bg-primary/60 rounded-full transition-colors" />
      </div>

      {/* Width indicator */}
      {(isDragging || currentWidth < 100) && (
        <div className="absolute top-2 left-2 bg-background/95 backdrop-blur border border-border/50 px-2 py-1 rounded text-[10px] font-mono text-foreground z-10" style={{ pointerEvents: 'none' }}>
          {Math.round(currentWidth)}%
        </div>
      )}
    </>
  )
}
