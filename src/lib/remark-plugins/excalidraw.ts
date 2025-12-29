import { visit } from 'unist-util-visit'

/**
 * Remark plugin to transform Excalidraw file references into custom elements.
 *
 * This is a PURE TRANSFORMER - it does NOT resolve file URLs.
 * File resolution happens in the ExcalidrawImage component using SkriptFiles.
 *
 * Transforms:
 * - `![](drawing.excalidraw)` → `<excalidraw-image src="drawing.excalidraw" />`
 * - `![](drawing.excalidraw.md)` → `<excalidraw-image src="drawing.excalidraw.md" />`
 *
 * The ExcalidrawImage component will:
 * 1. Receive the raw filename via `src` prop
 * 2. Use SkriptFiles.resolveExcalidraw() to get light/dark SVG URLs
 * 3. Render theme-aware images
 */
export function remarkExcalidraw() {
  return function transformer(tree: unknown) {
    visit(tree as Parameters<typeof visit>[0], 'image', (node: any) => {
      if (!node.url || typeof node.url !== 'string') return

      const url = node.url

      // Skip already-resolved URLs
      if (url.startsWith('http') || url.startsWith('https') || url.startsWith('/')) {
        return
      }

      // Only handle .excalidraw files
      if (!url.endsWith('.excalidraw') && !url.endsWith('.excalidraw.md')) {
        return
      }

      const alt = node.alt || ''

      // Convert to raw HTML so it gets parsed by rehype-raw
      // The ExcalidrawImage component will handle file resolution
      const mutableNode = node as Record<string, unknown>
      mutableNode.type = 'html'
      mutableNode.value = `<excalidraw-image src="${url}" alt="${alt}"></excalidraw-image>`
      delete mutableNode.url
      delete mutableNode.alt
      delete mutableNode.children
    })
  }
}
