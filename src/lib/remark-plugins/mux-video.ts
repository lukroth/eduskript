import type { Image, Root } from 'mdast'
import { visit } from 'unist-util-visit'

interface FileInfo {
  id: string
  name: string
  url?: string
  isDirectory?: boolean
}

interface MuxVideoOptions {
  fileList?: FileInfo[]
}

interface MuxMetadata {
  providerMetadata?: {
    mux?: {
      playbackId?: string
    }
  }
  poster?: string
  blurDataURL?: string
  aspectRatio?: number
}

/**
 * Remark plugin to transform video references (![](video.mp4)) into Mux video components.
 *
 * Looks for corresponding .mp4.json metadata files in the fileList to get:
 * - Mux playbackId
 * - Poster image URL
 * - Optional blur placeholder and aspect ratio
 *
 * Usage in markdown:
 * ![Video title](my-video.mp4)
 * ![autoplay loop](background-video.mp4)
 */
export function remarkMuxVideo(options: MuxVideoOptions = {}) {
  return async function transformer(tree: Root) {
    const { fileList } = options

    if (!fileList || fileList.length === 0) {
      return tree
    }

    const nodesToProcess: Array<{ node: Image; index: number; parent: { children: unknown[] } }> = []

    // First, collect all video nodes to process
    visit(tree, 'image', (node, index, parent) => {
      if (index === undefined || !parent) return

      const imageNode = node as Image

      // Check for .mp4 or .mov files that aren't external URLs
      if (
        !imageNode.url.startsWith('http') &&
        (imageNode.url.endsWith('.mp4') || imageNode.url.endsWith('.mov'))
      ) {
        nodesToProcess.push({
          node: imageNode,
          index,
          parent: parent as { children: unknown[] }
        })
      }
    })

    // Process each video node
    for (const { node, index, parent } of nodesToProcess) {
      const metadata = await fetchMuxMetadataFromFileList(node.url, fileList)

      if (metadata) {
        // Create muxvideo node that will be rendered by MuxVideo component
        const muxvideoNode = {
          type: 'muxvideo',
          data: {
            hName: 'muxvideo',
            hProperties: {
              className: 'muxvideo',
              src: metadata.providerMetadata?.mux?.playbackId || '',
              poster: metadata.poster || '',
              alt: node.alt || '',
              blurDataURL: metadata.blurDataURL || '',
              aspectRatio: metadata.aspectRatio || 16 / 9
            }
          }
        }

        // Replace the original image node with the muxvideo node
        parent.children[index] = muxvideoNode
      }
    }

    return tree
  }
}

/**
 * Look up the .mp4.json metadata file from the fileList and parse it
 */
async function fetchMuxMetadataFromFileList(
  videoSrc: string,
  fileList: FileInfo[]
): Promise<MuxMetadata | null> {
  try {
    // Look for the corresponding .json metadata file
    // e.g., "my-video.mp4" -> "my-video.mp4.json"
    const jsonFilename = `${videoSrc}.json`

    // Find the JSON file in the fileList
    const jsonFile = fileList.find(f => {
      if (f.isDirectory) return false
      // Match exact name or basename
      return f.name === jsonFilename || f.name.endsWith(`/${jsonFilename}`)
    })

    if (!jsonFile || !jsonFile.url) {
      return null
    }

    // Fetch and parse the JSON metadata
    // Use proxy=true to avoid CORS issues with S3 redirects
    const fetchUrl = jsonFile.url.includes('?')
      ? `${jsonFile.url}&proxy=true`
      : `${jsonFile.url}?proxy=true`
    const response = await fetch(fetchUrl)
    if (!response.ok) {
      console.warn(`[remarkMuxVideo] Failed to fetch metadata: ${jsonFile.url}`)
      return null
    }

    const metadata = await response.json() as MuxMetadata
    return metadata
  } catch (error) {
    console.error('[remarkMuxVideo] Failed to fetch video metadata:', error)
    return null
  }
}
