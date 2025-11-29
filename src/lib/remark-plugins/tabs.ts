import { visit } from 'unist-util-visit'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Root, Paragraph, Text, RootContent, BlockContent, Node, PhrasingContent } from 'mdast'

/**
 * Serialize an MDAST node back to markdown string
 * Custom implementation that preserves HTML tags (unlike mdast-util-to-markdown which escapes them)
 */
function serializeNode(node: Node): string {
  switch (node.type) {
    case 'html':
      return (node as any).value || ''
    case 'text':
      return (node as Text).value
    case 'paragraph':
      return serializeChildren((node as Paragraph).children)
    case 'strong':
      return `**${serializeChildren((node as any).children)}**`
    case 'emphasis':
      return `*${serializeChildren((node as any).children)}*`
    case 'inlineCode':
      return `\`${(node as any).value}\``
    case 'image':
      const img = node as any
      return `![${img.alt || ''}](${img.url})`
    case 'link':
      const link = node as any
      return `[${serializeChildren(link.children)}](${link.url})`
    case 'list':
      const list = node as any
      return list.children.map((item: any, i: number) => {
        const prefix = list.ordered ? `${i + 1}) ` : '- '
        return prefix + serializeChildren(item.children)
      }).join('\n')
    case 'listItem':
      return serializeChildren((node as any).children)
    case 'heading':
      const h = node as any
      return '#'.repeat(h.depth) + ' ' + serializeChildren(h.children)
    case 'blockquote':
      return '> ' + serializeChildren((node as any).children)
    case 'code':
      const code = node as any
      return '```' + (code.lang || '') + '\n' + code.value + '\n```'
    default:
      // For other node types, try to extract children or value
      if ('children' in node && Array.isArray((node as any).children)) {
        return serializeChildren((node as any).children)
      }
      if ('value' in node) {
        return String((node as any).value)
      }
      return ''
  }
}

function serializeChildren(children: (PhrasingContent | BlockContent)[]): string {
  return children.map(child => serializeNode(child as Node)).join('')
}

/**
 * Remark plugin to transform Nextra-style Tabs components into custom elements
 *
 * Transforms:
 * ```
 * import { Tabs } from 'nextra/components'
 *
 * <Tabs items={['Tab 1', 'Tab 2']}>
 *   <Tabs.Tab>Content 1</Tabs.Tab>
 *   <Tabs.Tab>Content 2</Tabs.Tab>
 * </Tabs>
 * ```
 *
 * Uses MDAST container nodes with data.hName to ensure tab content goes through
 * the full plugin pipeline (images, callouts, etc.) while creating proper HTML elements.
 */
export function remarkTabs() {
  return function transformer(tree: Root) {
    // First pass: remove import statements
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined) return

      const paragraph = node as Paragraph
      if (paragraph.children.length === 1 && paragraph.children[0].type === 'text') {
        const text = (paragraph.children[0] as Text).value
        if (text.trim().startsWith('import ') && text.includes('nextra')) {
          parent.children.splice(index, 1)
          return index
        }
      }
    })

    // Collect all nodes to build complete content
    const nodesToProcess: { startIndex: number; endIndex: number; parent: any }[] = []

    // Find Tabs blocks and collect their ranges
    visit(tree, (node: any, index, parent) => {
      if (node.type !== 'html' && node.type !== 'paragraph') return
      if (!parent || index === undefined) return

      let text = ''
      if (node.type === 'html') {
        text = node.value
      } else if (node.type === 'paragraph') {
        for (const child of node.children) {
          if (child.type === 'text') {
            text += (child as Text).value
          }
        }
      }

      // Look for the start of a Tabs block
      if (text.includes('<Tabs') && text.includes('items=')) {
        let fullContent = serializeNode(node)
        let endIdx = index

        // Check if this node contains the complete Tabs block
        if (!fullContent.includes('</Tabs>')) {
          for (let i = index + 1; i < parent.children.length; i++) {
            const nextNode = parent.children[i]
            fullContent += '\n' + serializeNode(nextNode)
            endIdx = i
            if (fullContent.includes('</Tabs>')) break
          }
        }

        nodesToProcess.push({
          startIndex: index,
          endIndex: endIdx,
          parent
        })
      }
    })

    // Process collected Tabs blocks in reverse order
    for (let i = nodesToProcess.length - 1; i >= 0; i--) {
      const { startIndex, endIndex, parent } = nodesToProcess[i]

      // Collect full content by serializing all nodes back to markdown
      let fullContent = ''
      for (let j = startIndex; j <= endIndex; j++) {
        const node = parent.children[j]
        fullContent += (fullContent ? '\n' : '') + serializeNode(node)
      }
      // Parse the Tabs block
      const result = parseTabsBlock(fullContent)
      if (result) {
        // Create tab-item wrappers for each tab
        // Using blockquote with data.hName to create proper container elements
        // that remarkRehype will convert to the correct HTML elements
        const tabItems: RootContent[] = []

        for (let idx = 0; idx < result.contents.length; idx++) {
          const tabContent = result.contents[idx]

          try {
            // Parse markdown to mdast
            const mdast = fromMarkdown(tabContent)

            // Create a tab-item wrapper using blockquote with hName override
            // This allows the content to go through all plugins while creating
            // a proper <tab-item> element in the final HTML
            const tabItem: RootContent = {
              type: 'blockquote',
              data: {
                hName: 'tab-item'
              },
              children: mdast.children as BlockContent[]
            }
            tabItems.push(tabItem)
          } catch (e) {
            console.error(`[remarkTabs] Tab ${idx} parse error:`, e)
            // Fallback: add as paragraph inside tab-item
            const tabItem: RootContent = {
              type: 'blockquote',
              data: {
                hName: 'tab-item'
              },
              children: [{
                type: 'paragraph',
                children: [{ type: 'text', value: tabContent }]
              }]
            }
            tabItems.push(tabItem)
          }
        }

        // Create the tabs-container wrapper
        // Using blockquote with hName and hProperties for the data-items attribute
        const tabsContainer: RootContent = {
          type: 'blockquote',
          data: {
            hName: 'tabs-container',
            hProperties: {
              'data-items': JSON.stringify(result.items)
            }
          },
          children: tabItems as BlockContent[]
        }

        // Replace the nodes with the single tabs-container
        parent.children.splice(startIndex, endIndex - startIndex + 1, tabsContainer)
      }
    }
  }
}

/**
 * Parse a Tabs block and extract items and contents
 */
function parseTabsBlock(content: string): { items: string[]; contents: string[] } | null {
  // Extract items array
  const itemsMatch = content.match(/<Tabs\s+items=\{?\[([^\]]+)\]\}?\s*>/)
  if (!itemsMatch) return null

  const itemsStr = itemsMatch[1]
  const items = itemsStr
    .split(',')
    .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(s => s.length > 0)

  // Extract content for each tab
  const contents: string[] = []

  // Find all <Tabs.Tab>...</Tabs.Tab> pairs
  const tabRegex = /<Tabs\.Tab>([\s\S]*?)<\/Tabs\.Tab>/g
  let match
  while ((match = tabRegex.exec(content)) !== null) {
    const tabContent = match[1].trim()
    contents.push(tabContent)
  }

  if (contents.length === 0) return null

  return { items, contents }
}
