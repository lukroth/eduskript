'use client'

import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTheme } from 'next-themes'

async function getMermaid() {
  const { default: mermaid } = await import('mermaid')
  return mermaid
}

interface MermaidDiagramProps {
  'data-definition'?: string
  children?: ReactNode
}

export function MermaidDiagram(props: MermaidDiagramProps) {
  const definition = props['data-definition'] || ''
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!definition) return

    let cancelled = false

    async function render() {
      try {
        const mermaid = await getMermaid()

        // Re-initialize on every render to pick up theme changes
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
        })

        // Unique id per render to avoid collisions
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const { svg: rendered } = await mermaid.render(id, definition)

        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Mermaid render error:', err)
          setError(String(err))
          setSvg(null)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [definition, resolvedTheme])

  if (error) {
    return (
      <div className="my-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
        <p className="font-medium text-destructive">Mermaid diagram error</p>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{definition}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center rounded-md border bg-muted/30 p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="not-prose my-4 flex justify-center overflow-x-auto text-sm [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
