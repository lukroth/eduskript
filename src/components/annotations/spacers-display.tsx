'use client'

/**
 * SpacersDisplay - Manages spacer interaction controls
 *
 * Adds/removes CSS classes and event listeners on the injected spacer DOM
 * elements. No React overlay needed — all controls are DOM-manipulated.
 *
 * When `active` is true (spacer tool selected), all spacers get:
 * - Accented dashed border
 * - Delete button (top-right ×)
 * - Resize handle (bottom edge drag)
 */

import { useEffect, useRef, useCallback } from 'react'
import type { Spacer } from '@/types/spacer'

interface SpacersDisplayProps {
  spacers: Spacer[]
  onUpdateSpacer: (id: string, updates: Partial<Spacer>) => void
  onRemoveSpacer: (id: string) => void
  zoom: number
  active: boolean  // True when spacer tool is selected
  readOnly?: boolean
}

const MIN_SPACER_HEIGHT = 20
const MAX_SPACER_HEIGHT = 800

export function SpacersDisplay({
  spacers,
  onUpdateSpacer,
  onRemoveSpacer,
  zoom,
  active,
  readOnly = false,
}: SpacersDisplayProps) {
  // Track resize state in a ref (shared across pointer event handlers)
  const resizeRef = useRef<{
    spacerId: string
    startY: number
    startHeight: number
  } | null>(null)

  // Keep latest values in refs for window event listeners (updated in effects)
  const zoomRef = useRef(zoom)
  const onUpdateRef = useRef(onUpdateSpacer)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { onUpdateRef.current = onUpdateSpacer }, [onUpdateSpacer])

  // Window-level pointermove/pointerup for resize (set up once)
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!resizeRef.current) return
      e.preventDefault()
      const deltaY = (e.clientY - resizeRef.current.startY) / zoomRef.current
      const newHeight = Math.max(
        MIN_SPACER_HEIGHT,
        Math.min(MAX_SPACER_HEIGHT, resizeRef.current.startHeight + deltaY)
      )
      const el = document.querySelector(`[data-spacer-id="${resizeRef.current.spacerId}"]`) as HTMLElement
      if (el) el.style.height = `${Math.round(newHeight)}px`
    }

    const handleUp = (e: PointerEvent) => {
      if (!resizeRef.current) return
      e.preventDefault()
      const deltaY = (e.clientY - resizeRef.current.startY) / zoomRef.current
      const newHeight = Math.max(
        MIN_SPACER_HEIGHT,
        Math.min(MAX_SPACER_HEIGHT, resizeRef.current.startHeight + deltaY)
      )
      onUpdateRef.current(resizeRef.current.spacerId, { height: Math.round(newHeight) })
      resizeRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [])

  // Function to attach controls to all spacer DOM elements
  const attachControls = useCallback(() => {
    // Remove all existing controls first
    document.querySelectorAll('.spacer-element').forEach(el => {
      el.classList.remove('spacer-active')
      el.querySelectorAll('.spacer-controls').forEach(c => c.remove())
    })

    if (readOnly || !active) return []

    const cleanupFns: Array<() => void> = []

    for (const spacer of spacers) {
      const el = document.querySelector(`[data-spacer-id="${spacer.id}"]`) as HTMLElement
      if (!el) continue

      el.classList.add('spacer-active')

      // Controls wrapper
      const controls = document.createElement('div')
      controls.className = 'spacer-controls'
      controls.style.cssText = 'position:absolute;inset:0;pointer-events:none;'

      // Delete button
      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'spacer-delete-btn'
      deleteBtn.innerHTML = '×'
      deleteBtn.title = 'Remove spacer'
      deleteBtn.style.pointerEvents = 'auto'
      const handleDelete = (e: Event) => {
        e.stopPropagation()
        onRemoveSpacer(spacer.id)
      }
      deleteBtn.addEventListener('click', handleDelete)

      // Resize handle
      const resizeHandle = document.createElement('div')
      resizeHandle.className = 'spacer-resize-handle'
      resizeHandle.style.pointerEvents = 'auto'
      const handleResizeStart = (e: Event) => {
        const pe = e as PointerEvent
        pe.preventDefault()
        pe.stopPropagation()
        resizeRef.current = {
          spacerId: spacer.id,
          startY: pe.clientY,
          startHeight: spacer.height,
        }
      }
      resizeHandle.addEventListener('pointerdown', handleResizeStart)

      controls.appendChild(deleteBtn)
      controls.appendChild(resizeHandle)
      el.style.position = 'relative'
      el.appendChild(controls)

      cleanupFns.push(() => {
        deleteBtn.removeEventListener('click', handleDelete)
        resizeHandle.removeEventListener('pointerdown', handleResizeStart)
        controls.remove()
        el.classList.remove('spacer-active')
      })
    }

    return cleanupFns
  }, [spacers, active, readOnly, onRemoveSpacer])

  // Attach controls when spacers or active state changes.
  // Uses a small delay to run after the DOM injection effect has completed,
  // since both react to spacers changes but injection must happen first.
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanupFns = attachControls()
      // Store for cleanup on next run
      cleanupRef.current = cleanupFns
    }, 0)

    return () => {
      clearTimeout(timer)
      cleanupRef.current.forEach(fn => fn())
      cleanupRef.current = []
    }
  }, [attachControls])

  const cleanupRef = useRef<Array<() => void>>([])

  return null
}
