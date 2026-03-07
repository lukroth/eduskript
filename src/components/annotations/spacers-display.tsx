'use client'

/**
 * SpacersDisplay - Manages spacer interaction controls
 *
 * When `active` (spacer tool selected): spacers get accented border, resize handles,
 * and a floating side panel (left gutter, like highlighter UI) with pattern picker + delete.
 *
 * Resize handles respond to both touch and stylus (pointer events).
 * When not active, resize handles are still available via touch only.
 */

import { useEffect, useRef, useCallback, useState, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { SeparatorHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Spacer, SpacerPattern } from '@/types/spacer'

interface SpacersDisplayProps {
  spacers: Spacer[]
  onUpdateSpacer: (id: string, updates: Partial<Spacer>) => void
  onRemoveSpacer: (id: string) => void
  zoom: number
  active: boolean  // True when spacer tool is selected
  readOnly?: boolean
  lastCreatedSpacerId?: string | null  // Auto-open panel for newly created spacer
  onLastCreatedConsumed?: () => void   // Signal that we've consumed the lastCreatedSpacerId
}

const MIN_SPACER_HEIGHT = 20
const MAX_SPACER_HEIGHT = 800

const SPACER_PATTERNS: { key: SpacerPattern; label: string }[] = [
  { key: 'blank', label: 'Blank' },
  { key: 'checkered', label: 'Grid' },
  { key: 'lines', label: 'Lines' },
  { key: 'dots', label: 'Dots' },
]

export function SpacersDisplay({
  spacers,
  onUpdateSpacer,
  onRemoveSpacer,
  zoom,
  active,
  readOnly = false,
  lastCreatedSpacerId,
  onLastCreatedConsumed,
}: SpacersDisplayProps) {
  // Track resize state in a ref (shared across pointer event handlers)
  const resizeRef = useRef<{
    spacerId: string
    startY: number
    startHeight: number
  } | null>(null)

  // Which spacer's floating panel is open
  const [panelSpacerId, setPanelSpacerId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Keep latest values in refs for window event listeners
  const zoomRef = useRef(zoom)
  const onUpdateRef = useRef(onUpdateSpacer)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { onUpdateRef.current = onUpdateSpacer }, [onUpdateSpacer])

  // Close panel when clicking outside
  useEffect(() => {
    if (!panelSpacerId) return

    const handlePointerDown = (e: PointerEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      // Check if clicking on a spacer element
      const spacerEl = (e.target as HTMLElement).closest?.('[data-spacer-id]')
      if (spacerEl) {
        const clickedId = spacerEl.getAttribute('data-spacer-id')
        if (clickedId === panelSpacerId) return
        // Clicked a different spacer — switch panel
        setPanelSpacerId(clickedId)
        return
      }
      setPanelSpacerId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [panelSpacerId])

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

  // Attach controls to spacer DOM elements
  const attachControls = useCallback(() => {
    // Remove all existing controls first
    document.querySelectorAll('.spacer-element').forEach(el => {
      el.classList.remove('spacer-active')
      el.querySelectorAll('.spacer-controls').forEach(c => c.remove())
    })

    // Close panel when spacer tool is deactivated
    if (!active) setPanelSpacerId(null)

    // Auto-open panel for newly created spacer
    if (lastCreatedSpacerId && active) {
      setPanelSpacerId(lastCreatedSpacerId)
      onLastCreatedConsumed?.()
    }

    if (readOnly || !active) return []

    const cleanupFns: Array<() => void> = []

    for (const spacer of spacers) {
      const el = document.querySelector(`[data-spacer-id="${spacer.id}"]`) as HTMLElement
      if (!el) continue

      el.classList.add('spacer-active')
      el.style.zIndex = '43' // Above the placement overlay (z-index 42)
      el.style.position = 'relative'

      // Controls wrapper
      const controls = document.createElement('div')
      controls.className = 'spacer-controls'
      controls.style.cssText = 'position:absolute;inset:0;pointer-events:none;'

      // Clickable body overlay above the placement overlay (z-index 42)
      // so tapping an existing spacer opens the panel instead of creating a new one
      const bodyOverlay = document.createElement('div')
      bodyOverlay.className = 'spacer-body-overlay'
      bodyOverlay.style.cssText = 'position:absolute;inset:0;z-index:43;pointer-events:auto;cursor:pointer;'
      const handleBodyTap = (e: Event) => {
        e.stopPropagation()
        setPanelSpacerId(spacer.id)
      }
      bodyOverlay.addEventListener('pointerup', handleBodyTap)
      controls.appendChild(bodyOverlay)

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
      controls.appendChild(resizeHandle)

      el.appendChild(controls)

      cleanupFns.push(() => {
        resizeHandle.removeEventListener('pointerdown', handleResizeStart)
        bodyOverlay.removeEventListener('pointerup', handleBodyTap)
        controls.remove()
        el.classList.remove('spacer-active')
        el.style.zIndex = ''
      })
    }

    return cleanupFns
  }, [spacers, active, readOnly, lastCreatedSpacerId, onLastCreatedConsumed])

  // Attach controls when spacers or active state changes.
  // Uses a small delay to run after the DOM injection effect has completed.
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanupFns = attachControls()
      cleanupRef.current = cleanupFns
    }, 0)

    return () => {
      clearTimeout(timer)
      cleanupRef.current.forEach(fn => fn())
      cleanupRef.current = []
    }
  }, [attachControls])

  const cleanupRef = useRef<Array<() => void>>([])

  // Find the spacer data for the panel
  const panelSpacer = panelSpacerId ? spacers.find(s => s.id === panelSpacerId) : null

  return panelSpacer
    ? createPortal(
        <SpacerSidePanel
          ref={panelRef}
          spacer={panelSpacer}
          getSourceRect={() => {
            const el = document.querySelector(`[data-spacer-id="${CSS.escape(panelSpacer.id)}"]`)
            return el?.getBoundingClientRect() ?? null
          }}
          onPatternChange={(pattern) => onUpdateSpacer(panelSpacer.id, { pattern })}
          onDelete={() => {
            onRemoveSpacer(panelSpacer.id)
            setPanelSpacerId(null)
          }}
        />,
        document.body,
      )
    : null
}

// --- Floating side panel for spacer controls (pattern picker + delete) ---

interface SpacerSidePanelProps {
  spacer: Spacer
  getSourceRect: () => DOMRect | null
  onPatternChange: (pattern: SpacerPattern) => void
  onDelete: () => void
}

const SpacerSidePanel = forwardRef<HTMLDivElement, SpacerSidePanelProps>(
  function SpacerSidePanel({ spacer, getSourceRect, onPatternChange, onDelete }, ref) {
    const [pos, setPos] = useState({ left: 8, top: 0 })

    useEffect(() => {
      const update = () => {
        const paper = document.getElementById('paper')
        const sourceRect = getSourceRect()
        const paperLeft = paper ? paper.getBoundingClientRect().left : 0

        setPos({
          left: Math.max(8, paperLeft + 8),
          top: sourceRect ? sourceRect.top + sourceRect.height / 2 : pos.top,
        })
      }
      update()

      const scrollContainer = document.getElementById('scroll-container')
      scrollContainer?.addEventListener('scroll', update)
      window.addEventListener('resize', update)
      return () => {
        scrollContainer?.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pos.top fallback only used on initial render
    }, [getSourceRect])

    return (
      <div
        ref={ref}
        className="fixed flex flex-col items-center gap-1.5 rounded-lg border border-border bg-popover p-1.5 shadow-lg select-none"
        style={{
          left: pos.left,
          top: pos.top,
          transform: 'translateY(-50%)',
          zIndex: 45,
        }}
      >
        <SeparatorHorizontal className="h-4 w-4 text-muted-foreground/60" />
        <div className="w-4 h-px bg-border" />
        {SPACER_PATTERNS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={cn(
              'h-6 w-6 rounded border transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring spacer-preview',
              key === spacer.pattern
                ? 'border-foreground/50 scale-110'
                : 'border-black/10 dark:border-white/10',
            )}
            title={label}
            onClick={() => onPatternChange(key)}
          >
            <div className={cn('w-full h-full rounded-sm spacer-element', `spacer-${key}`)} />
          </button>
        ))}
        <div className="w-4 h-px bg-border" />
        <button
          type="button"
          className="flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground/60 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
          title="Remove spacer"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  },
)
