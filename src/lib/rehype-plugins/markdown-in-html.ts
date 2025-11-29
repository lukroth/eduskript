import { visit } from 'unist-util-visit'
import type { Root, Element, Text } from 'hast'

/**
 * Rehype plugin to process markdown syntax that ended up as text inside HTML elements.
 *
 * This happens when markdown content is inside HTML blocks like:
 * <Tabs.Tab>
 * ![image](path.excalidraw)
 * </Tabs.Tab>
 *
 * The markdown parser treats the whole block as raw HTML, so the image syntax
 * becomes plain text. This plugin finds and converts those patterns.
 */
export function rehypeMarkdownInHtml() {
  return function transformer(tree: Root) {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (parent.type !== 'element') return

      const text = node.value

      // Check for markdown image syntax: ![alt](src) or ![](src)
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
      let match
      const parts: (Text | Element)[] = []
      let lastIndex = 0

      while ((match = imageRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: text.slice(lastIndex, match.index)
          })
        }

        const alt = match[1]
        const src = match[2]

        // Check if this is an Excalidraw file
        const isExcalidraw = src.includes('.excalidraw')

        // Create img element
        const imgElement: Element = {
          type: 'element',
          tagName: 'img',
          properties: {
            src: src,
            alt: alt || (isExcalidraw ? 'Excalidraw diagram' : 'Image'),
          },
          children: []
        }

        // Mark Excalidraw images for later processing
        if (isExcalidraw) {
          imgElement.properties!['data-excalidraw-source'] = src
        }

        parts.push(imgElement)
        lastIndex = match.index + match[0].length
      }

      // If no matches, don't modify
      if (parts.length === 0) return

      // Add remaining text after last match
      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          value: text.slice(lastIndex)
        })
      }

      // Replace the text node with our parts
      const parentElement = parent as Element
      parentElement.children.splice(index, 1, ...parts)

      // Return the new index to continue iteration correctly
      return index + parts.length
    })
  }
}
