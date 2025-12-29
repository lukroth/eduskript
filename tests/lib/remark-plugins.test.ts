import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkCodeEditor from '@/lib/remark-plugins/code-editor'
import { remarkImageResolver } from '@/lib/remark-plugins/image-resolver'
import { remarkExcalidraw } from '@/lib/remark-plugins/excalidraw'

// Helper to extract attribute value from HTML string
function getHtmlAttr(html: string, attr: string): string | undefined {
  const match = html.match(new RegExp(`${attr}="([^"]*)"`, 'i'))
  return match?.[1]
}

describe('Remark Plugins', () => {
  describe('remarkCodeEditor', () => {
    // Note: remarkCodeEditor outputs raw HTML that gets parsed by rehype-raw
    // It transforms ```lang editor``` blocks to <code-editor data-language="..." data-code="..." />

    it('should convert code block with editor meta to code-editor HTML', async () => {
      const markdown = '```python editor\nprint("Hello")\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      // Find the HTML node containing code-editor
      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(htmlNode).toBeDefined()
      expect(htmlNode?.value).toContain('<code-editor')
      expect(getHtmlAttr(htmlNode?.value, 'data-language')).toBe('python')
      expect(getHtmlAttr(htmlNode?.value, 'data-code')).toContain('print')
    })

    it('should escape HTML in code content', async () => {
      const markdown = '```javascript editor\nconst html = "<script>alert(1)</script>"\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))
      const code = getHtmlAttr(htmlNode?.value, 'data-code')

      expect(code).toContain('&lt;script&gt;')
      expect(code).not.toContain('<script>')
    })

    it('should parse additional attributes from meta', async () => {
      const markdown = '```python editor id=my-editor height=400\nprint("test")\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(getHtmlAttr(htmlNode?.value, 'data-id')).toBe('my-editor')
      expect(getHtmlAttr(htmlNode?.value, 'data-height')).toBe('400')
    })

    it('should use language from code block', () => {
      const markdown = '```javascript editor\nconsole.log("test")\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(getHtmlAttr(htmlNode?.value, 'data-language')).toBe('javascript')
    })

    it('should not modify code blocks without editor meta', async () => {
      const markdown = '```python\nprint("Hello")\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      // Should still be a code node
      const codeNode = findNode(tree, (node: any) => node.type === 'code')
      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(codeNode).toBeDefined()
      expect(htmlNode).toBeUndefined()
    })

    it('should handle empty code blocks', async () => {
      const markdown = '```python editor\n\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(htmlNode).toBeDefined()
      expect(getHtmlAttr(htmlNode?.value, 'data-code')).toBe('')
    })

    it('should handle multiple code editors in same document', async () => {
      const markdown = `
\`\`\`python editor
print("first")
\`\`\`

Some text

\`\`\`javascript editor
console.log("second")
\`\`\`
`

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNodes = findAllNodes(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(htmlNodes).toHaveLength(2)
      expect(getHtmlAttr(htmlNodes[0]?.value, 'data-language')).toBe('python')
      expect(getHtmlAttr(htmlNodes[1]?.value, 'data-language')).toBe('javascript')
    })

    it('should remove quotes from attribute values', () => {
      // Note: Current implementation splits by space, so quoted values with spaces don't work correctly
      // Using single-word value to test quote removal
      const markdown = '```python editor id="my-editor" title="TestEditor"\nprint("test")\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))

      expect(getHtmlAttr(htmlNode?.value, 'data-id')).toBe('my-editor')
      expect(getHtmlAttr(htmlNode?.value, 'data-title')).toBe('TestEditor')
    })

    it('should escape all HTML special characters', async () => {
      const markdown = '```javascript editor\nconst test = "A & B < C > D \' E"\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkCodeEditor)

      const tree = processor.parse(markdown)
      processor.runSync(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('code-editor'))
      const code = getHtmlAttr(htmlNode?.value, 'data-code')

      expect(code).toContain('&amp;')
      expect(code).toContain('&lt;')
      expect(code).toContain('&gt;')
      expect(code).toContain('&quot;')
      expect(code).toContain('&#039;')
    })
  })

  describe('remarkImageResolver', () => {
    // Note: remarkImageResolver is now a PURE TRANSFORMER
    // It does NOT resolve file URLs - that happens in the ContentImage component
    // It only adds data-original-src attribute to mark images for resolution

    it('should add data-original-src attribute for relative paths', async () => {
      const markdown = '![test](myimage.jpg)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkImageResolver)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      const img = findNode(tree, (node: any) => node.type === 'image')

      // URL should remain unchanged (component resolves it)
      expect(img?.url).toBe('myimage.jpg')
      // data-original-src should be set for the component to use
      expect(img?.data?.hProperties?.['data-original-src']).toBe('myimage.jpg')
    })

    it('should skip absolute URLs', async () => {
      const markdown = '![test](https://example.com/image.jpg)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkImageResolver)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      const img = findNode(tree, (node: any) => node.type === 'image')

      expect(img?.url).toBe('https://example.com/image.jpg')
      // No data-original-src for absolute URLs
      expect(img?.data?.hProperties?.['data-original-src']).toBeUndefined()
    })

    it('should skip URLs starting with slash', async () => {
      const markdown = '![test](/absolute/path.jpg)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkImageResolver)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      const img = findNode(tree, (node: any) => node.type === 'image')

      expect(img?.url).toBe('/absolute/path.jpg')
      // No data-original-src for absolute paths
      expect(img?.data?.hProperties?.['data-original-src']).toBeUndefined()
    })

    it('should skip excalidraw files', async () => {
      const markdown = '![test](diagram.excalidraw)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkImageResolver)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      const img = findNode(tree, (node: any) => node.type === 'image')

      // Should not be modified (excalidraw handled by remarkExcalidraw)
      expect(img?.url).toBe('diagram.excalidraw')
      expect(img?.data?.hProperties?.['data-original-src']).toBeUndefined()
    })

    it('should skip video files', async () => {
      const markdown = '![test](video.mp4)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkImageResolver)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      const img = findNode(tree, (node: any) => node.type === 'image')

      // Should not be modified (videos handled by remarkMuxVideo)
      expect(img?.url).toBe('video.mp4')
      expect(img?.data?.hProperties?.['data-original-src']).toBeUndefined()
    })
  })

  describe('remarkExcalidraw', () => {
    // Note: remarkExcalidraw outputs raw HTML that gets parsed by rehype-raw
    // It transforms ![](*.excalidraw) to <excalidraw-image src="..." alt="..." />
    // File resolution (light/dark variants) happens in the ExcalidrawImage component

    it('should transform excalidraw files to excalidraw-image HTML', async () => {
      const markdown = '![test](diagram.excalidraw)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkExcalidraw)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      // Should now be raw HTML containing excalidraw-image element
      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('excalidraw-image'))

      expect(htmlNode).toBeDefined()
      expect(htmlNode?.value).toBe('<excalidraw-image src="diagram.excalidraw" alt="test"></excalidraw-image>')
    })

    it('should handle excalidraw.md files', async () => {
      const markdown = '![test](diagram.excalidraw.md)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkExcalidraw)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('excalidraw-image'))

      expect(htmlNode).toBeDefined()
      expect(htmlNode?.value).toBe('<excalidraw-image src="diagram.excalidraw.md" alt="test"></excalidraw-image>')
    })

    it('should skip non-excalidraw files', async () => {
      const markdown = '![test](regular-image.jpg)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkExcalidraw)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      // Should remain as image node
      const img = findNode(tree, (node: any) => node.type === 'image')
      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('excalidraw-image'))

      expect(img?.url).toBe('regular-image.jpg')
      expect(htmlNode).toBeUndefined()
    })

    it('should skip already-resolved URLs', async () => {
      const markdown = '![test](https://example.com/diagram.excalidraw)'

      const processor = unified()
        .use(remarkParse)
        .use(remarkExcalidraw)

      const tree = processor.parse(markdown)
      await processor.run(tree)

      // Should remain as image node (absolute URLs are not transformed)
      const img = findNode(tree, (node: any) => node.type === 'image')
      const htmlNode = findNode(tree, (node: any) => node.type === 'html' && node.value?.includes('excalidraw-image'))

      expect(img?.url).toBe('https://example.com/diagram.excalidraw')
      expect(htmlNode).toBeUndefined()
    })
  })
})

/**
 * Helper function to find a node in the AST
 */
function findNode(tree: any, predicate: (node: any) => boolean): any {
  let found: any = undefined

  function visit(node: any) {
    if (predicate(node)) {
      found = node
      return
    }
    if (node.children) {
      for (const child of node.children) {
        visit(child)
        if (found) return
      }
    }
  }

  visit(tree)
  return found
}

/**
 * Helper function to find all nodes matching predicate
 */
function findAllNodes(tree: any, predicate: (node: any) => boolean): any[] {
  const found: any[] = []

  function visit(node: any) {
    if (predicate(node)) {
      found.push(node)
    }
    if (node.children) {
      for (const child of node.children) {
        visit(child)
      }
    }
  }

  visit(tree)
  return found
}
