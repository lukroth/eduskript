import { visit } from 'unist-util-visit'
import path from 'path'

interface FileInfo {
  id: string
  name: string
  url?: string
  isDirectory?: boolean
}

interface FileResolverOptions {
  fileList?: FileInfo[] // Pre-fetched file list for client-side resolution
}

/**
 * Remark plugin to resolve all embedded file paths (images, pdfs, audio, video, etc.)
 * using a provided file list (from local file API).
 * Replaces any non-absolute file reference with the correct file URL.
 *
 * Special handling for Excalidraw files:
 * - Converts image![](file.excalidraw) to data attributes with light/dark SVG URLs
 */
export function remarkFileResolver(options: FileResolverOptions = {}) {
  return function transformer(tree: unknown) {
    const { fileList } = options

    // Visit all nodes that can embed files (image, link, etc.)
     
    visit(tree as Parameters<typeof visit>[0], (node: any) => {
      // Only process nodes with a 'url' property (image, link, etc.)
      if (!node.url || typeof node.url !== 'string') return

      const url = node.url

      // Skip if already a full URL or absolute path
      if (url.startsWith('http') || url.startsWith('https') || url.startsWith('/')) {
        return
      }

      // Special handling for .excalidraw files
      if (url.endsWith('.excalidraw')) {
        handleExcalidrawFile(node, url, fileList)
        return
      }

      let resolvedPath: string | null = null

      // Try client-side resolution first (using file list)
      if (fileList && fileList.length > 0) {
        resolvedPath = resolveFromFileList(url, fileList)
      }

      // Apply resolved path if found
      if (resolvedPath) {
        // Store the original URL for editing purposes
        if (!node.data) node.data = {}
        if (!node.data.hProperties) node.data.hProperties = {}
        node.data.hProperties['data-original-src'] = url

        node.url = resolvedPath
      } else {
        // IMPORTANT: Convert to absolute path to prevent relative URL interpretation
        // This prevents server 404s by making it clear this is not a relative URL
        node.url = `/missing-file/${url}`
      }
    })
  }
}

/**
 * Handle Excalidraw file references by finding light/dark SVG variants
 * and adding data attributes to the image node
 */
 
function handleExcalidrawFile(node: any, filename: string, fileList?: FileInfo[]) {
  if (!fileList || fileList.length === 0) {
    node.url = `/missing-file/${filename}`
    return
  }

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

  if (lightSvgFile && darkSvgFile) {
    const cacheBuster = Date.now()
    const lightUrl = `${lightSvgFile.url || `/api/files/${lightSvgFile.id}`}?v=${cacheBuster}`
    const darkUrl = `${darkSvgFile.url || `/api/files/${darkSvgFile.id}`}?v=${cacheBuster}`

    // Set the primary URL to light version
    node.url = lightUrl

    // Add data attributes for both React component and HTML rendering
    if (!node.data) node.data = {}
    if (!node.data.hProperties) node.data.hProperties = {}

    node.data.hProperties['data-excalidraw'] = filename
    node.data.hProperties['data-light-src'] = lightUrl
    node.data.hProperties['data-dark-src'] = darkUrl
    node.data.hProperties['data-original-src'] = filename // Store original filename for editing
  } else {
    // Missing SVG variants
    const missing = []
    if (!lightSvgFile) missing.push('light')
    if (!darkSvgFile) missing.push('dark')
    node.url = `/missing-file/${filename}?missing=${missing.join(',')}`
  }
}

/**
 * Resolve file path from pre-fetched file list (client-side)
 */
function resolveFromFileList(filename: string, fileList: FileInfo[]): string | null {

  // Direct filename match
  for (const file of fileList) {
    if (!file.isDirectory && filename === file.name) {
      return file.url || `/api/files/${file.id}`
    }
  }

  // Try to find by basename (in case of path variations)
  const basename = path.basename(filename)
  const basenameMatch = fileList.find(file => !file.isDirectory && path.basename(file.name) === basename)
  if (basenameMatch) {
    return basenameMatch.url || `/api/files/${basenameMatch.id}`
  }

  return null
}
