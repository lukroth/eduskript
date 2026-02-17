/**
 * Server-only SkriptFiles functions.
 *
 * This file contains functions that use Prisma and should only be imported
 * in server components or API routes.
 */

import { prisma } from './prisma'
import { getS3Key } from './file-storage'
import { getTeacherFileUrl } from './s3'
import type { SkriptFilesData, SkriptFile, VideoInfo } from './skript-files'

/**
 * SSR: Query database for all files and videos associated with a skript.
 * Call this once at the start of rendering, not per-file.
 */
export async function getSkriptFiles(skriptId: string): Promise<SkriptFilesData> {
  // Fetch all files for this skript
  const dbFiles = await prisma.file.findMany({
    where: {
      skriptId,
      isDirectory: false,
    },
    select: {
      id: true,
      name: true,
      hash: true,
      width: true,
      height: true,
    },
  })

  // Also fetch videos by filename that might not be associated yet
  // This helps during the transition period
  const allVideos = await prisma.video.findMany({
    select: {
      filename: true,
      provider: true,
      metadata: true,
    },
  })

  // Build files record
  const files: Record<string, SkriptFile> = {}
  for (const file of dbFiles) {
    // Use S3 URL directly when hash is available (avoids 302 redirect
    // through /api/files/, which breaks Next.js image optimization).
    const ext = file.name.split('.').pop() || ''
    const url = file.hash
      ? getTeacherFileUrl(getS3Key(file.hash, ext))
      : `/api/files/${file.id}`

    files[file.name] = {
      id: file.id,
      name: file.name,
      url,
      width: file.width ?? undefined,
      height: file.height ?? undefined,
    }
  }

  // Build videos record - include all videos for now (they're global)
  const videos: Record<string, VideoInfo> = {}
  for (const video of allVideos) {
    const metadata = video.metadata as Record<string, unknown>
    videos[video.filename] = {
      filename: video.filename,
      provider: video.provider,
      metadata: {
        playbackId: metadata?.playbackId as string | undefined,
        poster: metadata?.poster as string | undefined,
        blurDataURL: metadata?.blurDataURL as string | undefined,
        aspectRatio: typeof metadata?.aspectRatio === 'number' ? metadata.aspectRatio : undefined,
        assetId: metadata?.assetId as string | undefined,
        status: metadata?.status as string | undefined,
      },
    }
  }

  return { env: 'ssr', files, videos }
}
