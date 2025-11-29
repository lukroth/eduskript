#!/usr/bin/env node
/**
 * Import missing Pasted-image files from informatikgarten source
 *
 * Usage: DATABASE_URL="postgresql://postgres:password@localhost:5432/eduskript_dev" node scripts/import-missing-pasted-images.mjs
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'

dotenv.config()

const isLocal = process.env.DATABASE_URL?.includes('localhost')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// S3 config
const s3Client = new S3Client({
  region: process.env.SCW_REGION || 'fr-par',
  endpoint: `https://s3.${process.env.SCW_REGION || 'fr-par'}.scw.cloud`,
  credentials: {
    accessKeyId: process.env.SCW_ACCESS_KEY,
    secretAccessKey: process.env.SCW_SECRET_KEY,
  },
})
const bucket = process.env.SCW_TEACHER_BUCKET

// Source directories for attachments
const SOURCE_DIRS = [
  '/home/chris/git/informatikgarten.ch/sites/ig/content/code/attachments',
  '/home/chris/git/informatikgarten.ch/sites/ig/content/aufbau/attachments',
  '/home/chris/git/informatikgarten.ch/sites/ig/content/info/attachments',
  '/home/chris/git/informatikgarten.ch/sites/ig/content/data/attachments',
  '/home/chris/git/informatikgarten.ch/sites/ig/content/web/attachments',
]

async function uploadToS3(hash, ext, buffer, contentType) {
  const key = `files/${hash}.${ext}`

  // Check if already exists
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    console.log(`   S3: Already exists ${key}`)
    return key
  } catch {
    // Doesn't exist, upload
  }

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  console.log(`   S3: Uploaded ${key}`)
  return key
}

async function main() {
  console.log('S3 Bucket:', bucket)
  console.log('Database:', process.env.DATABASE_URL?.substring(0, 50) + '...')

  if (!bucket) {
    console.error('Error: SCW_TEACHER_BUCKET not set')
    process.exit(1)
  }

  try {
    // Get admin user to use as creator
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true }
    })
    if (!adminUser) {
      console.error('Error: No admin user found')
      process.exit(1)
    }
    console.log('Creator:', adminUser.email)

    // 1. Find all missing Pasted-image references
    const missingRefs = await prisma.$queryRaw`
      WITH refs AS (
        SELECT
          p.id as page_id,
          p.title as page_title,
          p."skriptId" as skript_id,
          regexp_matches(p.content, '(Pasted-image-[0-9]+\.png)', 'g') as ref
        FROM pages p
      )
      SELECT DISTINCT
        r.page_id,
        r.page_title,
        r.skript_id,
        r.ref[1] as image_name
      FROM refs r
      LEFT JOIN files f ON f.name = r.ref[1] AND f.skript_id = r.skript_id
      WHERE f.id IS NULL
      ORDER BY r.ref[1]
    `

    console.log(`Found ${missingRefs.length} missing image references`)

    if (missingRefs.length === 0) {
      console.log('No missing images to import!')
      return
    }

    // Group by image name to avoid duplicates
    const uniqueImages = new Map()
    for (const ref of missingRefs) {
      if (!uniqueImages.has(ref.image_name)) {
        uniqueImages.set(ref.image_name, [])
      }
      uniqueImages.get(ref.image_name).push({
        pageId: ref.page_id,
        pageTitle: ref.page_title,
        skriptId: ref.skript_id
      })
    }

    console.log(`\n${uniqueImages.size} unique images to find and import`)

    let imported = 0
    let notFound = 0

    for (const [imageName, locations] of uniqueImages) {
      // Find file in source directories
      let sourcePath = null
      for (const dir of SOURCE_DIRS) {
        const testPath = `${dir}/${imageName}`
        if (existsSync(testPath)) {
          sourcePath = testPath
          break
        }
      }

      if (!sourcePath) {
        console.log(`  ❌ Not found: ${imageName}`)
        notFound++
        continue
      }

      // Read file and compute hash
      const fileBuffer = readFileSync(sourcePath)
      const hash = createHash('sha256').update(fileBuffer).digest('hex')
      const ext = 'png'

      // Upload to S3
      try {
        await uploadToS3(hash, ext, fileBuffer, 'image/png')
      } catch (err) {
        console.log(`  ❌ Upload failed: ${imageName} - ${err.message}`)
        continue
      }

      // Create file records for each skript that references it
      const processedSkripts = new Set()
      for (const loc of locations) {
        if (processedSkripts.has(loc.skriptId)) continue
        processedSkripts.add(loc.skriptId)

        // Check if file record already exists for this skript
        const existing = await prisma.file.findFirst({
          where: {
            name: imageName,
            skriptId: loc.skriptId,
          }
        })

        if (!existing) {
          await prisma.file.create({
            data: {
              name: imageName,
              isDirectory: false,
              skriptId: loc.skriptId,
              hash: hash,
              contentType: 'image/png',
              size: BigInt(fileBuffer.length),
              createdBy: adminUser.id,
            }
          })
          console.log(`  ✅ Created file record: ${imageName} → skript ${loc.skriptId.substring(0, 10)}...`)
        }
      }

      imported++
    }

    console.log(`\n✅ Done! Imported: ${imported}, Not found: ${notFound}`)

  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(console.error)
