import { visit } from 'unist-util-visit'
import type { Node } from 'unist'
import type { Text, Html } from 'mdast'

interface FileInfo {
  id: string
  name: string
  url?: string
  isDirectory?: boolean
}

interface ExcalidrawResolverOptions {
  fileList?: FileInfo[]
  theme?: 'light' | 'dark' // Not used anymore, kept for backwards compatibility
}

/**
 * Remark plugin to resolve Excalidraw drawings embedded with [[filename.excalidraw]] syntax
 * Replaces them with a wrapper containing both light and dark SVG variants
 * Uses CSS to show the appropriate variant based on the current theme
 */
export function remarkExcalidrawResolver(options: ExcalidrawResolverOptions = {}) {
  return function transformer(tree: Node) {
    const { fileList = [] } = options

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null) return

      const text = node.value
      // Match [[filename.excalidraw]] syntax
      const excalidrawPattern = /!\[\[([^\]]+\.excalidraw)\]\]/g

      if (!excalidrawPattern.test(text)) return

      // Split the text into parts and replace Excalidraw references
      const parts: Array<Text | Html> = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      // Reset regex
      excalidrawPattern.lastIndex = 0

      while ((match = excalidrawPattern.exec(text)) !== null) {
        const fullMatch = match[0]
        const filename = match[1]
        const matchIndex = match.index

        // Add text before match
        if (matchIndex > lastIndex) {
          parts.push({
            type: 'text',
            value: text.substring(lastIndex, matchIndex)
          } as Text)
        }

        // Find both light and dark SVG files
        const lightSvgFilename = `${filename}.light.svg`
        const darkSvgFilename = `${filename}.dark.svg`

        console.log('[Excalidraw] Looking for:', lightSvgFilename, 'and', darkSvgFilename, 'in', fileList.length, 'files')

        // Helper function to find file by name or basename
        const findFile = (name: string) => {
          let file = fileList.find(f => !f.isDirectory && f.name === name)
          if (!file) {
            const basename = name.split('/').pop()
            file = fileList.find(f => !f.isDirectory && f.name.split('/').pop() === basename)
          }
          return file
        }

        const lightSvgFile = findFile(lightSvgFilename)
        const darkSvgFile = findFile(darkSvgFilename)

        if (lightSvgFile && darkSvgFile) {
          console.log('[Excalidraw] Found both files:', lightSvgFile.name, darkSvgFile.name)

          const altText = filename.replace('.excalidraw', '')
          const lightUrl = lightSvgFile.url || `/api/files/${lightSvgFile.id}`
          const darkUrl = darkSvgFile.url || `/api/files/${darkSvgFile.id}`

          // Create HTML wrapper with both images and CSS to toggle them
          const html = `<span class="excalidraw-wrapper" data-excalidraw="${filename}">
  <img src="${lightUrl}" alt="${altText}" class="excalidraw-light" />
  <img src="${darkUrl}" alt="${altText}" class="excalidraw-dark" />
</span>`

          parts.push({
            type: 'html',
            value: html
          } as Html)
        } else {
          // File not found, keep original syntax or show error
          const missing = []
          if (!lightSvgFile) missing.push('light')
          if (!darkSvgFile) missing.push('dark')
          parts.push({
            type: 'text',
            value: `[Drawing not found: ${filename} (missing ${missing.join(' and ')} variant)]`
          } as Text)
        }

        lastIndex = matchIndex + fullMatch.length
      }

      // Add remaining text after last match
      if (lastIndex < text.length) {
        parts.push({
          type: 'text',
          value: text.substring(lastIndex)
        } as Text)
      }

      // Replace the text node with the processed parts
      if (parts.length > 0) {
        // @ts-expect-error - Parent type is not fully typed in unist
        parent.children.splice(index, 1, ...parts)
      }
    })
  }
}
