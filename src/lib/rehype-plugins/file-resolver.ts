import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'
import path from 'path'

interface FileInfo {
  id: string
  name: string
  url?: string
  isDirectory?: boolean
}

interface FileResolverOptions {
  fileList?: FileInfo[]
}

/**
 * Rehype plugin to resolve file paths for img elements.
 * This handles images that were created from markdown syntax inside HTML blocks
 * (e.g., ![](image.excalidraw) inside <Tabs>).
 *
 * These images bypass the remark file resolver, so we need to process them here.
 */
export function rehypeFileResolver(options: FileResolverOptions = {}) {
  return function transformer(tree: Root) {
    const { fileList } = options

    if (!fileList || fileList.length === 0) return

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return

      const src = node.properties?.src as string | undefined
      if (!src || typeof src !== 'string') return

      // Skip if already resolved (has data-original-src) or is absolute URL
      if (node.properties?.['data-original-src']) return
      if (src.startsWith('http') || src.startsWith('https') || src.startsWith('/api/') || src.startsWith('/missing-file/')) return

      // Handle Excalidraw files
      if (src.endsWith('.excalidraw')) {
        handleExcalidrawFile(node, src, fileList)
        return
      }

      // Regular file resolution
      const resolvedPath = resolveFromFileList(src, fileList)
      if (resolvedPath) {
        node.properties = node.properties || {}
        node.properties['data-original-src'] = src
        node.properties.src = resolvedPath
      } else {
        node.properties = node.properties || {}
        node.properties.src = `/missing-file/${src}`
      }
    })
  }
}

/**
 * Handle Excalidraw file references by finding light/dark SVG variants
 */
function handleExcalidrawFile(node: Element, filename: string, fileList: FileInfo[]) {
  const lightSvgFilename = `${filename}.light.svg`
  const darkSvgFilename = `${filename}.dark.svg`

  // Helper to find file by name or basename
  const findFile = (name: string) => {
    let file = fileList.find(f => !f.isDirectory && f.name === name)
    if (!file) {
      const basename = path.basename(name)
      file = fileList.find(f => !f.isDirectory && path.basename(f.name) === basename)
    }
    return file
  }

  const lightSvgFile = findFile(lightSvgFilename)
  const darkSvgFile = findFile(darkSvgFilename)

  node.properties = node.properties || {}

  if (lightSvgFile && darkSvgFile) {
    const lightUrl = lightSvgFile.url || `/api/files/${lightSvgFile.id}`
    const darkUrl = darkSvgFile.url || `/api/files/${darkSvgFile.id}`

    // Set the primary URL to light version
    node.properties.src = lightUrl

    // Add data attributes for React component
    node.properties['data-excalidraw'] = filename
    node.properties['data-light-src'] = lightUrl
    node.properties['data-dark-src'] = darkUrl
    node.properties['data-original-src'] = filename
  } else {
    // Missing SVG variants
    const missing = []
    if (!lightSvgFile) missing.push('light')
    if (!darkSvgFile) missing.push('dark')
    node.properties.src = `/missing-file/${filename}?missing=${missing.join(',')}`
  }
}

/**
 * Resolve file path from pre-fetched file list
 */
function resolveFromFileList(filename: string, fileList: FileInfo[]): string | null {
  // Direct filename match
  for (const file of fileList) {
    if (!file.isDirectory && filename === file.name) {
      return file.url || `/api/files/${file.id}`
    }
  }

  // Try to find by basename
  const basename = path.basename(filename)
  const basenameMatch = fileList.find(file => !file.isDirectory && path.basename(file.name) === basename)
  if (basenameMatch) {
    return basenameMatch.url || `/api/files/${basenameMatch.id}`
  }

  return null
}
