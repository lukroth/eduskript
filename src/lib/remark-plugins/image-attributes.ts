import { visit } from 'unist-util-visit'
import type { Node } from 'unist'

interface ImageNode extends Node {
  type: 'image'
  url: string
  alt?: string
  title?: string
  data?: {
    hProperties?: Record<string, unknown>
  }
}

interface TextNode extends Node {
  type: 'text'
  value: string
}

/**
 * Remark plugin that parses image attributes like {width=50%}
 * and applies them as inline styles
 */
export function remarkImageAttributes() {
  return function transformer(tree: Node) {
    visit(tree, 'paragraph', (node: any) => {
      if (!node.children) return

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]

        // Look for image followed by text with attributes
        if (child.type === 'image' && i + 1 < node.children.length) {
          const nextChild = node.children[i + 1] as TextNode

          if (nextChild.type === 'text') {
            // Match {width=X%;align=left|center|right} pattern
            const attrMatch = nextChild.value.match(/^\{([^}]+)\}/)

            if (attrMatch) {
              const attrsString = attrMatch[1]
              const attrs = attrsString.split(';').reduce((acc, attr) => {
                const parts = attr.split('=').map(s => s.trim())
                const key = parts[0]
                const value = parts[1]
                // Handle both key=value and bare keys (like 'invert')
                if (key) acc[key] = value ?? ''
                return acc
              }, {} as Record<string, string>)

              // Apply attributes
              child.data = child.data || {}
              child.data.hProperties = child.data.hProperties || {}

              // Width - trust the user's value as-is
              // If they used the UI, it will be a percentage (e.g., "50%")
              // If they manually typed it, respect their choice (e.g., "500px", "20rem", etc.)
              if (attrs.width) {
                child.data.hProperties.style = `width: ${attrs.width}; height: auto;`
              }

              // Alignment
              if (attrs.align) {
                child.data.hProperties['data-align'] = attrs.align
              }

              // Wrap
              if (attrs.wrap) {
                child.data.hProperties['data-wrap'] = attrs.wrap
              }

              // Invert (for dark mode diagrams)
              // Values: 'dark' (default if just 'invert'), 'light', 'always'
              if ('invert' in attrs) {
                // Handle bare 'invert' (no value) as 'dark'
                child.data.hProperties['data-invert'] = attrs.invert || 'dark'
              }

              // Saturate (used with invert to restore colors)
              // Value: percentage like '70' or '150'
              if (attrs.saturate) {
                child.data.hProperties['data-saturate'] = attrs.saturate
              }

              // Remove the attribute text from the markdown
              nextChild.value = nextChild.value.replace(/^\{[^}]+\}/, '').trim()

              // If the text node is now empty, remove it
              if (!nextChild.value) {
                node.children.splice(i + 1, 1)
              }
            }
          }
        }
      }
    })
  }
}
