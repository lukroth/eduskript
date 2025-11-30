import { visit } from 'unist-util-visit'

// File extensions that are images
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']

/**
 * Remark plugin to mark image nodes with their original source.
 *
 * This is a PURE TRANSFORMER - it does NOT resolve file URLs.
 * File resolution happens in the component (ImageWithResize) using SkriptFiles.
 *
 * What it does:
 * - Adds `data-original-src` attribute with the original filename
 * - Skips excalidraw and video files (handled by their own plugins)
 * - Skips already-resolved URLs (http, https, /)
 */
export function remarkImageResolver() {
  return function transformer(tree: unknown) {
    visit(tree as Parameters<typeof visit>[0], 'image', (node: any) => {
      if (!node.url || typeof node.url !== 'string') return

      const url = node.url

      // Skip already-resolved URLs
      if (url.startsWith('http') || url.startsWith('https') || url.startsWith('/')) {
        return
      }

      // Skip excalidraw files (handled by remarkExcalidraw)
      if (url.endsWith('.excalidraw') || url.endsWith('.excalidraw.md')) {
        return
      }

      // Skip video files (handled by remarkMuxVideo)
      if (url.endsWith('.mp4') || url.endsWith('.mov')) {
        return
      }

      // Check if this looks like an image file
      const lowerUrl = url.toLowerCase()
      const isImage = IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))

      if (isImage) {
        // Store original filename for the component to resolve
        if (!node.data) node.data = {}
        if (!node.data.hProperties) node.data.hProperties = {}
        node.data.hProperties['data-original-src'] = url
        // Keep node.url as the raw filename - component will resolve it
      }
    })
  }
}
