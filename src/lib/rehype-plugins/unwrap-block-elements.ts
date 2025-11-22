import type { Root, Element, ElementContent } from 'hast'
import type { Plugin } from 'unified'
import { visit, SKIP } from 'unist-util-visit'

/**
 * Rehype plugin to unwrap block-level elements from paragraphs.
 *
 * HTML doesn't allow block elements (like <figure>, <div>, <blockquote>)
 * inside <p> tags, but markdown parsers often wrap images and other content
 * in paragraphs. This plugin fixes that by unwrapping block elements.
 */

// Block-level elements that should not be inside paragraphs
const BLOCK_ELEMENTS = new Set([
  'figure',
  'div',
  'blockquote',
  'pre',
  'table',
  'ul',
  'ol',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr',
  'section',
  'article',
  'aside',
  'nav',
  'header',
  'footer',
])

export const rehypeUnwrapBlockElements: Plugin<[], Root> = function () {
  return function (tree: Root) {
    visit(tree, 'element', (node: Element, index, parent) => {
      // Only process paragraph elements
      if (node.tagName !== 'p' || !parent || typeof index !== 'number') {
        return
      }

      // Check if paragraph contains any block-level elements
      const hasBlockElements = node.children.some(
        (child): child is Element =>
          child.type === 'element' && BLOCK_ELEMENTS.has(child.tagName)
      )

      if (!hasBlockElements) {
        return
      }

      // Split paragraph content into groups:
      // - Block elements stand alone
      // - Consecutive inline elements stay in a paragraph
      const groups: ElementContent[][] = []
      let currentInlineGroup: ElementContent[] = []

      for (const child of node.children) {
        if (child.type === 'element' && BLOCK_ELEMENTS.has(child.tagName)) {
          // Save current inline group if any
          if (currentInlineGroup.length > 0) {
            groups.push(currentInlineGroup)
            currentInlineGroup = []
          }
          // Add block element as its own group
          groups.push([child])
        } else {
          // Add to current inline group
          currentInlineGroup.push(child)
        }
      }

      // Save final inline group if any
      if (currentInlineGroup.length > 0) {
        groups.push(currentInlineGroup)
      }

      // Create new elements from groups
      const newElements: Element[] = groups.map(group => {
        // If group is a single block element, return it directly
        if (group.length === 1 && group[0].type === 'element' && BLOCK_ELEMENTS.has(group[0].tagName)) {
          return group[0]
        }
        // Otherwise, wrap inline elements in a paragraph
        return {
          type: 'element',
          tagName: 'p',
          properties: { ...node.properties },
          children: group
        }
      })

      // Replace the original paragraph with the new elements
      parent.children.splice(index, 1, ...newElements)

      // Skip the newly added elements to avoid re-processing
      return [SKIP, index + newElements.length]
    })
  }
}

export default rehypeUnwrapBlockElements
