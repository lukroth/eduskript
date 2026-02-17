import { visit } from 'unist-util-visit'

// Extensions handled by other plugins (images, excalidraw, video)
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']
const SKIP_EXTENSIONS = ['.excalidraw', '.excalidraw.md', '.mp4', '.mov']

/**
 * Remark plugin to mark link nodes with their original href for file resolution.
 *
 * Similar to remarkImageResolver but for [text](file.zip) style links.
 * Adds `data-original-href` attribute so the `a` component can resolve
 * relative filenames to /api/files/{id} URLs via SkriptFiles.
 *
 * Skips:
 * - Already-resolved URLs (http, https, /, #, mailto:)
 * - Image files (handled by remarkImageResolver)
 * - Excalidraw/video files (handled by their own plugins)
 */
export function remarkFileLinkResolver() {
  return function transformer(tree: unknown) {
    visit(tree as Parameters<typeof visit>[0], 'link', (node: any) => {
      if (!node.url || typeof node.url !== 'string') return

      const url = node.url

      // Skip already-resolved URLs, anchors, and protocols
      if (url.startsWith('http') || url.startsWith('https') || url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:')) {
        return
      }

      // Skip image files (handled by remarkImageResolver via img elements)
      const lowerUrl = url.toLowerCase()
      if (IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
        return
      }

      // Skip excalidraw and video files
      if (SKIP_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
        return
      }

      // This looks like a relative file reference — mark it for component resolution
      if (!node.data) node.data = {}
      if (!node.data.hProperties) node.data.hProperties = {}
      node.data.hProperties['data-original-href'] = url
    })
  }
}
