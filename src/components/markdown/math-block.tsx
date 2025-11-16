'use client'

import { InlineMath, BlockMath } from 'react-katex'
import 'react-katex'

interface MathBlockProps {
  inline?: boolean
  children: string
}

export function MathBlock({ inline = false, children }: MathBlockProps) {
  // Validate KaTeX input before rendering
   
  const renderMath = () => {
    try {
      if (inline) {
        return <InlineMath math={children} />
      }
      return (
        <div className="my-4 overflow-x-auto">
          <BlockMath math={children} />
        </div>
      )
    } catch {
      // Fallback for invalid math
      return (
        <span className="text-destructive font-mono text-sm">
          [Math Error: {children}]
        </span>
      )
    }
  }

  return renderMath()
}
