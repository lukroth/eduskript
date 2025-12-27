'use client'

import { useEffect, useRef, useMemo } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { MergeView } from '@codemirror/merge'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from 'next-themes'

interface DiffViewerProps {
  original: string
  modified: string
  className?: string
}

export function DiffViewer({ original, modified, className = '' }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<MergeView | null>(null)
  const { resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  // Theme extension memoized to avoid recreation
  const themeExtension = useMemo(() => (isDark ? oneDark : []), [isDark])

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous view
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    // Create merge view
    const view = new MergeView({
      a: {
        doc: original,
        extensions: [
          basicSetup,
          markdown(),
          themeExtension,
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.theme({
            '&': {
              fontSize: '13px',
            },
            '.cm-scroller': {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            },
            '.cm-gutters': {
              backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
              borderRight: isDark ? '1px solid #333' : '1px solid #ddd',
            },
          }),
        ],
      },
      b: {
        doc: modified,
        extensions: [
          basicSetup,
          markdown(),
          themeExtension,
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.theme({
            '&': {
              fontSize: '13px',
            },
            '.cm-scroller': {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            },
            '.cm-gutters': {
              backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
              borderRight: isDark ? '1px solid #333' : '1px solid #ddd',
            },
          }),
        ],
      },
      parent: containerRef.current,
      orientation: 'a-b', // Side by side: original | modified
      revertControls: undefined, // No revert buttons (we have our own accept/reject)
      highlightChanges: true,
      gutter: true,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [original, modified, themeExtension, isDark])

  return (
    <div
      ref={containerRef}
      className={`border rounded-md overflow-hidden ${className}`}
      style={{
        // CSS for merge view styling
      }}
    />
  )
}
