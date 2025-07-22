import { visit } from 'unist-util-visit'
import path from 'path'
import { searchFileInSubdirectories, getChapterUploadDir, getGlobalUploadDir, filePathToUrl } from './utils'

interface ImageResolverOptions {
  domain?: string
  chapterId?: string
}

/**
 * Remark plugin to resolve image paths and convert wikilinks to proper markdown images
 */
export function remarkImageResolver(options: ImageResolverOptions = {}) {
  return function transformer(tree: any) {
    const { domain, chapterId } = options

    // First pass: Convert wikilinks to proper markdown images
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (!node.value || !parent || index === undefined) return

      // Match wikilink patterns like [[image.png]] or [[alt text|image.png]]
      const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
      let match
      const replacements: Array<{ start: number; end: number; replacement: any }> = []

      while ((match = wikiLinkRegex.exec(node.value)) !== null) {
        const [fullMatch, linkContent, altText] = match
        const start = match.index
        const end = start + fullMatch.length

        // If there's altText, the first part is alt and second is filename
        // If no altText, treat the whole thing as filename
        let filename: string
        let alt: string

        if (altText) {
          alt = linkContent
          filename = altText
        } else {
          filename = linkContent
          alt = ''
        }

        // Check if this looks like an image file
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']
        const isImage = imageExtensions.some(ext => 
          filename.toLowerCase().endsWith(ext)
        )

        if (isImage) {
          replacements.push({
            start,
            end,
            replacement: {
              type: 'image',
              url: filename, // Will be resolved in the next pass
              alt: alt || path.parse(filename).name
            }
          })
        }
      }

      // Apply replacements in reverse order to maintain correct indices
      if (replacements.length > 0) {
        const children = parent.children as any[]
        const newNodes: any[] = []
        let lastEnd = 0

        // Sort replacements by start position
        replacements.sort((a, b) => a.start - b.start)

        for (const replacement of replacements) {
          // Add text before this replacement
          if (replacement.start > lastEnd) {
            const beforeText = node.value.slice(lastEnd, replacement.start)
            if (beforeText) {
              newNodes.push({
                type: 'text',
                value: beforeText
              })
            }
          }

          // Add the image node
          newNodes.push(replacement.replacement)
          lastEnd = replacement.end
        }

        // Add remaining text after last replacement
        if (lastEnd < node.value.length) {
          const afterText = node.value.slice(lastEnd)
          if (afterText) {
            newNodes.push({
              type: 'text',
              value: afterText
            })
          }
        }

        // Replace the text node with the new nodes
        children.splice(index, 1, ...newNodes)
      }
    })

    // Second pass: Resolve image paths
    visit(tree, 'image', (node: any) => {
      const { url } = node

      // Skip if already a full URL or absolute path
      if (url.startsWith('http') || url.startsWith('https') || url.startsWith('/')) {
        return
      }

      // Try to resolve the image path
      const resolvedPath = resolveImagePath(url, domain, chapterId)
      if (resolvedPath) {
        node.url = resolvedPath
      } else {
        console.warn(`Image not found: ${url} (domain: ${domain}, chapter: ${chapterId})`)
        // Keep the original URL, it might be relative to the current directory
      }
    })
  }
}

/**
 * Resolve image path by searching in chapter and global upload directories
 */
function resolveImagePath(filename: string, domain?: string, chapterId?: string): string | null {
  if (!domain) {
    return null
  }

  // Search in chapter-specific directory first (if chapter is specified)
  if (chapterId) {
    const chapterDir = getChapterUploadDir(domain, chapterId)
    const foundInChapter = searchFileInSubdirectories(chapterDir, filename)
    if (foundInChapter) {
      return filePathToUrl(foundInChapter)
    }
  }

  // Search in global upload directory
  const globalDir = getGlobalUploadDir(domain)
  const foundInGlobal = searchFileInSubdirectories(globalDir, filename)
  if (foundInGlobal) {
    return filePathToUrl(foundInGlobal)
  }

  return null
}
