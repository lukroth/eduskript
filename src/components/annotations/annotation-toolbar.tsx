'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pen, Eraser, Trash2, Camera, Eye, EyeOff, Radio, User, ChevronDown } from 'lucide-react'
import { Circle } from '@uiw/react-color'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

// Types for broadcast controls
export interface ClassOption {
  id: string
  name: string
}

export interface StudentOption {
  id: string
  displayName: string
  pseudonym?: string
}

export type BroadcastMode = 'personal' | 'class' | 'student'

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

// =============================================================================
// TOOLBAR SECTION WRAPPER - provides consistent styling for each section
// =============================================================================

function ToolbarSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {children}
    </div>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />
}

export type AnnotationMode = 'view' | 'draw' | 'erase' | 'snap'

export interface AnnotationLayer {
  id: string
  label: string
  color: string // border color class like 'border-gray-500'
  visible: boolean
  hasContent: boolean
  isActive: boolean // true for the layer being edited
  canDelete: boolean // true if this layer can be cleared
}

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
  // Layers (for students - broadcasted teacher annotations)
  layers?: AnnotationLayer[]
  onLayerToggle?: (layerId: string) => void
  onLayerDelete?: (layerId: string) => void
  // My annotations controls
  myAnnotationsVisible?: boolean
  onMyAnnotationsToggle?: () => void
  onMyAnnotationsDelete?: () => void
  // Broadcast controls (teachers only)
  isTeacher?: boolean
  // For teachers: visibility/delete of broadcast layers
  classBroadcastVisible?: boolean
  onClassBroadcastToggle?: () => void
  onClassBroadcastDelete?: () => void
  hasClassBroadcastAnnotations?: boolean
  studentFeedbackVisible?: boolean
  onStudentFeedbackToggle?: () => void
  onStudentFeedbackDelete?: () => void
  hasStudentFeedbackAnnotations?: boolean
  classes?: ClassOption[]
  selectedClass?: ClassOption | null
  onClassSelect?: (classData: ClassOption | null) => void
  students?: StudentOption[]
  selectedStudent?: StudentOption | null
  onStudentSelect?: (student: StudentOption | null) => void
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
  layers = [],
  onLayerToggle,
  onLayerDelete,
  // My annotations
  myAnnotationsVisible = true,
  onMyAnnotationsToggle,
  onMyAnnotationsDelete,
  // Broadcast controls
  isTeacher = false,
  classBroadcastVisible = true,
  onClassBroadcastToggle,
  onClassBroadcastDelete,
  hasClassBroadcastAnnotations = false,
  studentFeedbackVisible = true,
  onStudentFeedbackToggle,
  onStudentFeedbackDelete,
  hasStudentFeedbackAnnotations = false,
  classes = [],
  selectedClass = null,
  onClassSelect,
  students = [],
  selectedStudent = null,
  onStudentSelect,
}: AnnotationToolbarProps) {
  // Broadcast dropdown state
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const classDropdownRef = useRef<HTMLDivElement>(null)
  const studentDropdownRef = useRef<HTMLDivElement>(null)

  // My annotations button state (for delete popup)
  const [showMyAnnotationsPopup, setShowMyAnnotationsPopup] = useState(false)
  const myAnnotationsRef = useRef<HTMLDivElement>(null)
  const myAnnotationsHoverTimer = useRef<NodeJS.Timeout | null>(null)
  const myAnnotationsHideTimer = useRef<NodeJS.Timeout | null>(null)
  const myAnnotationsLongPressTimer = useRef<NodeJS.Timeout | null>(null)
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setShowClassDropdown(false)
      }
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false)
      }
      if (myAnnotationsRef.current && !myAnnotationsRef.current.contains(e.target as Node)) {
        setShowMyAnnotationsPopup(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // My annotations button hover/long-press handlers
  const handleMyAnnotationsMouseEnter = () => {
    if (myAnnotationsHideTimer.current) {
      clearTimeout(myAnnotationsHideTimer.current)
      myAnnotationsHideTimer.current = null
    }
    myAnnotationsHoverTimer.current = setTimeout(() => {
      setShowMyAnnotationsPopup(true)
    }, 400)
  }

  const handleMyAnnotationsMouseLeave = () => {
    if (myAnnotationsHoverTimer.current) {
      clearTimeout(myAnnotationsHoverTimer.current)
      myAnnotationsHoverTimer.current = null
    }
    if (showMyAnnotationsPopup) {
      myAnnotationsHideTimer.current = setTimeout(() => {
        setShowMyAnnotationsPopup(false)
      }, 200)
    }
  }

  const handleMyAnnotationsPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    e.preventDefault()
    myAnnotationsLongPressTimer.current = setTimeout(() => {
      setShowMyAnnotationsPopup(true)
      myAnnotationsLongPressTimer.current = null
    }, 500)
  }

  const handleMyAnnotationsPointerUp = () => {
    if (myAnnotationsLongPressTimer.current) {
      clearTimeout(myAnnotationsLongPressTimer.current)
      myAnnotationsLongPressTimer.current = null
    }
  }

  const toolbarContent = (
    <div data-annotation-toolbar className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 select-none" style={{ isolation: 'isolate', touchAction: 'manipulation' }}>
      {/* Single horizontal toolbar */}
      <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg p-2 flex items-center gap-1">

        {/* ============ SECTION 1: Broadcast Controls (Teachers Only) ============ */}
        {isTeacher && (
          <>
            <ToolbarSection>
              {/* Class selector dropdown */}
              <div className="relative" ref={classDropdownRef}>
                <button
                  onClick={() => {
                    setShowClassDropdown(!showClassDropdown)
                    setShowStudentDropdown(false)
                  }}
                  className={cn(
                    'p-2 rounded-md transition-colors flex items-center gap-1',
                    selectedClass && !selectedStudent
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  title="Broadcast to class"
                >
                  <Radio className="w-5 h-5" />
                  <span className="text-xs max-w-[80px] truncate">
                    {selectedClass ? selectedClass.name : 'Class'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showClassDropdown && classes.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[200px] overflow-y-auto">
                    {/* Show non-selected classes only */}
                    {classes.filter(cls => cls.id !== selectedClass?.id).map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          onClassSelect?.(cls)
                          onStudentSelect?.(null)
                          setShowClassDropdown(false)
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm truncate hover:bg-accent transition-colors"
                      >
                        {cls.name}
                      </button>
                    ))}
                    {/* Divider before quick access section */}
                    <div className="h-px bg-border my-1" />
                    {/* Selected class with eye/trash (always shown when a class is selected) */}
                    {selectedClass && (
                      <div className={cn(
                        'flex items-center gap-1 px-2 py-1',
                        !selectedStudent && 'bg-accent'
                      )}>
                        <button
                          onClick={() => {
                            // Clear student selection to switch to "whole class" mode
                            onStudentSelect?.(null)
                            setShowClassDropdown(false)
                          }}
                          className={cn(
                            'flex-1 text-left text-sm truncate hover:text-foreground transition-colors',
                            !selectedStudent ? 'font-medium' : 'text-muted-foreground'
                          )}
                          title="Broadcast to entire class"
                        >
                          {selectedClass.name}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onClassBroadcastToggle?.()
                          }}
                          className={cn(
                            'p-1 rounded transition-colors',
                            classBroadcastVisible
                              ? 'text-foreground hover:bg-background/50'
                              : 'text-muted-foreground/50 hover:bg-background/50'
                          )}
                          title={classBroadcastVisible ? 'Hide class broadcast' : 'Show class broadcast'}
                        >
                          {classBroadcastVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onClassBroadcastDelete?.()
                          }}
                          className={cn(
                            'p-1 rounded transition-colors',
                            hasClassBroadcastAnnotations
                              ? 'text-muted-foreground hover:text-destructive hover:bg-background/50'
                              : 'text-muted-foreground/30 cursor-not-allowed'
                          )}
                          title="Clear class broadcast"
                          disabled={!hasClassBroadcastAnnotations}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {/* "Off" option with eye and trash for personal annotations */}
                    {!selectedClass && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-accent">
                        <span className="flex-1 text-left text-sm">
                          Off
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onMyAnnotationsToggle?.()
                          }}
                          className={cn(
                            'p-1 rounded transition-colors',
                            myAnnotationsVisible
                              ? 'text-foreground hover:bg-background/50'
                              : 'text-muted-foreground/50 hover:bg-background/50'
                          )}
                          title={myAnnotationsVisible ? 'Hide' : 'Show'}
                        >
                          {myAnnotationsVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onMyAnnotationsDelete?.()
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/50 transition-colors"
                          title="Clear"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Off option to switch to personal mode (when a class is selected) */}
                    {selectedClass && (
                      <button
                        onClick={() => {
                          onClassSelect?.(null)
                          onStudentSelect?.(null)
                          setShowClassDropdown(false)
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        Off
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Student selector dropdown (only when class is selected) */}
              {selectedClass && students.length > 0 && (
                <div className="relative" ref={studentDropdownRef}>
                  <button
                    onClick={() => {
                      setShowStudentDropdown(!showStudentDropdown)
                      setShowClassDropdown(false)
                    }}
                    className={cn(
                      'p-2 rounded-md transition-colors flex items-center gap-1',
                      selectedStudent
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                    title="Individual student feedback"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-xs max-w-[80px] truncate">
                      {selectedStudent ? selectedStudent.displayName : 'Student'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showStudentDropdown && (
                    <div className="absolute bottom-full mb-2 left-0 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[200px] overflow-y-auto">
                      {/* Show non-selected students only */}
                      {students.filter(s => s.id !== selectedStudent?.id).map(student => (
                        <button
                          key={student.id}
                          onClick={() => {
                            onStudentSelect?.(student)
                            setShowStudentDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm truncate hover:bg-accent transition-colors"
                        >
                          {student.displayName}
                        </button>
                      ))}
                      {/* Divider before quick access section */}
                      <div className="h-px bg-border my-1" />
                      {/* Selected student with eye/trash (or "Entire class" if none selected) */}
                      {selectedStudent ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-accent">
                          <span className="flex-1 text-left text-sm truncate font-medium">
                            {selectedStudent.displayName}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onStudentFeedbackToggle?.()
                            }}
                            className={cn(
                              'p-1 rounded transition-colors',
                              studentFeedbackVisible
                                ? 'text-foreground hover:bg-background/50'
                                : 'text-muted-foreground/50 hover:bg-background/50'
                            )}
                            title={studentFeedbackVisible ? 'Hide' : 'Show'}
                          >
                            {studentFeedbackVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onStudentFeedbackDelete?.()
                            }}
                            className={cn(
                              'p-1 rounded transition-colors',
                              hasStudentFeedbackAnnotations
                                ? 'text-muted-foreground hover:text-destructive hover:bg-background/50'
                                : 'text-muted-foreground/30 cursor-not-allowed'
                            )}
                            title="Clear student feedback"
                            disabled={!hasStudentFeedbackAnnotations}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-accent">
                          <span className="flex-1 text-left text-sm font-medium">
                            Entire class
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onClassBroadcastToggle?.()
                            }}
                            className={cn(
                              'p-1 rounded transition-colors',
                              classBroadcastVisible
                                ? 'text-foreground hover:bg-background/50'
                                : 'text-muted-foreground/50 hover:bg-background/50'
                            )}
                            title={classBroadcastVisible ? 'Hide' : 'Show'}
                          >
                            {classBroadcastVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onClassBroadcastDelete?.()
                            }}
                            className={cn(
                              'p-1 rounded transition-colors',
                              hasClassBroadcastAnnotations
                                ? 'text-muted-foreground hover:text-destructive hover:bg-background/50'
                                : 'text-muted-foreground/30 cursor-not-allowed'
                            )}
                            title="Clear class broadcast"
                            disabled={!hasClassBroadcastAnnotations}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {/* "Entire class" option to deselect student (when a student is selected) */}
                      {selectedStudent && (
                        <button
                          onClick={() => {
                            onStudentSelect?.(null)
                            setShowStudentDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          Entire class
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ToolbarSection>
            <ToolbarDivider />
          </>
        )}

        {/* ============ SECTION 2: Layer Controls (Students - broadcasted teacher layers) ============ */}
        {!isTeacher && layers.length > 0 && (
          <>
            <ToolbarSection>
              {layers.filter(l => !l.isActive).map(layer => (
                <div
                  key={layer.id}
                  className="flex items-center gap-0.5 px-1 py-0.5 rounded-md text-xs"
                >
                  {/* Eye toggle */}
                  <button
                    onClick={() => onLayerToggle?.(layer.id)}
                    className={cn(
                      'p-1 rounded transition-colors',
                      layer.visible
                        ? 'text-foreground hover:bg-accent'
                        : 'text-muted-foreground/50 hover:bg-accent'
                    )}
                    title={layer.visible ? `Hide ${layer.label}` : `Show ${layer.label}`}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <span className={cn('whitespace-nowrap', !layer.visible && 'text-muted-foreground/50')}>
                    {layer.label}
                  </span>
                </div>
              ))}
            </ToolbarSection>
            <ToolbarDivider />
          </>
        )}

        {/* ============ SECTION 3: My Annotations Button (Everyone) ============ */}
        <ToolbarSection>
          <div className="relative" ref={myAnnotationsRef}>
            <button
              onClick={onMyAnnotationsToggle}
              onMouseEnter={handleMyAnnotationsMouseEnter}
              onMouseLeave={handleMyAnnotationsMouseLeave}
              onPointerDown={handleMyAnnotationsPointerDown}
              onPointerUp={handleMyAnnotationsPointerUp}
              onPointerCancel={handleMyAnnotationsPointerUp}
              className={cn(
                'p-2 rounded-md transition-colors flex items-center gap-1',
                myAnnotationsVisible
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title={myAnnotationsVisible ? 'Hide my annotations' : 'Show my annotations'}
            >
              <User className="w-4 h-4" />
            </button>

            {/* Delete popup on hover/long-press */}
            {showMyAnnotationsPopup && hasAnnotations && (
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-2"
                onMouseEnter={() => {
                  if (myAnnotationsHideTimer.current) {
                    clearTimeout(myAnnotationsHideTimer.current)
                    myAnnotationsHideTimer.current = null
                  }
                }}
                onMouseLeave={() => setShowMyAnnotationsPopup(false)}
              >
                <button
                  onClick={() => {
                    onMyAnnotationsDelete?.()
                    setShowMyAnnotationsPopup(false)
                  }}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </ToolbarSection>
        <ToolbarDivider />

        {/* ============ SECTION 4: Drawing Tools ============ */}
        <ToolbarSection>
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
                className={cn(
                  'p-2 rounded-md transition-colors relative',
                  mode === 'draw' && activePen === penIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                title={`Pen ${penIndex + 1}`}
                aria-label={`Select pen ${penIndex + 1}`}
              >
                <Pen className="w-4 h-4" />
                {/* Color indicator */}
                <div
                  className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800"
                  style={{ backgroundColor: penColors[penIndex] }}
                />
              </button>

              {/* Pen controls popover (size slider + color picker) */}
              {showPenControls === penIndex && (
                <div
                  ref={penPopoverRef}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2"
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
                  <div className="bg-background border border-border rounded-lg shadow-lg p-3 flex flex-col items-center gap-3 min-h-[200px]">
                    <BrushThickIcon className="w-6 h-6 flex-shrink-0 opacity-60" />
                    <input
                      type="range"
                      min="2"
                      max="30"
                      step="1"
                      value={penSizes[penIndex]}
                      onChange={(e) => handleSizeChange(penIndex, parseFloat(e.target.value))}
                      className="flex-grow cursor-pointer [writing-mode:vertical-lr] [direction:rtl] slider-vertical"
                    />
                    <BrushThinIcon className="w-6 h-6 flex-shrink-0 opacity-60" />
                  </div>

                  {/* Color picker */}
                  <div className="bg-background border border-border rounded-lg shadow-lg p-3 annotation-color-picker">
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
            className={cn(
              'p-2 rounded-md transition-colors',
              mode === 'erase'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title="Erase"
            aria-label="Toggle eraser mode"
          >
            <Eraser className="w-4 h-4" />
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
              className={cn(
                'p-2 rounded-md transition-colors relative',
                snapDisabled
                  ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                  : mode === 'snap'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title={snapDisabled ? "Zoom must be at 1.0 to capture snaps" : "Capture screenshot"}
              aria-label="Toggle snap mode"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Snap controls popup */}
            {showSnapControls && snapDisabled && (
              <div
                ref={snapPopoverRef}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2"
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
        </ToolbarSection>
      </div>
    </div>
  )

  // Render to document.body to avoid zoom transforms
  return typeof window !== 'undefined' ? createPortal(toolbarContent, document.body) : toolbarContent
}
