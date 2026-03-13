/**
 * SVG Annotation Layer - Resolution-Independent Stroke Rendering
 *
 * Renders committed annotation strokes as SVG <path> elements instead of
 * canvas pixels. SVG paths scale with CSS transform natively, staying crisp
 * at any zoom level without hitting canvas pixel area limits (16M on iOS).
 *
 * @see svg-path.ts - SVG path conversion utilities
 * @see annotation-layer.tsx - Parent component managing layers
 * @see simple-canvas.tsx - Viewport canvas for active drawing
 */

'use client'

import { memo, useMemo } from 'react'
import { getStroke } from 'perfect-freehand'
import { getSvgPathFromStroke, getStrokeOptions } from '@/lib/annotations/svg-path'
import type { AnimatedStroke } from '@/hooks/use-stroke-animation'

interface AnnotationSvgLayerProps {
  strokes: AnimatedStroke[]
  width: number            // paper width (viewBox)
  height: number           // paper height (viewBox)
  markedForDeletion?: Set<string>  // stroke IDs at 0.3 opacity (eraser preview)
  className?: string
}

/**
 * Render strokes as SVG paths. Each draw-mode stroke becomes a filled <path>.
 * Memoized to avoid re-rendering when parent state changes unrelated to strokes.
 */
export const AnnotationSvgLayer = memo(function AnnotationSvgLayer({
  strokes,
  width,
  height,
  markedForDeletion,
  className = '',
}: AnnotationSvgLayerProps) {
  // Pre-compute SVG path data for each stroke
  const pathData = useMemo(() => {
    return strokes
      .filter(s => s.mode !== 'erase' && s.points.length >= 2)
      .map(stroke => {
        const inputPoints = stroke.points.map(p => [p.x, p.y, p.pressure])
        const outline = getStroke(inputPoints, getStrokeOptions(stroke.width))
        const d = getSvgPathFromStroke(outline)
        return { id: stroke.id, d, color: stroke.color }
      })
  }, [strokes])

  if (pathData.length === 0) return null

  return (
    <svg
      className={`annotation-svg ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: `${height}px`,
        pointerEvents: 'none',
      }}
    >
      {pathData.map(({ id, d, color }) => (
        <path
          key={id}
          d={d}
          fill={color}
          opacity={markedForDeletion?.has(id) ? 0.3 : 1}
        />
      ))}
    </svg>
  )
})
