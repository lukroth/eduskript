'use client'

import { useEffect, useRef, useCallback } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { unifiedMergeView, acceptChunk, rejectChunk, getChunks } from '@codemirror/merge'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { CheckCheck, XCircle } from 'lucide-react'

interface MergeEditorProps {
  original: string
  proposed: string
  onChange: (content: string) => void
  className?: string
}

export function MergeEditor({ original, proposed, onChange, className = '' }: MergeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Store onChange in a ref to avoid recreating the editor when it changes
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const { resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  // Accept all remaining chunks
  const handleAcceptAll = useCallback(() => {
    if (!viewRef.current) return
    const view = viewRef.current

    // Keep accepting chunks until none remain
    // Use fromB (position in editor doc), not fromA (position in original)
    let safety = 100
    while (safety-- > 0) {
      const chunks = getChunks(view.state)
      if (!chunks || chunks.chunks.length === 0) break
      acceptChunk(view, chunks.chunks[0].fromB)
    }

    onChangeRef.current(view.state.doc.toString())
  }, [])

  // Reject all remaining chunks
  const handleRejectAll = useCallback(() => {
    if (!viewRef.current) return
    const view = viewRef.current

    // Keep rejecting chunks until none remain
    let safety = 100
    while (safety-- > 0) {
      const chunks = getChunks(view.state)
      if (!chunks || chunks.chunks.length === 0) break
      rejectChunk(view, chunks.chunks[0].fromB)
    }

    onChangeRef.current(view.state.doc.toString())
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous view
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    // Create unified merge view
    // doc = proposed (AI's changes), original = current page content
    // This way: Accept = keep AI change, Reject = revert to original
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: proposed,
        extensions: [
          basicSetup,
          markdown(),
          isDark ? oneDark : [],
          EditorView.theme({
            '&': {
              fontSize: '13px',
              height: '100%',
            },
            '.cm-scroller': {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              overflow: 'auto',
            },
            '.cm-content': {
              minHeight: '200px',
            },
            '.cm-gutters': {
              backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
              borderRight: isDark ? '1px solid #333' : '1px solid #ddd',
            },
          }),
          unifiedMergeView({
            original: original,
            mergeControls: true,
            highlightChanges: true,
            gutter: true,
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      }),
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [original, proposed, isDark])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAcceptAll}
          className="h-7 text-xs gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Accept All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRejectAll}
          className="h-7 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject All
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Click chunks to accept/reject individual changes
        </span>
      </div>

      {/* Editor */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden border-0"
      />
    </div>
  )
}

/**
 * Simple editor for new pages (no merge controls needed)
 */
interface SimpleEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
}

export function SimpleEditor({ content, onChange, className = '' }: SimpleEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const { resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    if (!containerRef.current) return

    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          markdown(),
          isDark ? oneDark : [],
          EditorView.theme({
            '&': {
              fontSize: '13px',
              height: '100%',
            },
            '.cm-scroller': {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              overflow: 'auto',
            },
            '.cm-content': {
              minHeight: '200px',
            },
            '.cm-gutters': {
              backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
              borderRight: isDark ? '1px solid #333' : '1px solid #ddd',
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      }),
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [content, isDark])

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-green-50 dark:bg-green-900/20">
        <span className="text-xs text-green-700 dark:text-green-300 font-medium">
          New page - edit content below
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
      />
    </div>
  )
}
