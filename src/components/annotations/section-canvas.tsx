'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas'
import type { AnnotationMode } from './annotation-toolbar'

interface SectionCanvasProps {
  sectionId: string
  mode: AnnotationMode
  initialData?: string // JSON stringified canvas data
  onUpdate: (sectionId: string, canvasData: string) => void
  height: number
  strokeWidth?: number
  strokeColor?: string
  eraserWidth?: number
}

export interface SectionCanvasHandle {
  clear: () => Promise<void>
  exportPaths: () => Promise<string>
  loadPaths: (data: string) => Promise<void>
}

export const SectionCanvas = forwardRef<SectionCanvasHandle, SectionCanvasProps>(
  ({ sectionId, mode, initialData, onUpdate, height, strokeWidth = 2, strokeColor = '#000000', eraserWidth = 10 }, ref) => {
    const canvasRef = useRef<ReactSketchCanvasRef>(null)

    // Load initial data when component mounts
    useEffect(() => {
      if (initialData && canvasRef.current) {
        try {
          const paths = JSON.parse(initialData)
          canvasRef.current.loadPaths(paths)
        } catch (error) {
          console.error('Error loading initial canvas data:', error)
        }
      }
    }, [initialData])

    // Handle canvas updates (auto-save)
    const handleUpdate = async () => {
      if (!canvasRef.current) return

      try {
        const paths = await canvasRef.current.exportPaths()
        const pathsString = JSON.stringify(paths)

        // Only save if there's actual content
        if (paths && paths.length > 0) {
          onUpdate(sectionId, pathsString)
        }
      } catch (error) {
        console.error('Error exporting canvas paths:', error)
      }
    }

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      clear: async () => {
        await canvasRef.current?.clearCanvas()
        onUpdate(sectionId, JSON.stringify([]))
      },
      exportPaths: async () => {
        if (!canvasRef.current) return JSON.stringify([])
        const paths = await canvasRef.current.exportPaths()
        return JSON.stringify(paths)
      },
      loadPaths: async (data: string) => {
        const paths = JSON.parse(data)
        await canvasRef.current?.loadPaths(paths)
      }
    }))

    // Calculate pointer-events based on mode
    const pointerEvents = mode === 'view' ? 'none' : 'auto'

    return (
      <div
        className="absolute inset-0"
        style={{
          pointerEvents,
          zIndex: mode === 'view' ? 0 : 10
        }}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height={`${height}px`}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          canvasColor="transparent"
          exportWithBackgroundImage={false}
          onChange={handleUpdate}
          withTimestamp={false}
          eraserWidth={eraserWidth}
          allowOnlyPointerType="all"
          style={{
            border: 'none',
            borderRadius: 0,
            cursor: mode === 'draw' ? 'crosshair' : mode === 'erase' ? 'pointer' : 'default'
          }}
        />
      </div>
    )
  }
)

SectionCanvas.displayName = 'SectionCanvas'
