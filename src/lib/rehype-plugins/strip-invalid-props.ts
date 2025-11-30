import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'

/**
 * HTML attributes that need to be camelCase in React but are often written
 * in lowercase in raw HTML. We strip these to avoid React warnings.
 * Users should use proper React/JSX syntax instead.
 */
const INVALID_HTML_ATTRIBUTES = new Set([
  'frameborder',
  'allowfullscreen',
  'allowtransparency',
  'cellpadding',
  'cellspacing',
  'colspan',
  'rowspan',
  'for', // Should be htmlFor
  'tabindex',
  'readonly',
  'maxlength',
  'minlength',
  'autocomplete',
  'autofocus',
  'autoplay',
  'contenteditable',
  'crossorigin',
  'datetime',
  'enctype',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
  'hreflang',
  'inputmode',
  'novalidate',
  'spellcheck',
  'srcdoc',
  'srcset',
  'usemap',
])

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute'
  name: string
  value: string | { type: 'mdxJsxAttributeValueExpression'; value: string } | null
}

interface MdxJsxElement {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name: string | null
  attributes: MdxJsxAttribute[]
  children: unknown[]
}

/**
 * Rehype plugin that strips invalid HTML attributes to prevent React warnings.
 *
 * This handles cases where users write raw HTML in MDX with HTML-style attributes
 * instead of React-style (e.g., `frameborder` instead of `frameBorder`).
 *
 * Rather than silently converting, we strip them so users learn to write proper JSX.
 */
export function rehypeStripInvalidProps() {
  return function transformer(tree: Root) {
    // Handle standard HAST elements
    visit(tree, 'element', (node: Element) => {
      if (!node.properties) return

      const propsToDelete: string[] = []

      for (const [key, value] of Object.entries(node.properties)) {
        // Strip known invalid HTML attributes
        if (INVALID_HTML_ATTRIBUTES.has(key.toLowerCase())) {
          propsToDelete.push(key)
          continue
        }

        // Strip style if it's a string (should be an object in React)
        if (key === 'style' && typeof value === 'string') {
          propsToDelete.push(key)
          continue
        }
      }

      for (const prop of propsToDelete) {
        delete node.properties[prop]
      }
    })

    // Handle MDX JSX elements (raw HTML in MDX is parsed as these)
    visit(tree, 'mdxJsxFlowElement', (node: unknown) => {
      const jsxNode = node as MdxJsxElement
      if (!jsxNode.attributes) return

      jsxNode.attributes = jsxNode.attributes.filter((attr) => {
        if (attr.type !== 'mdxJsxAttribute') return true

        // Strip known invalid HTML attributes
        if (INVALID_HTML_ATTRIBUTES.has(attr.name.toLowerCase())) {
          return false
        }

        // Strip style if it's a string value
        if (attr.name === 'style' && typeof attr.value === 'string') {
          return false
        }

        return true
      })
    })

    visit(tree, 'mdxJsxTextElement', (node: unknown) => {
      const jsxNode = node as MdxJsxElement
      if (!jsxNode.attributes) return

      jsxNode.attributes = jsxNode.attributes.filter((attr) => {
        if (attr.type !== 'mdxJsxAttribute') return true

        // Strip known invalid HTML attributes
        if (INVALID_HTML_ATTRIBUTES.has(attr.name.toLowerCase())) {
          return false
        }

        // Strip style if it's a string value
        if (attr.name === 'style' && typeof attr.value === 'string') {
          return false
        }

        return true
      })
    })
  }
}
