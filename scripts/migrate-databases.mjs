#!/usr/bin/env node
/**
 * Migrate SQLite databases from public/sql/ to file upload system
 *
 * This script uploads existing databases to a designated skript's file storage.
 * You need to provide a skript ID where the databases will be uploaded.
 *
 * Usage:
 *   node scripts/migrate-databases.mjs <skriptId>
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import dotenv from 'dotenv'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Load environment variables from .env.local if it exists, otherwise .env
dotenv.config({ path: '.env.local' })
dotenv.config() // Fallback to .env

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlDir = join(__dirname, '..', 'public', 'sql')
const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '..', 'uploads')

const skriptId = process.argv[2]

if (!skriptId) {
  console.error('❌ Error: Skript ID is required')
  console.error('\nUsage: node scripts/migrate-databases.mjs <skriptId>')
  console.error('\nExample: node scripts/migrate-databases.mjs cm3abc123xyz')
  process.exit(1)
}

// Setup Prisma with PostgreSQL adapter
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not set')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Helper function to calculate SHA256 hash
function calculateHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

// Helper function to save file to upload directory
async function savePhysicalFile(buffer, filename) {
  const hash = calculateHash(buffer)
  const extension = filename.split('.').pop()
  const physicalFilename = `${hash}.${extension}`
  const physicalPath = join(uploadDir, physicalFilename)

  // Check if file already exists (deduplication)
  if (!existsSync(physicalPath)) {
    writeFileSync(physicalPath, buffer)
    console.log(`  💾 Saved physical file: ${physicalFilename}`)
  } else {
    console.log(`  ♻️  File already exists (deduplicated): ${physicalFilename}`)
  }

  return { hash, physicalFilename }
}

async function migrateDatabase(dbPath, filename, userId) {
  console.log(`\n📦 Migrating ${filename}...`)

  try {
    // Read the database file
    const buffer = readFileSync(dbPath)
    const size = BigInt(buffer.length)

    // Save physical file
    const { hash } = await savePhysicalFile(buffer, filename)

    // Create database record in Prisma
    const fileRecord = await prisma.file.create({
      data: {
        name: filename,
        isDirectory: false,
        skriptId: skriptId,
        hash: hash,
        contentType: filename.endsWith('.sqlite') ? 'application/x-sqlite3' : 'application/octet-stream',
        size: size,
        createdBy: userId,
        parentId: null
      }
    })

    console.log(`  ✅ Created database record: ${fileRecord.id}`)
    console.log(`  📊 File URL: /api/files/${fileRecord.id}`)
    return fileRecord
  } catch (error) {
    console.error(`  ❌ Failed to migrate ${filename}:`, error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting database migration...\n')

  // Check if SQL directory exists
  if (!existsSync(sqlDir)) {
    console.error(`❌ Directory not found: ${sqlDir}`)
    process.exit(1)
  }

  // Check if upload directory exists, create if not
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
    console.log(`📁 Created upload directory: ${uploadDir}\n`)
  }

  // Verify skript exists
  console.log(`🔍 Verifying skript ID: ${skriptId}...`)
  const skript = await prisma.skript.findUnique({
    where: { id: skriptId },
    include: { authors: true }
  })

  if (!skript) {
    console.error(`❌ Error: Skript with ID "${skriptId}" not found`)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  }

  if (skript.authors.length === 0) {
    console.error(`❌ Error: Skript "${skript.title}" has no authors`)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  }

  const userId = skript.authors[0].userId
  console.log(`✅ Found skript: "${skript.title}"`)
  console.log(`👤 Owner: ${userId}`)

  // Find all database files
  const databases = readdirSync(sqlDir)
    .filter(f => f.match(/\.(sqlite|db)$/i))

  if (databases.length === 0) {
    console.log('\n⚠️  No database files found in public/sql/')
    await prisma.$disconnect()
    await pool.end()
    process.exit(0)
  }

  console.log(`\n📊 Found ${databases.length} database(s) to migrate:\n`)
  databases.forEach((filename, i) => {
    console.log(`  ${i + 1}. ${filename}`)
  })

  // Migrate each database
  let successCount = 0
  let errorCount = 0
  const migratedFiles = []

  for (const filename of databases) {
    const dbPath = join(sqlDir, filename)
    try {
      const fileRecord = await migrateDatabase(dbPath, filename, userId)
      migratedFiles.push({ filename, id: fileRecord.id })
      successCount++
    } catch (error) {
      errorCount++
    }
  }

  console.log(`\n\n✨ Migration complete!`)
  console.log(`   Success: ${successCount}`)
  console.log(`   Failed: ${errorCount}`)

  if (successCount > 0) {
    console.log(`\n📝 Migrated files:`)
    migratedFiles.forEach(({ filename, id }) => {
      console.log(`   ${filename} → /api/files/${id}`)
    })

    console.log(`\n📝 Next steps:`)
    console.log(`   1. Update SQL test page to use file-based database references`)
    console.log(`   2. Create schema drawings using the "Create Schema" button in the file browser`)
    console.log(`   3. Delete public/sql/ directory after verifying everything works`)
    console.log(`   4. Update markdown to reference databases by name (e.g., database="netflixdb")`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((error) => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})
