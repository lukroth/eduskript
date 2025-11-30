import { prisma } from '@/lib/prisma'
import { downloadFromS3, isS3Configured } from '@/lib/s3'

export interface FileInfo {
  id: string
  name: string
  hash?: string | null
}

/**
 * Resolve a filename to a URL.
 * - Server-side: returns API URL (could also use S3 URL with credentials)
 * - Client-side: returns API URL from fileList
 */
export async function resolveFileUrl(
  filename: string,
  options: { skriptId?: string; fileList?: FileInfo[] }
): Promise<string | null> {
  const { skriptId, fileList } = options

  // Server-side: query database
  if (skriptId && typeof window === 'undefined') {
    const file = await prisma.file.findFirst({
      where: { skriptId, name: filename, isDirectory: false },
      select: { id: true }
    })
    if (file) {
      return `/api/files/${file.id}`
    }
    return null
  }

  // Client-side: lookup in fileList
  if (fileList) {
    const file = fileList.find(f => f.name === filename)
    if (file) {
      return `/api/files/${file.id}`
    }
  }

  return null
}

/**
 * Fetch file content directly (server-side only).
 * Uses S3 credentials to download file content.
 */
export async function fetchFileContent(
  filename: string,
  skriptId: string
): Promise<Buffer | null> {
  if (typeof window !== 'undefined') {
    throw new Error('fetchFileContent is server-side only')
  }

  const file = await prisma.file.findFirst({
    where: { skriptId, name: filename, isDirectory: false },
    select: { hash: true }
  })

  if (!file?.hash) {
    return null
  }

  if (!isS3Configured()) {
    console.warn('S3 not configured, cannot fetch file content')
    return null
  }

  try {
    return await downloadFromS3(file.hash)
  } catch (error) {
    console.error(`Failed to download file ${filename}:`, error)
    return null
  }
}

/**
 * Fetch and parse JSON file content (server-side only).
 */
export async function fetchJsonFile<T>(
  filename: string,
  skriptId: string
): Promise<T | null> {
  const content = await fetchFileContent(filename, skriptId)
  if (!content) return null

  try {
    return JSON.parse(content.toString('utf-8')) as T
  } catch {
    console.error(`Failed to parse JSON file ${filename}`)
    return null
  }
}

/**
 * Resolve multiple filenames at once (more efficient for batch lookups)
 */
export async function resolveFileUrls(
  filenames: string[],
  options: { skriptId?: string; fileList?: FileInfo[] }
): Promise<Map<string, string>> {
  const { skriptId, fileList } = options
  const result = new Map<string, string>()

  // Server-side: batch query database
  if (skriptId && typeof window === 'undefined') {
    const files = await prisma.file.findMany({
      where: { skriptId, name: { in: filenames }, isDirectory: false },
      select: { id: true, name: true }
    })
    for (const file of files) {
      result.set(file.name, `/api/files/${file.id}`)
    }
    return result
  }

  // Client-side: lookup in fileList
  if (fileList) {
    for (const filename of filenames) {
      const file = fileList.find(f => f.name === filename)
      if (file) {
        result.set(filename, `/api/files/${file.id}`)
      }
    }
  }

  return result
}
