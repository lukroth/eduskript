import { visit } from 'unist-util-visit'
import type { Root, RootContent, BlockContent, Paragraph, Text } from 'mdast'

/**
 * Remark plugin to transform Quiz Question/Option components
 *
 * Handles the same problem as Tabs - indented content inside HTML-like tags
 * gets treated as code blocks by the markdown parser.
 */
export function remarkQuiz() {
  return function transformer(tree: Root) {
    // Collect nodes that form Question blocks
    const nodesToProcess: { startIndex: number; endIndex: number; parent: any }[] = []

    // Find Question blocks
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

      // Look for the start of a Question block
      if (text.includes('<Question')) {
        let fullContent = serializeNode(node)
        let endIdx = index

        // Check if this node contains the complete Question block
        if (!fullContent.includes('</Question>')) {
          for (let i = index + 1; i < parent.children.length; i++) {
            const nextNode = parent.children[i]
            fullContent += '\n' + serializeNode(nextNode)
            endIdx = i
            if (fullContent.includes('</Question>')) break
          }
        }

        nodesToProcess.push({
          startIndex: index,
          endIndex: endIdx,
          parent
        })
      }
    })

    // Process collected Question blocks in reverse order
    for (let i = nodesToProcess.length - 1; i >= 0; i--) {
      const { startIndex, endIndex, parent } = nodesToProcess[i]

      // Collect full content
      let fullContent = ''
      for (let j = startIndex; j <= endIndex; j++) {
        const node = parent.children[j]
        fullContent += (fullContent ? '\n' : '') + serializeNode(node)
      }

      // Parse the Question block
      const result = parseQuestionBlock(fullContent)
      if (result) {
        // Create option elements
        const optionElements: RootContent[] = result.options.map(opt => ({
          type: 'html',
          value: `<option${opt.is ? ` is="${opt.is}"` : ''}${opt.feedback ? ` feedback="${escapeAttr(opt.feedback)}"` : ''}>${opt.content}</option>`
        } as RootContent))

        // Create the question wrapper
        const questionHtml: RootContent = {
          type: 'html',
          value: `<question id="${result.id}"${result.type ? ` type="${result.type}"` : ''}>\n${optionElements.map(o => (o as any).value).join('\n')}\n</question>`
        }

        // Replace the nodes
        parent.children.splice(startIndex, endIndex - startIndex + 1, questionHtml)
      }
    }
  }
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;')
}

function serializeNode(node: any): string {
  if (node.type === 'html') {
    return node.value || ''
  }
  if (node.type === 'text') {
    return node.value || ''
  }
  if (node.type === 'paragraph') {
    return node.children?.map(serializeNode).join('') || ''
  }
  if (node.type === 'code') {
    // Code blocks inside Question - return as text
    return node.value || ''
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(serializeNode).join('')
  }
  if ('value' in node) {
    return String(node.value)
  }
  return ''
}

interface ParsedOption {
  is?: string
  feedback?: string
  content: string
}

function parseQuestionBlock(content: string): { id: string; type?: string; options: ParsedOption[] } | null {
  // Extract Question attributes
  const questionMatch = content.match(/<Question\s+([^>]*)>/)
  if (!questionMatch) return null

  const attrString = questionMatch[1]
  const idMatch = attrString.match(/id=["']([^"']+)["']/)
  const typeMatch = attrString.match(/type=["']([^"']+)["']/)

  if (!idMatch) return null

  const id = idMatch[1]
  const type = typeMatch?.[1]

  // Extract options
  const options: ParsedOption[] = []
  const optionRegex = /<Option\s*([^>]*)>([\s\S]*?)<\/Option>/g
  let match

  while ((match = optionRegex.exec(content)) !== null) {
    const optAttrs = match[1]
    const optContent = match[2].trim()

    const isMatch = optAttrs.match(/is=["']([^"']+)["']/)
    const feedbackMatch = optAttrs.match(/feedback=["']([^"']+)["']/)

    options.push({
      is: isMatch?.[1],
      feedback: feedbackMatch?.[1],
      content: optContent
    })
  }

  if (options.length === 0) return null

  return { id, type, options }
}
