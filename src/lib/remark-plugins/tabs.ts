import { visit } from 'unist-util-visit'
import type { Root, RootContent, BlockContent } from 'mdast'

/**
 * MDX JSX Element node type (from mdast-util-mdx-jsx)
 */
interface MdxJsxAttribute {
  type: 'mdxJsxAttribute'
  name: string
  value: string | { type: 'mdxJsxAttributeValueExpression'; value: string } | null
}

interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement'
  name: string | null
  attributes: MdxJsxAttribute[]
  children: (MdxJsxFlowElement | BlockContent)[]
}

/**
 * Remark plugin to transform Nextra-style Tabs components into custom elements
 *
 * MDX parses JSX like <Tabs items={[...]}> into mdxJsxFlowElement nodes.
 * This plugin transforms them into standard HTML elements that can be
 * rendered by our component factory.
 *
 * Input:
 * ```
 * <Tabs items={['Tab 1', 'Tab 2']}>
 *   <Tabs.Tab>Content 1</Tabs.Tab>
 *   <Tabs.Tab>Content 2</Tabs.Tab>
 * </Tabs>
 * ```
 *
 * Output:
 * ```
 * <tabs-container data-items='["Tab 1","Tab 2"]'>
 *   <tab-item>Content 1</tab-item>
 *   <tab-item>Content 2</tab-item>
 * </tabs-container>
 * ```
 */
export function remarkTabs() {
  return function transformer(tree: Root) {
    // Also handle import statements removal
    visit(tree, 'mdxjsEsm', (node: any, index, parent) => {
      if (!parent || index === undefined) return
      // Remove nextra import statements
      if (node.value?.includes('nextra')) {
        parent.children.splice(index, 1)
        return index
      }
    })

    // Transform MDX JSX Tabs elements
    visit(tree, 'mdxJsxFlowElement', (node: any, index, parent) => {
      if (!parent || index === undefined) return
      if (node.name !== 'Tabs') return

      const jsxNode = node as MdxJsxFlowElement

      // Extract items from attributes
      const itemsAttr = jsxNode.attributes.find(
        (attr): attr is MdxJsxAttribute =>
          attr.type === 'mdxJsxAttribute' && attr.name === 'items'
      )

      let items: string[] = []
      if (itemsAttr?.value) {
        // Value can be a string or an expression object
        const valueStr = typeof itemsAttr.value === 'string'
          ? itemsAttr.value
          : itemsAttr.value?.value || ''

        // Parse the array expression: ['Tab 1', 'Tab 2']
        const arrayMatch = valueStr.match(/\[([^\]]+)\]/)
        if (arrayMatch) {
          items = arrayMatch[1]
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(s => s.length > 0)
        }
      }

      if (items.length === 0) {
        console.warn('[remarkTabs] No items found in Tabs component')
        return
      }

      // Extract Tabs.Tab children
      const tabItems: RootContent[] = []

      for (const child of jsxNode.children) {
        // Skip text nodes (whitespace)
        if (child.type === 'mdxJsxFlowElement' && child.name === 'Tabs.Tab') {
          const tabChild = child as MdxJsxFlowElement

          // Create a tab-item wrapper with the tab content
          // Use blockquote with hName to create proper HTML element
          const tabItem: RootContent = {
            type: 'blockquote',
            data: {
              hName: 'tab-item'
            },
            // Pass through all children of Tabs.Tab
            children: tabChild.children as BlockContent[]
          }
          tabItems.push(tabItem)
        }
      }

      if (tabItems.length === 0) {
        console.warn('[remarkTabs] No Tabs.Tab children found')
        return
      }

      // Create the tabs-container wrapper
      const tabsContainer: RootContent = {
        type: 'blockquote',
        data: {
          hName: 'tabs-container',
          hProperties: {
            'data-items': JSON.stringify(items)
          }
        },
        children: tabItems as BlockContent[]
      }

      // Replace the MDX JSX node with the transformed container
      parent.children.splice(index, 1, tabsContainer)

      // Return the index to revisit this position (in case of nested tabs)
      return index
    })
  }
}
