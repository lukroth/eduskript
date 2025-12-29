import { visit } from 'unist-util-visit'
import type { Root, Element, Text, ElementContent } from 'hast'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import type { Root as MdastRoot } from 'mdast'
import { remarkPlugins } from '../markdown-plugins'

/**
 * Elements that should have their text content parsed as markdown
 */
const MARKDOWN_CHILDREN_ELEMENTS = ['stickme']

/**
 * Rehype plugin to process markdown content inside specific custom elements.
 *
 * When users write:
 *   <stickme>
 *   ![](image.excalidraw)
 *   </stickme>
 *
 * The content inside is raw text after rehype-raw. This plugin re-parses
 * that text as markdown and replaces the text node with the parsed HAST.
 */
export function rehypeMarkdownChildren() {
  // Create a processor for parsing markdown to HAST
  // Include our remark plugins so images, excalidraw, etc. work
  const processor = unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)

  return async (tree: Root) => {
    const promises: Promise<void>[] = []

    visit(tree, 'element', (node: Element) => {
      const tagName = node.tagName.toLowerCase()

      if (!MARKDOWN_CHILDREN_ELEMENTS.includes(tagName)) return

      // Find text children that look like markdown
      const textChildren = node.children.filter(
        (child): child is Text => child.type === 'text'
      )

      if (textChildren.length === 0) return

      // Combine all text content
      const textContent = textChildren
        .map(child => child.value)
        .join('')
        .trim()

      if (!textContent) return

      // Check if it looks like markdown (has markdown syntax)
      const hasMarkdownSyntax = /!\[|^\s*[-*+]|\[.*\]\(|^#+\s|```|^\s*>/m.test(textContent)

      if (!hasMarkdownSyntax) return

      // Parse the text content as markdown
      const promise = processor.run(processor.parse(textContent) as MdastRoot).then((hast: Root) => {
        // Replace the text children with the parsed HAST children
        const hastRoot = hast as Root
        if (hastRoot.children && hastRoot.children.length > 0) {
          // Remove old text children and add new parsed children
          node.children = node.children.filter(child => child.type !== 'text')
          node.children.push(...(hastRoot.children as ElementContent[]))
        }
      })

      promises.push(promise)
    })

    await Promise.all(promises)
  }
}
