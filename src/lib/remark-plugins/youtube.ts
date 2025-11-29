import { visit } from 'unist-util-visit'
import type { Root, Html, Paragraph, Text } from 'mdast'

/**
 * Remark plugin to transform <Youtube> components into custom elements
 *
 * Transforms:
 * ```
 * import { Youtube } from '@components/Youtube'
 *
 * <Youtube id="dQw4w9WgXcQ" />
 * <Youtube id="dQw4w9WgXcQ" startTime={120} />
 * <Youtube playlist="PLxyz..." />
 * ```
 *
 * Into custom HTML elements that can be rendered by React components
 */
export function remarkYoutube() {
  return function transformer(tree: Root) {
    // First pass: remove import statements for Youtube
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined) return

      const paragraph = node as Paragraph
      if (paragraph.children.length === 1 && paragraph.children[0].type === 'text') {
        const text = (paragraph.children[0] as Text).value
        if (text.trim().startsWith('import ') && text.includes('Youtube')) {
          parent.children.splice(index, 1)
          return index
        }
      }
    })

    // Process HTML nodes
    visit(tree, 'html', (node: Html) => {
      const html = node.value

      // Match <Youtube ... /> or <Youtube ...>
      if (html.includes('<Youtube')) {
        let transformed = html

        // Transform self-closing <Youtube id="..." /> or <Youtube id="..." startTime={...} />
        transformed = transformed.replace(
          /<Youtube\s+([^>]*?)\/>/g,
          (match, attrs) => {
            return parseYoutubeAttrs(attrs)
          }
        )

        // Transform opening <Youtube ...> (rare, but handle it)
        transformed = transformed.replace(
          /<Youtube\s+([^>]*?)>/g,
          (match, attrs) => {
            return parseYoutubeAttrs(attrs)
          }
        )

        // Transform closing </Youtube>
        transformed = transformed.replace(/<\/Youtube>/g, '')

        node.value = transformed
      }
    })

    // Also check paragraphs that might contain the JSX-like syntax as text
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined) return

      const paragraph = node as Paragraph

      let fullText = ''
      for (const child of paragraph.children) {
        if (child.type === 'text') {
          fullText += (child as Text).value
        }
      }

      if (fullText.includes('<Youtube')) {
        let transformed = fullText

        // Transform self-closing
        transformed = transformed.replace(
          /<Youtube\s+([^>]*?)\/>/g,
          (match, attrs) => {
            return parseYoutubeAttrs(attrs)
          }
        )

        // Transform opening
        transformed = transformed.replace(
          /<Youtube\s+([^>]*?)>/g,
          (match, attrs) => {
            return parseYoutubeAttrs(attrs)
          }
        )

        // Transform closing
        transformed = transformed.replace(/<\/Youtube>/g, '')

        if (transformed !== fullText) {
          const htmlNode: Html = {
            type: 'html',
            value: transformed
          }
          parent.children[index] = htmlNode
        }
      }
    })
  }
}

function parseYoutubeAttrs(attrs: string): string {
  // Extract id attribute: id="..." or id='...'
  const idMatch = attrs.match(/id=["']([^"']+)["']/)
  const id = idMatch ? idMatch[1] : ''

  // Extract playlist attribute
  const playlistMatch = attrs.match(/playlist=["']([^"']+)["']/)
  const playlist = playlistMatch ? playlistMatch[1] : ''

  // Extract startTime attribute: startTime={123} or startTime="123"
  const startTimeMatch = attrs.match(/startTime=\{?["']?(\d+)["']?\}?/)
  const startTime = startTimeMatch ? startTimeMatch[1] : ''

  // Build the custom element
  let element = '<youtube-embed'
  if (id) element += ` data-id="${id}"`
  if (playlist) element += ` data-playlist="${playlist}"`
  if (startTime) element += ` data-start-time="${startTime}"`
  element += '></youtube-embed>'

  return element
}
