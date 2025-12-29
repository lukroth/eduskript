import type { Root, Image } from 'mdast'
import { visit } from 'unist-util-visit'

/**
 * Remark plugin to transform video references (![](video.mp4)) into MuxVideo components.
 *
 * This plugin ONLY transforms the markdown AST - it does NOT resolve files or fetch metadata.
 * File resolution happens in the MuxVideo component itself (via the component factory).
 *
 * Usage in markdown:
 * ![Video title](my-video.mp4)
 * ![autoplay loop](background-video.mp4)
 */
export function remarkMuxVideo() {
  return function transformer(tree: Root) {
    visit(tree, 'image', (node: Image) => {
      const url = node.url

      // Skip already-resolved URLs (http, https, or absolute paths)
      if (!url || url.startsWith('http') || url.startsWith('https') || url.startsWith('/')) {
        return
      }

      // Only handle video files
      if (!url.endsWith('.mp4') && !url.endsWith('.mov')) {
        return
      }

      // Convert to raw HTML so it gets parsed by rehype-raw
      // The MuxVideo component will handle file resolution and metadata fetching
      const alt = node.alt || ''

      const mutableNode = node as unknown as Record<string, unknown>
      mutableNode.type = 'html'
      mutableNode.value = `<muxvideo src="${url}" alt="${alt}"></muxvideo>`
      delete mutableNode.url
      delete mutableNode.alt
      delete mutableNode.children
    })

    return tree
  }
}
