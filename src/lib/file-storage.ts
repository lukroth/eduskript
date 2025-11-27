import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { prisma } from './prisma'

// File storage configuration
const UPLOADS_DIR = process.env.UPLOAD_DIR || '/app/uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp,svg,pdf,doc,docx,txt,md,zip,mp4,mp3,wav,ogg,webm,csv,json,xml,html,css,js,ts,py,java,cpp,c,h,hpp,rs,go,php,rb,sh,yml,yaml,excalidraw').split(',')

/**
 * Calculate SHA256 hash for file content (using built-in crypto for simplicity)
 */
export async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Ensure uploads directory exists
 */
export async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR)
  } catch {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true })
    } catch (mkdirError) {
      throw new Error(`Failed to create uploads directory: ${mkdirError instanceof Error ? mkdirError.message : String(mkdirError)}`)
    }
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase().substring(1)
  return ext || null
}

/**
 * Validate file type and size
 */
export function validateFile(filename: string, size: number): { valid: boolean; error?: string } {
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1048576}MB`
    }
  }

  // Check file type
  const extension = getFileExtension(filename)
  if (!extension || !ALLOWED_TYPES.includes(extension)) {
    return {
      valid: false,
      error: `File type '${extension || 'unknown'}' not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Get physical file path from hash and extension
 */
export function getPhysicalPath(hash: string, extension: string): string {
  return path.join(UPLOADS_DIR, `${hash}.${extension}`)
}

/**
 * Save file to disk and database
 */
export async function saveFile({
  buffer,
  filename,
  skriptId,
  userId,
  parentId = null,
  contentType,
  overwrite = false
}: {
  buffer: Buffer
  filename: string
  skriptId: string
  userId: string
  parentId?: string | null
  contentType?: string
  overwrite?: boolean
}): Promise<{ id: string; hash: string; url: string; size: number }> {
  // Validate file
  const validation = validateFile(filename, buffer.length)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Check if file with same name already exists in the same parent/skript
  const existingFile = await prisma.file.findFirst({
    where: {
      name: filename,
      parentId,
      skriptId,
      isDirectory: false
    }
  })

  if (existingFile && !overwrite) {
    throw new Error('File already exists. Use overwrite option or rename the file.')
  }

  // Calculate hash and physical file path
  const hash = await calculateFileHash(buffer)
  const extension = getFileExtension(filename)!
  const physicalPath = getPhysicalPath(hash, extension)

  // Ensure uploads directory exists
  await ensureUploadsDir()

  // Check if physical file already exists (deduplication)
  let fileExists = false
  try {
    await fs.access(physicalPath)
    fileExists = true
  } catch {
    // File doesn't exist, we'll create it
  }

  // Write file to disk if it doesn't exist (deduplication)
  if (!fileExists) {
    try {
      await fs.writeFile(physicalPath, buffer)
    } catch (writeError) {
      throw new Error(`Failed to write file to disk: ${writeError instanceof Error ? writeError.message : String(writeError)}`)
    }
  }

  // Create or update database record
  let file
  if (existingFile && overwrite) {
    // Check if hash has changed - if not, just update metadata
    const hashChanged = existingFile.hash !== hash

    // Update existing file
    file = await prisma.file.update({
      where: { id: existingFile.id },
      data: {
        // Only update hash if it has changed (to avoid unique constraint violation)
        ...(hashChanged && { hash }),
        contentType,
        size: BigInt(buffer.length),
        updatedAt: new Date()
      }
    })
  } else {
    // Create new file record
    file = await prisma.file.create({
      data: {
        name: filename,
        parentId,
        skriptId,
        hash,
        contentType,
        size: BigInt(buffer.length),
        createdBy: userId,
        isDirectory: false
      }
    })
  }

  return {
    id: file.id,
    hash,
    url: `/api/files/${file.id}`,
    size: buffer.length
  }
}

/**
 * Create directory in database
 */
export async function createDirectory({
  name,
  skriptId,
  userId,
  parentId = null
}: {
  name: string
  skriptId: string
  userId: string
  parentId?: string | null
}): Promise<{ id: string }> {
  // Check if directory with same name already exists
  const existingDir = await prisma.file.findFirst({
    where: {
      name,
      parentId,
      skriptId,
      isDirectory: true
    }
  })

  if (existingDir) {
    throw new Error('Directory already exists')
  }

  const directory = await prisma.file.create({
    data: {
      name,
      parentId,
      skriptId,
      createdBy: userId,
      isDirectory: true
    }
  })

  return { id: directory.id }
}

/**
 * Delete file or directory
 */
export async function deleteFile(fileId: string, userId: string): Promise<void> {
  // Get file info
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      skript: {
        include: {
          authors: true
        }
      }
    }
  })

  if (!file) {
    throw new Error('File not found')
  }

  // Check permissions - user must be skript author
  const hasPermission = file.skript.authors.some(author => author.userId === userId)
  if (!hasPermission) {
    throw new Error('Permission denied')
  }

  if (file.isDirectory) {
    // For directories, delete all children recursively
    const children = await prisma.file.findMany({
      where: { parentId: fileId }
    })

    for (const child of children) {
      await deleteFile(child.id, userId)
    }
  } else {
    // For files, check if other files use the same hash
    const filesWithSameHash = await prisma.file.count({
      where: {
        hash: file.hash!,
        id: { not: fileId }
      }
    })

    // Only delete physical file if no other records reference it
    if (filesWithSameHash === 0 && file.hash) {
      const extension = getFileExtension(file.name)!
      const physicalPath = getPhysicalPath(file.hash, extension)
      try {
        await fs.unlink(physicalPath)
      } catch {
        // Don't throw - database cleanup is more important
      }
    }
  }

  // Delete database record
  await prisma.file.delete({
    where: { id: fileId }
  })
}

/**
 * List files in a directory
 */
export async function listFiles({
  skriptId,
  parentId = null,
  userId
}: {
  skriptId: string
  parentId?: string | null
  userId: string
}): Promise<Array<{
  id: string
  name: string
  isDirectory: boolean
  size?: number
  contentType?: string
  createdAt: Date
  updatedAt: Date
  url?: string
}>> {
  // Check permissions - user must be skript author
  const skript = await prisma.skript.findFirst({
    where: {
      id: skriptId,
      authors: {
        some: { userId }
      }
    }
  })

  if (!skript) {
    throw new Error('Skript not found or permission denied')
  }

  const files = await prisma.file.findMany({
    where: {
      skriptId,
      parentId
    },
    orderBy: [
      { isDirectory: 'desc' }, // Directories first
      { name: 'asc' }          // Then alphabetical
    ]
  })

  return files.map(file => ({
    id: file.id,
    name: file.name,
    isDirectory: file.isDirectory,
    size: file.size ? Number(file.size) : undefined,
    contentType: file.contentType || undefined,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    url: file.isDirectory ? undefined : `/api/files/${file.id}`
  }))
}

/**
 * List all files recursively for a skript (includes files in subdirectories)
 */
export async function listAllFiles({
  skriptId,
  userId
}: {
  skriptId: string
  userId: string
}): Promise<Array<{
  id: string
  name: string
  isDirectory: boolean
  size?: number
  contentType?: string
  createdAt: Date
  updatedAt: Date
  url?: string
}>> {
  // Check permissions - user must be skript author
  const skript = await prisma.skript.findFirst({
    where: {
      id: skriptId,
      authors: {
        some: { userId }
      }
    }
  })

  if (!skript) {
    throw new Error('Skript not found or permission denied')
  }

  // Get ALL files for this skript (not filtered by parentId)
  const files = await prisma.file.findMany({
    where: {
      skriptId
    },
    orderBy: [
      { isDirectory: 'desc' }, // Directories first
      { name: 'asc' }          // Then alphabetical
    ]
  })

  return files.map(file => ({
    id: file.id,
    name: file.name,
    isDirectory: file.isDirectory,
    size: file.size ? Number(file.size) : undefined,
    contentType: file.contentType || undefined,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    url: file.isDirectory ? undefined : `/api/files/${file.id}`
  }))
}

/**
 * Get file by ID with permission check
 */
export async function getFileById(fileId: string, userId?: string): Promise<{
  id: string
  name: string
  hash?: string
  contentType?: string
  size?: number
  physicalPath?: string
  skriptId: string
  parentId: string | null
} | null> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      skript: {
        include: {
          authors: true,
          pages: {
            select: {
              isPublished: true
            }
          }
        }
      }
    }
  })

  if (!file) {
    return null
  }

  // Check permissions
  // Allow access if:
  // 1. User is an author of the skript
  // 2. File belongs to a skript with at least one published page (public access)
  const hasAuthorPermission = userId && file.skript.authors.some(author => author.userId === userId)
  const hasPublicAccess = file.skript.pages.some(page => page.isPublished)

  if (!hasAuthorPermission && !hasPublicAccess) {
    throw new Error('Permission denied')
  }

  if (file.isDirectory) {
    return {
      id: file.id,
      name: file.name,
      skriptId: file.skriptId,
      parentId: file.parentId
    }
  }

  const extension = getFileExtension(file.name)!
  let physicalPath = getPhysicalPath(file.hash!, extension)

  // Handle case where file was renamed and extension changed
  // Try to find the actual physical file with different extensions
  try {
    await fs.access(physicalPath)
  } catch {
    // File doesn't exist with current extension, try common alternatives
    const alternatives = extension === 'db' ? ['sqlite', 'db'] :
                        extension === 'sqlite' ? ['db', 'sqlite'] :
                        [extension]

    let found = false
    for (const alt of alternatives) {
      const altPath = getPhysicalPath(file.hash!, alt)
      try {
        await fs.access(altPath)
        physicalPath = altPath
        found = true
        break
      } catch {
        continue
      }
    }

    if (!found) {
      // File truly doesn't exist - continue anyway, will return 404 when accessed
    }
  }

  return {
    id: file.id,
    name: file.name,
    hash: file.hash!,
    contentType: file.contentType || undefined,
    size: file.size ? Number(file.size) : undefined,
    physicalPath,
    skriptId: file.skriptId,
    parentId: file.parentId
  }
}