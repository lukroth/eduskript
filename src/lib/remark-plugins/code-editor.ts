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

        metaParts.forEach((part: string) => {
          if (part === 'editor') return // Skip the "editor" keyword itself

          const [key, value] = part.split('=')
          if (key && value) {
            attributes[key] = value.replace(/['"]/g, '') // Remove quotes
          }
        })

        // Convert to element node that rehypeReact can process
        node.type = 'code-editor'
        node.data = {
          hName: 'code-editor',
          hProperties: {
            dataLanguage: attributes.language,
            dataCode: attributes.code,
            ...Object.fromEntries(
              Object.entries(attributes)
                .filter(([k]) => k !== 'language' && k !== 'code')
                .map(([k, v]) => [`data${k.charAt(0).toUpperCase() + k.slice(1)}`, v])
            )
          }
        }
        delete node.lang
        delete node.meta
        delete node.value

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
