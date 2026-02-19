import { visit } from 'unist-util-visit'
import type { Node } from 'unist'

/**
 * Remark plugin to convert code blocks with "editor" meta into interactive code editors
 *
 * Usage in markdown:
 * ```python editor
 * print("Hello, World!")
 * ```
 *
 * ```javascript editor
 * console.log("Hello, World!")
 * ```
 *
 * ```python editor single
 * # Single-file mode: hides file tabs for simple examples
 * print("Hello!")
 * ```
 */
export function remarkCodeEditor() {
  return (tree: Node) => {
    visit(tree, 'code', (node: any) => {

      // Check if the meta field contains "editor"
      if (node.meta && node.meta.includes('editor')) {

        const language = node.lang || 'python' // Default to python if no language specified

        // Parse additional attributes from the meta string (e.g., "editor id=my-editor")
        const attributes: Record<string, string> = {
          language: language,
          code: escapeHtml(node.value || '')
        }

        const metaParts = node.meta.split(' ')

        // Re-join to handle quoted values containing spaces (e.g. solution="SELECT a, b")
        const metaString = node.meta

        metaParts.forEach((part: string) => {
          if (part === 'editor') return // Skip the "editor" keyword itself

          // Handle boolean flags (e.g., "single")
          if (part === 'single') {
            attributes['single'] = 'true'
            return
          }

          const eqIdx = part.indexOf('=')
          if (eqIdx !== -1) {
            const key = part.slice(0, eqIdx)
            const rawVal = part.slice(eqIdx + 1).replace(/^["']|["']$/g, '') // Remove surrounding quotes
            attributes[key] = rawVal
          }
        })

        // solution may contain spaces — re-parse it from the raw meta string
        // Escape HTML entities so the value is safe in a data-* attribute
        const solutionMatch = metaString.match(/solution="([^"]*)"/)
        if (solutionMatch) {
          attributes['solution'] = escapeHtml(solutionMatch[1])
        }

        // Build attributes string for the custom element
        const attrPairs = [
          `data-language="${attributes.language}"`,
          `data-code="${attributes.code}"`,
          ...Object.entries(attributes)
            .filter(([k]) => k !== 'language' && k !== 'code')
            .map(([k, v]) => `data-${k}="${v}"`)
        ]

        // Convert to raw HTML node so it gets parsed by rehype-raw
        // This avoids the <pre> wrapper that remarkRehype adds to code nodes
        node.type = 'html'
        node.value = `<code-editor ${attrPairs.join(' ')}></code-editor>`
        delete node.lang
        delete node.meta

      }
    })
  }
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

export default remarkCodeEditor
