'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Lightbox overlay that darkens/blurs the page and shows content maximized.
 * Closes on Escape, backdrop click, or the X button.
 */
export function ImageLightbox({ open, onClose, children }: ImageLightboxProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
      onClick={onClose}
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="max-w-[95vw] max-h-[90vh] cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
