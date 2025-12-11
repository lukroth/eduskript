'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pen, Eraser, Trash2, Camera, AlertTriangle, Loader2, Check } from 'lucide-react'
import { Circle } from '@uiw/react-color'

// Inline SVG brush icons - use currentColor for automatic light/dark mode support
function BrushThickIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 95.1 55.3"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="m 3.85,34.79 c 0.78,-2.2 0.63,-9.42 5.89,-13.31 1.27,-0.94 2.93,-1.78 4.86,-2.43 4.27,-1.44 9.31,-1.83 14.44,-1.13 4.39,0.6 8.33,1.92 11.87,3.43 3.75,1.59 6.93,3.3 9.61,4.52 0.39,0.18 0.76,0.34 1.12,0.49 2.75,1.17 5.16,2.22 7.65,3.1 3.03,1.08 6.02,1.86 9.16,2.08 1.45,0.1 2.94,0.09 4.45,-0.06 1.95,-0.19 4.09,-0.62 6.4,-1.37 5.39,-1.73 10,-4.6 13.02,-6.64 -2.67,2.38 -7,5.87 -12.16,8.64 -2.26,1.21 -4.39,2.14 -6.43,2.88 -1.58,0.57 -3.18,1.06 -4.8,1.46 -3.56,0.87 -7.14,1.29 -10.94,1.31 -3.06,0.02 -6.09,-0.22 -9.19,-0.6 -0.41,-0.05 -0.84,-0.1 -1.27,-0.14 -2.99,-0.3 -6.5,-0.48 -9.85,-0.39 -3.27,0.09 -6.08,0.41 -8.93,0.91 -3.2,0.57 -6.1,1.33 -8.82,1.74 -1.26,0.19 -2.5,0.3 -3.63,0.23 -4.55,-0.26 -10.06,-4.27 -12.45,-4.75 z" />
    </svg>
  )
}

function BrushThinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 95.1 55.3"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="m 2.28,32.96 c -0.09,-0.72 -1.63,-2.21 -0.48,-4.31 1.27,-2.32 5.92,-6.36 11.84,-8.99 4.28,-1.9 8.82,-2.93 13.48,-2.93 4.28,0 8.18,0.85 11.73,2.03 3.84,1.28 7.55,3.07 10.18,4.3 0.31,0.15 0.62,0.29 0.92,0.43 2.96,1.36 5.77,2.8 8.73,4.17 3.38,1.56 6.61,2.84 9.98,3.61 1.54,0.35 3.1,0.6 4.69,0.71 2.06,0.15 4.29,0.09 6.68,-0.25 5.57,-0.8 10.24,-2.9 13.3,-4.47 -2.96,1.73 -7.58,4.04 -13.16,5.27 -2.42,0.53 -4.69,0.8 -6.85,0.9 -1.66,0.08 -3.31,0.06 -4.98,-0.04 -3.66,-0.22 -7.27,-0.86 -11.06,-1.85 -3.15,-0.82 -6.15,-1.82 -9.4,-2.93 -0.3,-0.1 -0.62,-0.21 -0.94,-0.31 -2.81,-0.92 -6.32,-1.91 -9.85,-2.43 -3.19,-0.47 -6.29,-0.55 -9.45,-0.11 -3.41,0.47 -6.64,1.52 -9.95,3.01 -4.61,2.07 -9.02,4.98 -11.38,5.56 -2.15,0.53 -3.36,-1.16 -4.05,-1.37 z" />
    </svg>
  )
}

export type AnnotationMode = 'view' | 'draw' | 'erase' | 'snap'

export type SyncState = 'idle' | 'saving' | 'saved' | 'error'

interface AnnotationToolbarProps {
  mode: AnnotationMode
  onModeChange: (mode: AnnotationMode) => void
  onClear: () => void
  hasAnnotations: boolean
  activePen: number
  onPenChange: (penIndex: number) => void
  penColors: [string, string, string]
  onPenColorChange: (penIndex: number, color: string) => void
  penSizes: [number, number, number]
  onPenSizeChange: (penIndex: number, size: number) => void
  onResetZoom: () => void
  // Sync status
  saveState?: SyncState
  versionMismatch?: boolean
  onClearMismatch?: () => void
}

export function AnnotationToolbar({
  mode,
  onModeChange,
  onClear,
  hasAnnotations,
  activePen,
  onPenChange,
  penColors,
  onPenColorChange,
  penSizes,
  onPenSizeChange,
  onResetZoom,
  saveState = 'idle',
  versionMismatch = false,
  onClearMismatch
}: AnnotationToolbarProps) {
  // Save confirm preference to localStorage
  const handleToggleConfirm = (value: boolean) => {
    setConfirmBeforeDelete(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('annotation-confirm-delete', value.toString())
    }
  }

  const handleColorChange = (penIndex: number, color: string) => {
    onPenColorChange(penIndex, color)
    onPenChange(penIndex)
    if (mode !== 'draw') {
      onModeChange('draw')
    }
  }

  const handleSizeChange = (penIndex: number, size: number) => {
    onPenSizeChange(penIndex, size)
    onPenChange(penIndex)
    if (mode !== 'draw') {
      onModeChange('draw')
    }
  }

  const [showPenControls, setShowPenControls] = useState<number | null>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressStartPos = useRef<{ x: number; y: number } | null>(null)

  const [showDeleteControls, setShowDeleteControls] = useState(false)
  const deleteHoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deleteHideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deleteLongPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deleteLongPressStartPos = useRef<{ x: number; y: number } | null>(null)

  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState<boolean>(() => {
    // Load preference from localStorage - default is false (no popup)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('annotation-confirm-delete')
      if (saved !== null) {
        return saved === 'true'
      }
    }
    return false
  })

  const [showSnapControls, setShowSnapControls] = useState(false)
  const snapHoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const snapHideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const snapLongPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const snapLongPressStartPos = useRef<{ x: number; y: number } | null>(null)

  // Sync status indicator state
  const [showSyncDetails, setShowSyncDetails] = useState(false)
  const [savedHovered, setSavedHovered] = useState(false)

  // Allow snapping at any zoom level
  const snapDisabled = false

  // Ref for the popover elements to detect clicks outside
  const penPopoverRef = useRef<HTMLDivElement>(null)
  const deletePopoverRef = useRef<HTMLDivElement>(null)
  const snapPopoverRef = useRef<HTMLDivElement>(null)

  // Close popovers when stylus touches paper or when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element

      // Close all popovers on stylus input on paper/canvas (user wants to draw)
      if (e.pointerType === 'pen') {
        // Only close if touching paper/canvas area, not the toolbar
        const isOnToolbar = target.closest('[data-annotation-toolbar]')
        if (!isOnToolbar) {
          setShowPenControls(null)
          setShowDeleteControls(false)
          setShowSnapControls(false)
        }
        return
      }

      // For touch/mouse, close if clicking outside the popover and toolbar
      const isInsideToolbar = target.closest('[data-annotation-toolbar]')
      if (isInsideToolbar) return // Don't close for any toolbar interaction

      // Clicking outside toolbar closes all popovers
      if (showPenControls !== null) {
        setShowPenControls(null)
      }
      if (showDeleteControls) {
        setShowDeleteControls(false)
      }
      if (showSnapControls) {
        setShowSnapControls(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [showPenControls, showDeleteControls, showSnapControls])

  const handlePenMouseEnter = (penIndex: number) => {
    // Clear any pending hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    // Set timer to show pen controls
    hoverTimerRef.current = setTimeout(() => {
      setShowPenControls(penIndex)
    }, 300)
  }

  const handlePenMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    // If pen controls are showing, delay hiding them to give user time to move into them
    if (showPenControls !== null) {
      hideTimerRef.current = setTimeout(() => {
        setShowPenControls(null)
      }, 200)
    }
  }

  const handlePenClick = (penIndex: number) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setShowPenControls(null)

    // If clicking the currently active pen, deactivate it
    if (mode === 'draw' && activePen === penIndex) {
      onModeChange('view')
    } else {
      // Switch to this pen and enter draw mode
      onPenChange(penIndex)
      if (mode !== 'draw') {
        onModeChange('draw')
      }
    }
  }

  // Long-press handlers for pen tools (stylus/touch support)
  const handlePenPointerDown = (e: React.PointerEvent, penIndex: number) => {
    // Only handle touch/pen, not mouse (mouse uses hover)
    if (e.pointerType === 'mouse') return

    // Prevent default to avoid text selection on long-press (iOS Safari)
    e.preventDefault()

    longPressStartPos.current = { x: e.clientX, y: e.clientY }
    longPressTimerRef.current = setTimeout(() => {
      setShowPenControls(penIndex)
      // Also select this pen when opening its config
      onPenChange(penIndex)
      if (mode !== 'draw') {
        onModeChange('draw')
      }
      longPressTimerRef.current = null
    }, 500)
  }

  const handlePenPointerMove = (e: React.PointerEvent) => {
    if (!longPressStartPos.current || !longPressTimerRef.current) return

    const dx = e.clientX - longPressStartPos.current.x
    const dy = e.clientY - longPressStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Cancel long-press if moved more than 10px
    if (distance > 10) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
      longPressStartPos.current = null
    }
  }

  const handlePenPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartPos.current = null
  }

  const handleEraserClick = () => {
    onModeChange(mode === 'erase' ? 'view' : 'erase')
  }

  const handleDeleteMouseEnter = () => {
    // Clear any pending hide timer
    if (deleteHideTimerRef.current) {
      clearTimeout(deleteHideTimerRef.current)
      deleteHideTimerRef.current = null
    }

    // Set timer to show delete controls
    deleteHoverTimerRef.current = setTimeout(() => {
      setShowDeleteControls(true)
    }, 300)
  }

  const handleDeleteMouseLeave = () => {
    if (deleteHoverTimerRef.current) {
      clearTimeout(deleteHoverTimerRef.current)
      deleteHoverTimerRef.current = null
    }

    // If delete controls are showing, delay hiding them
    if (showDeleteControls) {
      deleteHideTimerRef.current = setTimeout(() => {
        setShowDeleteControls(false)
      }, 200)
    }
  }

  const handleDeleteClick = () => {
    if (deleteHoverTimerRef.current) {
      clearTimeout(deleteHoverTimerRef.current)
      deleteHoverTimerRef.current = null
    }
    setShowDeleteControls(false)

    if (confirmBeforeDelete) {
      if (confirm('Clear all annotations on this page?')) {
        onClear()
      }
    } else {
      onClear()
    }
  }

  // Long-press handlers for delete button (stylus/touch support)
  const handleDeletePointerDown = (e: React.PointerEvent) => {
    // Only handle touch/pen, not mouse (mouse uses hover)
    if (e.pointerType === 'mouse') return

    // Prevent default to avoid text selection on long-press (iOS Safari)
    e.preventDefault()

    deleteLongPressStartPos.current = { x: e.clientX, y: e.clientY }
    deleteLongPressTimerRef.current = setTimeout(() => {
      setShowDeleteControls(true)
      deleteLongPressTimerRef.current = null
    }, 500)
  }

  const handleDeletePointerMove = (e: React.PointerEvent) => {
    if (!deleteLongPressStartPos.current || !deleteLongPressTimerRef.current) return

    const dx = e.clientX - deleteLongPressStartPos.current.x
    const dy = e.clientY - deleteLongPressStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Cancel long-press if moved more than 10px
    if (distance > 10) {
      clearTimeout(deleteLongPressTimerRef.current)
      deleteLongPressTimerRef.current = null
      deleteLongPressStartPos.current = null
    }
  }

  const handleDeletePointerUp = () => {
    if (deleteLongPressTimerRef.current) {
      clearTimeout(deleteLongPressTimerRef.current)
      deleteLongPressTimerRef.current = null
    }
    deleteLongPressStartPos.current = null
  }

  const handleSnapMouseEnter = () => {
    if (!snapDisabled) return

    // Clear any pending hide timer
    if (snapHideTimerRef.current) {
      clearTimeout(snapHideTimerRef.current)
      snapHideTimerRef.current = null
    }

    // Set timer to show snap controls
    snapHoverTimerRef.current = setTimeout(() => {
      setShowSnapControls(true)
    }, 300)
  }

  const handleSnapMouseLeave = () => {
    if (snapHoverTimerRef.current) {
      clearTimeout(snapHoverTimerRef.current)
      snapHoverTimerRef.current = null
    }

    // If snap controls are showing, delay hiding them
    if (showSnapControls) {
      snapHideTimerRef.current = setTimeout(() => {
        setShowSnapControls(false)
      }, 200)
    }
  }

  const handleSnapClick = () => {
    if (snapDisabled) return
    onModeChange(mode === 'snap' ? 'view' : 'snap')
  }

  // Long-press handlers for snap button (stylus/touch support)
  const handleSnapPointerDown = (e: React.PointerEvent) => {
    // Only handle touch/pen, not mouse (mouse uses hover)
    if (e.pointerType === 'mouse' || !snapDisabled) return

    // Prevent default to avoid text selection on long-press (iOS Safari)
    e.preventDefault()

    snapLongPressStartPos.current = { x: e.clientX, y: e.clientY }
    snapLongPressTimerRef.current = setTimeout(() => {
      setShowSnapControls(true)
      snapLongPressTimerRef.current = null
    }, 500)
  }

  const handleSnapPointerMove = (e: React.PointerEvent) => {
    if (!snapLongPressStartPos.current || !snapLongPressTimerRef.current) return

    const dx = e.clientX - snapLongPressStartPos.current.x
    const dy = e.clientY - snapLongPressStartPos.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Cancel long-press if moved more than 10px
    if (distance > 10) {
      clearTimeout(snapLongPressTimerRef.current)
      snapLongPressTimerRef.current = null
      snapLongPressStartPos.current = null
    }
  }

  const handleSnapPointerUp = () => {
    if (snapLongPressTimerRef.current) {
      clearTimeout(snapLongPressTimerRef.current)
      snapLongPressTimerRef.current = null
    }
    snapLongPressStartPos.current = null
  }

  // Determine if we should show the sync indicator
  // Only show for errors/warnings, or briefly for save states
  const showSyncIndicator = versionMismatch || saveState === 'error' || saveState === 'saving' || saveState === 'saved'

  const toolbarContent = (
    <div data-annotation-toolbar className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 select-none" style={{ isolation: 'isolate', touchAction: 'manipulation' }}>
      {/* Sync status indicator - subtle circle icon above toolbar, centered */}
      {showSyncIndicator && (
        <div className="relative flex justify-center">
          {versionMismatch ? (
            // Warning state - slightly more visible, clickable
            <>
              <button
                onClick={() => setShowSyncDetails(!showSyncDetails)}
                onMouseEnter={() => setShowSyncDetails(true)}
                onMouseLeave={() => setShowSyncDetails(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors"
                title="Content updated - click for options"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>

              {/* Version mismatch details popup */}
              {showSyncDetails && (
                <div
                  className="absolute bottom-full mb-2 right-0 bg-background border border-border rounded-lg shadow-lg p-3 w-56 text-sm"
                  onMouseEnter={() => setShowSyncDetails(true)}
                  onMouseLeave={() => setShowSyncDetails(false)}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      Page content has changed. Your annotations may not align correctly.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClearMismatch?.()
                      setShowSyncDetails(false)
                    }}
                    className="w-full px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 text-xs transition-colors"
                  >
                    Clear annotations
                  </button>
                </div>
              )}
            </>
          ) : saveState === 'error' ? (
            // Error state - visible
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center bg-destructive/20 text-destructive cursor-help"
              title="Error saving annotations"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          ) : saveState === 'saving' ? (
            // Saving state - subtle spinner
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center opacity-40 cursor-default"
              title="Saving..."
            >
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : saveState === 'saved' ? (
            // Saved state - very subtle check that fades out (unless hovered)
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground cursor-default"
              title="Saved"
              onMouseEnter={() => setSavedHovered(true)}
              onMouseLeave={() => setSavedHovered(false)}
              style={{
                animation: savedHovered ? 'none' : 'fadeInOut 2s ease-in-out forwards',
                opacity: savedHovered ? 0.4 : undefined,
              }}
            >
              <Check className="w-4 h-4" />
              <style>{`
                @keyframes fadeInOut {
                  0% { opacity: 0; }
                  20% { opacity: 0.4; }
                  60% { opacity: 0.4; }
                  100% { opacity: 0; }
                }
              `}</style>
            </div>
          ) : null}
        </div>
      )}

      {/* Main toolbar */}
      <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg p-2 flex flex-col gap-1">
      {/* Three Pen Tools */}
      {[0, 1, 2].map((penIndex) => (
        <div key={penIndex} className="relative">
          <button
            data-pen-button
            onClick={() => handlePenClick(penIndex)}
            onMouseEnter={() => handlePenMouseEnter(penIndex)}
            onMouseLeave={handlePenMouseLeave}
            onPointerDown={(e) => handlePenPointerDown(e, penIndex)}
            onPointerMove={handlePenPointerMove}
            onPointerUp={handlePenPointerUp}
            onPointerCancel={handlePenPointerUp}
            className={`p-3 rounded-md transition-colors relative ${
              mode === 'draw' && activePen === penIndex
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
            title={`Pen ${penIndex + 1}`}
            aria-label={`Select pen ${penIndex + 1}`}
          >
            <Pen className="w-5 h-5" />
            {/* Color indicator */}
            <div
              className="annotation-color-indicator absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: penColors[penIndex] }}
            />
          </button>

          {/* Pen controls popover (size slider + color picker) */}
          {showPenControls === penIndex && (
            <div
              ref={penPopoverRef}
              className="absolute right-full mr-2 bottom-0 flex gap-2"
              onMouseEnter={() => {
                if (hoverTimerRef.current) {
                  clearTimeout(hoverTimerRef.current)
                }
                if (hideTimerRef.current) {
                  clearTimeout(hideTimerRef.current)
                  hideTimerRef.current = null
                }
              }}
              onMouseLeave={() => setShowPenControls(null)}
            >
              {/* Size slider */}
              <div className="bg-background border border-border rounded-full shadow-lg p-3 flex flex-col items-center gap-3 h-full min-h-[200px]">
                {/* Thick brush icon (top) */}
                <BrushThickIcon className="w-8 h-8 flex-shrink-0 opacity-60" />

                {/* Vertical slider */}
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={penSizes[penIndex]}
                  onChange={(e) => handleSizeChange(penIndex, parseFloat(e.target.value))}
                  className="flex-grow cursor-pointer [writing-mode:vertical-lr] [direction:rtl] slider-vertical"
                />

                {/* Thin brush icon (bottom) */}
                <BrushThinIcon className="w-8 h-8 flex-shrink-0 opacity-60" />
              </div>

              {/* Color picker */}
              <div className="bg-background border border-border rounded-full shadow-lg p-3 annotation-color-picker">
                <Circle
                  colors={['#000000', '#808080', '#DD5555', '#EE8844', '#44AA66', '#5577DD', '#9966DD']}
                  color={penColors[penIndex]}
                  onChange={(color) => handleColorChange(penIndex, color.hex)}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Eraser Tool */}
      <button
        onClick={handleEraserClick}
        className={`p-3 rounded-md transition-colors ${
          mode === 'erase'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
        title="Erase"
        aria-label="Toggle eraser mode"
      >
        <Eraser className="w-5 h-5" />
      </button>

      {/* Snap Tool */}
      <div
        className="relative"
        onMouseEnter={handleSnapMouseEnter}
        onMouseLeave={handleSnapMouseLeave}
      >
        <button
          data-snap-button
          onClick={handleSnapClick}
          onPointerDown={handleSnapPointerDown}
          onPointerMove={handleSnapPointerMove}
          onPointerUp={handleSnapPointerUp}
          onPointerCancel={handleSnapPointerUp}
          disabled={snapDisabled}
          className={`p-3 rounded-md transition-colors relative ${
            snapDisabled
              ? 'opacity-50 cursor-not-allowed text-muted-foreground'
              : mode === 'snap'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          title={snapDisabled ? "Zoom must be at 1.0 to capture snaps" : "Capture screenshot"}
          aria-label="Toggle snap mode"
        >
          <Camera className="w-5 h-5" />
          {snapDisabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg className="w-6 h-6 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </div>
          )}
        </button>

        {/* Snap controls popup */}
        {showSnapControls && snapDisabled && (
          <div
            ref={snapPopoverRef}
            className="absolute right-full mr-2 bottom-0"
            onMouseEnter={() => {
              if (snapHoverTimerRef.current) {
                clearTimeout(snapHoverTimerRef.current)
              }
              if (snapHideTimerRef.current) {
                clearTimeout(snapHideTimerRef.current)
                snapHideTimerRef.current = null
              }
            }}
            onMouseLeave={() => setShowSnapControls(false)}
          >
            <div className="bg-background border border-border rounded-lg shadow-lg p-3 whitespace-nowrap">
              <div className="text-xs text-foreground mb-2">
                Snapping only works without zoom
              </div>
              <button
                onClick={() => {
                  onResetZoom()
                  setShowSnapControls(false)
                }}
                className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-xs transition-colors"
              >
                Reset zoom
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      {hasAnnotations && <div className="h-px bg-border my-1" />}

      {/* Clear All */}
      {hasAnnotations && (
        <div className="relative">
          <button
            data-delete-button
            onClick={handleDeleteClick}
            onMouseEnter={handleDeleteMouseEnter}
            onMouseLeave={handleDeleteMouseLeave}
            onPointerDown={handleDeletePointerDown}
            onPointerMove={handleDeletePointerMove}
            onPointerUp={handleDeletePointerUp}
            onPointerCancel={handleDeletePointerUp}
            className="p-3 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Clear all annotations"
            aria-label="Clear all annotations"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Delete confirmation toggle popup */}
          {showDeleteControls && (
            <div
              ref={deletePopoverRef}
              className="absolute right-full mr-2 bottom-0"
              onMouseEnter={() => {
                if (deleteHoverTimerRef.current) {
                  clearTimeout(deleteHoverTimerRef.current)
                }
                if (deleteHideTimerRef.current) {
                  clearTimeout(deleteHideTimerRef.current)
                  deleteHideTimerRef.current = null
                }
              }}
              onMouseLeave={() => setShowDeleteControls(false)}
            >
              <div className="bg-background border border-border rounded-lg shadow-lg p-3 whitespace-nowrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-foreground">Confirm deletion</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={confirmBeforeDelete}
                    onClick={() => handleToggleConfirm(!confirmBeforeDelete)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      confirmBeforeDelete ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        confirmBeforeDelete ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  )

  // Render to document.body to avoid zoom transforms
  return typeof window !== 'undefined' ? createPortal(toolbarContent, document.body) : toolbarContent
}
