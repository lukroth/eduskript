/**
 * Cleanup script to remove .mp4.json files from database and S3 bucket.
 * These files are now redundant since video metadata is stored in the Video table.
 *
 * Usage: npx tsx scripts/cleanup-video-json-files.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

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

// S3 client for Scaleway
const s3Client = new S3Client({
  region: 'fr-par',
  endpoint: 'https://s3.fr-par.scw.cloud',
  credentials: {
    accessKeyId: process.env.SCW_ACCESS_KEY || '',
    secretAccessKey: process.env.SCW_SECRET_KEY || '',
  },
})

const BUCKET = process.env.SCW_TEACHER_BUCKET || 'eduskript-teacher-files'

async function cleanupVideoJsonFiles(dryRun: boolean = false) {
  console.log('Video JSON Files Cleanup')
  console.log('========================')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('')

  // Find all .mp4.json files
  const jsonFiles = await prisma.file.findMany({
    where: { name: { endsWith: '.mp4.json' } },
    select: { id: true, name: true, hash: true, skriptId: true }
  })

  console.log(`Found ${jsonFiles.length} .mp4.json files to delete`)
  console.log('')

  let deletedFromS3 = 0
  let deletedFromDB = 0
  let errors = 0

  for (const file of jsonFiles) {
    try {
      if (dryRun) {
        console.log(`  [DRY] Would delete: ${file.name}`)
        deletedFromDB++
        if (file.hash) deletedFromS3++
      } else {
        // Delete from S3 if hash exists
        if (file.hash) {
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: BUCKET,
              Key: `files/${file.hash}`,
            }))
            deletedFromS3++
          } catch (s3Error) {
            // File might not exist in S3, that's OK
            console.log(`  WARN: S3 delete failed for ${file.name}: ${s3Error}`)
          }
        }

        // Delete from database
        await prisma.file.delete({
          where: { id: file.id }
        })
        deletedFromDB++
        console.log(`  DELETE: ${file.name}`)
      }
    } catch (error) {
      console.error(`  ERROR: ${file.name} - ${error}`)
      errors++
    }
  }

  console.log('')
  console.log('Summary')
  console.log('-------')
  console.log(`Deleted from DB: ${deletedFromDB}`)
  console.log(`Deleted from S3: ${deletedFromS3}`)
  console.log(`Errors: ${errors}`)

  await prisma.$disconnect()
  await pool.end()
}

// Parse arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

cleanupVideoJsonFiles(dryRun).catch(console.error)
