'use client'

import { Pen, Eraser, Trash2, Eye, EyeOff } from 'lucide-react'

export type AnnotationMode = 'view' | 'draw' | 'erase'

interface AnnotationToolbarProps {
  mode: AnnotationMode
  onModeChange: (mode: AnnotationMode) => void
  onClear: () => void
  hasAnnotations: boolean
}

export function AnnotationToolbar({ mode, onModeChange, onClear, hasAnnotations }: AnnotationToolbarProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg p-2 flex flex-col gap-1">
      {/* Pen Tool */}
      <button
        onClick={() => onModeChange(mode === 'draw' ? 'view' : 'draw')}
        className={`p-3 rounded-md transition-colors ${
          mode === 'draw'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
        title="Draw (Pen)"
        aria-label="Toggle pen mode"
      >
        <Pen className="w-5 h-5" />
      </button>

      {/* Eraser Tool */}
      <button
        onClick={() => onModeChange(mode === 'erase' ? 'view' : 'erase')}
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

      {/* View/Hide Annotations */}
      <button
        onClick={() => onModeChange('view')}
        className={`p-3 rounded-md transition-colors ${
          mode === 'view'
            ? 'text-foreground bg-accent'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
        title={mode === 'view' ? 'Viewing' : 'Exit annotation mode'}
        aria-label="Toggle view mode"
      >
        {mode === 'view' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
      </button>

      {/* Divider */}
      {hasAnnotations && <div className="h-px bg-border my-1" />}

      {/* Clear All */}
      {hasAnnotations && (
        <button
          onClick={() => {
            if (confirm('Clear all annotations on this page?')) {
              onClear()
            }
          }}
          className="p-3 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Clear all annotations"
          aria-label="Clear all annotations"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      {/* Mode indicator */}
      {mode !== 'view' && (
        <div className="absolute -top-10 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap">
          {mode === 'draw' ? 'Drawing mode' : 'Eraser mode'}
        </div>
      )}
    </div>
  )
}
