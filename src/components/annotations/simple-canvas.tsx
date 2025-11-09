'use client'

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import simplify from 'simplify-js'

export type DrawMode = 'draw' | 'erase'

interface SimpleCanvasProps {
  width: number
  height: number
  mode: DrawMode | 'view'
  onUpdate: (data: string) => void
  initialData?: string
  strokeWidth?: number
  strokeColor?: string
  eraserWidth?: number
  stylusModeActive?: boolean
  onStylusDetected?: () => void
  onNonStylusInput?: () => void
  zoom?: number
}

export interface SimpleCanvasHandle {
  clear: () => void
  exportData: () => string
}

export const SimpleCanvas = forwardRef<SimpleCanvasHandle, SimpleCanvasProps>(
  ({ width, height, mode, onUpdate, initialData, strokeWidth = 2, strokeColor = '#000000', eraserWidth = 10, stylusModeActive = false, onStylusDetected, onNonStylusInput, zoom = 1.0 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const pathsRef = useRef<Array<{ points: Array<{ x: number; y: number; pressure: number }>; mode: DrawMode; color: string; width: number }>>([])
    const currentPathRef = useRef<Array<{ x: number; y: number; pressure: number }>>([])
    const [shouldFadeIn, setShouldFadeIn] = useState(false)
    const hasLoadedInitialDataRef = useRef(false)
    const activePointersRef = useRef<Set<number>>(new Set())

    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Redraw all paths with pressure-sensitive line width and Bezier smoothing
      pathsRef.current.forEach(path => {
        if (path.points.length < 2) return

        ctx.strokeStyle = path.mode === 'erase' ? '#FFFFFF' : path.color
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalCompositeOperation = path.mode === 'erase' ? 'destination-out' : 'source-over'

        const points = path.points

        // For very short strokes (2 points), just draw a straight line
        if (points.length === 2) {
          const baseWidth = path.mode === 'erase' ? eraserWidth : path.width
          const lineWidth = baseWidth * (points[1].pressure || 0.5)

          ctx.beginPath()
          ctx.lineWidth = lineWidth
          ctx.moveTo(points[0].x, points[0].y)
          ctx.lineTo(points[1].x, points[1].y)
          ctx.stroke()
          return
        }

        // For longer strokes, use quadratic Bezier curves with pressure-sensitive width
        // Draw segments with varying width based on pressure
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i]
          const p1 = points[i + 1]

          // Calculate control point as midpoint between current and next point
          const cpX = (p0.x + p1.x) / 2
          const cpY = (p0.y + p1.y) / 2

          // Calculate line width based on pressure at current point
          const baseWidth = path.mode === 'erase' ? eraserWidth : path.width
          const lineWidth = baseWidth * (p0.pressure || 0.5)

          ctx.beginPath()
          ctx.lineWidth = lineWidth

          if (i === 0) {
            // First segment: start at first point
            ctx.moveTo(p0.x, p0.y)
            ctx.quadraticCurveTo(p0.x, p0.y, cpX, cpY)
          } else {
            // Middle segments: start at previous midpoint
            const prevP = points[i - 1]
            const prevCpX = (prevP.x + p0.x) / 2
            const prevCpY = (prevP.y + p0.y) / 2
            ctx.moveTo(prevCpX, prevCpY)
            ctx.quadraticCurveTo(p0.x, p0.y, cpX, cpY)
          }

          ctx.stroke()
        }

        // Draw final segment to last point
        const lastIdx = points.length - 1
        const secondLastIdx = lastIdx - 1
        const lastPoint = points[lastIdx]
        const secondLastPoint = points[secondLastIdx]

        const finalCpX = (secondLastPoint.x + lastPoint.x) / 2
        const finalCpY = (secondLastPoint.y + lastPoint.y) / 2

        const baseWidth = path.mode === 'erase' ? eraserWidth : path.width
        const lineWidth = baseWidth * (lastPoint.pressure || 0.5)

        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.moveTo(finalCpX, finalCpY)
        ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, lastPoint.x, lastPoint.y)
        ctx.stroke()
      })
    }, [eraserWidth, zoom])

    // Set up high-DPI canvas scaling with zoom support
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const dpr = window.devicePixelRatio || 1
      // Include zoom in resolution calculation for crisp rendering at any zoom level
      const totalScale = dpr * zoom
      const scaledWidth = width * totalScale
      const scaledHeight = height * totalScale

      // Only reset canvas if dimensions actually changed
      if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
        // Set internal canvas resolution (scaled by device pixel ratio AND zoom)
        canvas.width = scaledWidth
        canvas.height = scaledHeight

        // Scale context so drawing coordinates stay in CSS pixels
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(totalScale, totalScale)
        }

        // Redraw existing paths at new resolution
        redrawCanvas()
      }
    }, [width, height, zoom, redrawCanvas])

    // Load initial data
    useEffect(() => {
      if (initialData && canvasRef.current) {
        try {
          const paths = JSON.parse(initialData)
          console.log('Loading initial data:', paths.length, 'paths')
          pathsRef.current = paths
          // Only trigger fade-in animation on the FIRST load, not on subsequent updates
          if (paths.length > 0 && !hasLoadedInitialDataRef.current) {
            hasLoadedInitialDataRef.current = true
            setShouldFadeIn(true)
            // Remove the fade-in class after animation completes (0.5s)
            setTimeout(() => {
              setShouldFadeIn(false)
            }, 500)
          }
          redrawCanvas()
        } catch (error) {
          console.error('Error loading canvas data:', error)
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData])

    const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      // Track active pointers for multi-touch detection
      activePointersRef.current.add(e.pointerId)

      // Don't draw if multiple pointers are active (pinch gesture)
      if (activePointersRef.current.size > 1) {
        return
      }

      // Detect stylus input first, before any other checks
      const isStylusInput = e.pointerType === 'pen'
      if (isStylusInput && onStylusDetected) {
        onStylusDetected()
      }

      // In stylus mode, only allow pen input for drawing
      if (stylusModeActive && !isStylusInput) {
        // Switch to view mode when non-stylus input is detected
        if (onNonStylusInput) {
          onNonStylusInput()
        }
        return
      }

      // If we're in view mode but just detected stylus, allow it to proceed
      // (the mode will switch to draw, but that happens asynchronously)
      if (mode === 'view' && !isStylusInput) {
        return
      }

      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      isDrawingRef.current = true
      const rect = canvas.getBoundingClientRect()
      // Convert screen coordinates to canvas coordinates
      // The canvas CSS size matches the scaled section size, so we need to scale down to internal coordinates
      const x = (e.clientX - rect.left) * (width / rect.width)
      const y = (e.clientY - rect.top) * (height / rect.height)
      const pressure = e.pressure || 0.5 // Default to 0.5 for mouse

      currentPathRef.current = [{ x, y, pressure }]
    }, [mode, stylusModeActive, onStylusDetected, onNonStylusInput, zoom, width, height])

    const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      // Don't draw if multiple pointers are active (pinch gesture)
      if (activePointersRef.current.size > 1) {
        return
      }

      if (!isDrawingRef.current || mode === 'view') return

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()

      // Get all coalesced events for higher sampling rate
      // Falls back to single event if getCoalescedEvents is not supported
      const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent]

      // Process each coalesced event to capture all intermediate points
      events.forEach((event) => {
        // Convert screen coordinates to canvas coordinates
        // The canvas CSS size matches the scaled section size, so we need to scale down to internal coordinates
        const x = (event.clientX - rect.left) * (width / rect.width)
        const y = (event.clientY - rect.top) * (height / rect.height)
        const pressure = event.pressure || 0.5 // Default to 0.5 for mouse

        currentPathRef.current.push({ x, y, pressure })

        // Draw segment with pressure-sensitive width
        const points = currentPathRef.current
        if (points.length >= 2) {
          const lastPoint = points[points.length - 2]
          const currentPoint = points[points.length - 1]

          const baseWidth = mode === 'erase' ? eraserWidth : strokeWidth
          const lineWidth = baseWidth * currentPoint.pressure

          ctx.beginPath()
          ctx.strokeStyle = mode === 'erase' ? '#FFFFFF' : strokeColor
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over'

          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(currentPoint.x, currentPoint.y)
          ctx.stroke()
        }
      })
    }, [mode, strokeColor, strokeWidth, eraserWidth, zoom, width, height])

    const stopDrawing = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
      // Remove pointer from tracking
      if (e) {
        activePointersRef.current.delete(e.pointerId)
      }

      if (!isDrawingRef.current) return

      isDrawingRef.current = false

      if (currentPathRef.current.length > 0 && mode !== 'view') {
        // Simplify points using Ramer-Douglas-Peucker algorithm
        // Convert to simplify-js format (expects x, y properties)
        const simplifyPoints = currentPathRef.current.map(p => ({ x: p.x, y: p.y }))
        const simplified = simplify(simplifyPoints, 1.5, true) // epsilon=1.5, high quality mode

        // Convert back to our format, preserving pressure from original points
        // For each simplified point, find the closest original point's pressure
        const simplifiedWithPressure = simplified.map(sp => {
          // Find closest original point
          let minDist = Infinity
          let closestPressure = 0.5
          for (const op of currentPathRef.current) {
            const dist = Math.sqrt((sp.x - op.x) ** 2 + (sp.y - op.y) ** 2)
            if (dist < minDist) {
              minDist = dist
              closestPressure = op.pressure
            }
          }
          return { x: sp.x, y: sp.y, pressure: closestPressure }
        })

        // Save simplified path
        pathsRef.current.push({
          points: simplifiedWithPressure,
          mode: mode as DrawMode,
          color: strokeColor,
          width: strokeWidth
        })

        currentPathRef.current = []

        // Notify parent with debouncing handled at parent level
        const data = JSON.stringify(pathsRef.current)
        onUpdate(data)
      }
    }, [mode, strokeColor, strokeWidth, onUpdate])

    const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      // Clean up when pointer is cancelled
      activePointersRef.current.delete(e.pointerId)
      if (isDrawingRef.current) {
        isDrawingRef.current = false
        currentPathRef.current = []
      }
    }, [])

    // Expose methods
    useImperativeHandle(ref, () => {
      console.log('SimpleCanvas ref attached')
      return {
        clear: () => {
          console.log('Clear called on SimpleCanvas')
          pathsRef.current = []
          redrawCanvas()
          onUpdate(JSON.stringify([]))
        },
        exportData: () => {
          return JSON.stringify(pathsRef.current)
        }
      }
    })

    return (
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={handlePointerCancel}
        className={`annotation-canvas ${shouldFadeIn ? 'annotation-fade-in' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          // Use 100% width to fill container, height from element
          width: '100%',
          height: `${height}px`,
          // Always allow pinch-zoom for crisp annotation rendering at any zoom level
          // Multi-touch detection prevents drawing during pinch gestures
          touchAction: 'pan-x pan-y pinch-zoom',
          cursor: mode === 'draw' ? 'crosshair' : mode === 'erase' ? 'pointer' : 'default',
          // Only receive events when in draw/erase mode OR when stylus mode is active
          // This allows text selection in view mode without stylus mode
          pointerEvents: (mode !== 'view' || stylusModeActive) ? 'auto' : 'none'
        }}
      />
    )
  }
)

SimpleCanvas.displayName = 'SimpleCanvas'
