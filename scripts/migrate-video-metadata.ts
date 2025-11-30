/**
 * Migration script to populate the Video table from existing .mp4.json metadata files.
 *
 * Usage: npx tsx scripts/migrate-video-metadata.ts [--dry-run]
 *
 * This script:
 * 1. Reads all .mp4.json files from oldstuff/informatikgarten.ch/sites/ig/content/videos/
 * 2. Creates Video records in the database with Mux metadata
 * 3. Skript associations will be created when content is imported/rendered
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const VIDEOS_DIR = join(process.cwd(), 'oldstuff', 'informatikgarten.ch', 'sites', 'ig', 'content', 'videos')

interface MuxMetadata {
  status: string
  originalFilePath?: string
  provider: string
  providerMetadata: {
    mux: {
      uploadId: string
      assetId: string
      playbackId: string
    }
  }
  createdAt: number
  updatedAt: number
  size: number
  sources: Array<{ src: string; type: string }>
  poster?: string
  blurDataURL?: string
}

async function migrateVideoMetadata(dryRun: boolean = false) {
  console.log('Video Metadata Migration')
  console.log('========================')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Source: ${VIDEOS_DIR}`)
  console.log('')

  // Find all .mp4.json files
  let files: string[]
  try {
    files = readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4.json'))
  } catch (error) {
    console.error(`Error reading directory: ${VIDEOS_DIR}`)
    console.error('Make sure the oldstuff/informatikgarten.ch symlink exists')
    process.exit(1)
  }

  console.log(`Found ${files.length} video metadata files`)
  console.log('')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const file of files) {
    const filePath = join(VIDEOS_DIR, file)
    const filename = file.replace('.json', '') // e.g., "video.mp4"

    try {
      const content = readFileSync(filePath, 'utf-8')
      const metadata: MuxMetadata = JSON.parse(content)

      // Extract Mux-specific data
      const muxData = {
        playbackId: metadata.providerMetadata?.mux?.playbackId,
        assetId: metadata.providerMetadata?.mux?.assetId,
        uploadId: metadata.providerMetadata?.mux?.uploadId,
        poster: metadata.poster,
        blurDataURL: metadata.blurDataURL,
        status: metadata.status,
        size: metadata.size,
      }

      if (!muxData.playbackId) {
        console.log(`  SKIP: ${filename} - no playbackId`)
        skipped++
        continue
      }

      if (dryRun) {
        console.log(`  [DRY] Would create: ${filename}`)
        console.log(`        playbackId: ${muxData.playbackId}`)
        created++
      } else {
        // Check if video already exists
        const existing = await prisma.video.findUnique({
          where: { filename_provider: { filename, provider: 'mux' } }
        })

        if (existing) {
          console.log(`  SKIP: ${filename} - already exists`)
          skipped++
          continue
        }

        // Create the video record
        await prisma.video.create({
          data: {
            filename,
            provider: 'mux',
            metadata: muxData,
          }
        })

        console.log(`  CREATE: ${filename}`)
        created++
      }
    } catch (error) {
      console.error(`  ERROR: ${filename} - ${error}`)
      errors++
    }
  }

  console.log('')
  console.log('Summary')
  console.log('-------')
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors:  ${errors}`)

  await prisma.$disconnect()
}

// Parse arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

migrateVideoMetadata(dryRun).catch(console.error)
