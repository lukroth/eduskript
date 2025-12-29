#!/usr/bin/env node
/**
 * Direct import script - bypasses HTTP API body size limits
 * Usage: node scripts/import-direct.mjs <zip-file> <user-email>
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import JSZip from 'jszip'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { createHash } from 'crypto'

// Load .env file
import { config } from 'dotenv'
config()

// Setup Prisma with PostgreSQL adapter
const dbUrl = process.env.DATABASE_URL
const isLocalhost = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1')
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const [zipPath, userEmail] = process.argv.slice(2)

  if (!zipPath || !userEmail) {
    console.error('Usage: node scripts/import-direct.mjs <zip-file> <user-email>')
    process.exit(1)
  }

  console.log(`\n📦 Loading zip file: ${zipPath}`)
  const zipBuffer = await readFile(zipPath)
  const zip = await JSZip.loadAsync(zipBuffer)
  console.log(`   File size: ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`)

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  })

  if (!user) {
    console.error(`❌ User not found: ${userEmail}`)
    process.exit(1)
  }
  console.log(`👤 Importing for user: ${user.name || user.email} (${user.id})`)

  // Read manifest
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    console.error('❌ Invalid export: missing manifest.json')
    process.exit(1)
  }

  const manifest = JSON.parse(await manifestFile.async('string'))
  console.log(`\n📋 Manifest version: ${manifest.version}`)
  console.log(`   Collections: ${manifest.collections.length}`)
  console.log(`   Skripts: ${Object.keys(manifest.skripts).length}`)

  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  const result = { collections: 0, skripts: 0, pages: 0, files: 0 }
  const collectionIdMap = new Map()
  const skriptIdMap = new Map()
  const userId = user.id

  // Create or find collections
  console.log('\n📚 Processing collections...')
  for (const collectionData of manifest.collections) {
    let collection = await prisma.collection.findFirst({
      where: {
        slug: collectionData.slug,
        authors: { some: { userId } }
      }
    })

    if (!collection) {
      collection = await prisma.collection.create({
        data: {
          title: collectionData.title,
          description: collectionData.description,
          slug: collectionData.slug,
          isPublished: false,
          authors: {
            create: { userId, permission: 'author' }
          }
        }
      })
      result.collections++
      console.log(`   ✅ Created: ${collectionData.title}`)
    } else {
      console.log(`   ⏭️  Exists: ${collectionData.title}`)
    }

    collectionIdMap.set(collectionData.slug, collection.id)
  }

  // Create skripts and pages
  console.log('\n📝 Processing skripts...')
  for (const [skriptSlug, skriptData] of Object.entries(manifest.skripts)) {
    process.stdout.write(`   ${skriptSlug}... `)

    let skript = await prisma.skript.findFirst({
      where: {
        slug: skriptSlug,
        authors: { some: { userId } }
      }
    })

    if (!skript) {
      const collection = manifest.collections.find(c => c.skripts.includes(skriptSlug))
      const collectionSlug = collection?.slug
      const collectionId = collectionSlug ? collectionIdMap.get(collectionSlug) : null
      // Get skript order from its position in the collection's skripts array
      const skriptOrder = collection?.skripts.indexOf(skriptSlug) ?? 0

      skript = await prisma.skript.create({
        data: {
          title: skriptData.title,
          description: skriptData.description,
          slug: skriptSlug,
          isPublished: false,
          authors: {
            create: { userId, permission: 'author' }
          },
          ...(collectionId && {
            collectionSkripts: {
              create: { collectionId, order: skriptOrder }
            }
          })
        }
      })
      result.skripts++
    } else {
      console.log('exists')
      continue
    }

    skriptIdMap.set(skriptSlug, skript.id)

    // Process pages
    const skriptFolder = zip.folder(skriptSlug)
    if (!skriptFolder) {
      console.log('no folder')
      continue
    }

    const mdFiles = []
    skriptFolder.forEach((relativePath, file) => {
      if (relativePath.endsWith('.md') && !relativePath.includes('/')) {
        const orderMatch = relativePath.match(/^(\d+)-/)
        const order = orderMatch ? parseInt(orderMatch[1], 10) : 999
        mdFiles.push({ name: relativePath, order })
      }
    })
    mdFiles.sort((a, b) => a.order - b.order)

    let pagesCreated = 0
    for (let i = 0; i < mdFiles.length; i++) {
      const mdFile = mdFiles[i]
      const file = skriptFolder.file(mdFile.name)
      if (!file) continue

      const content = await file.async('string')
      const { frontmatter, body } = parseFrontmatter(content)

      const slugMatch = mdFile.name.match(/^\d+-(.+)\.md$/)
      const pageSlug = slugMatch ? slugMatch[1] : mdFile.name.replace('.md', '')

      const existingPage = await prisma.page.findFirst({
        where: {
          slug: pageSlug,
          skriptId: skript.id
        }
      })

      if (!existingPage) {
        const title = frontmatter.title || pageSlug.replace(/-/g, ' ')

        const page = await prisma.page.create({
          data: {
            title,
            content: body,
            slug: pageSlug,
            order: i,
            isPublished: false,
            skriptId: skript.id,
            authors: {
              create: { userId, permission: 'author' }
            }
          }
        })

        await prisma.pageVersion.create({
          data: {
            pageId: page.id,
            content: body,
            version: 1,
            authorId: userId,
            changeLog: 'Imported'
          }
        })

        result.pages++
        pagesCreated++
      }
    }

    // Process attachments
    const attachmentsFolder = skriptFolder.folder('attachments')
    let filesCreated = 0
    if (attachmentsFolder) {
      const attachmentFiles = []
      attachmentsFolder.forEach((relativePath, file) => {
        if (!file.dir) attachmentFiles.push(relativePath)
      })

      for (const attachmentName of attachmentFiles) {
        const file = attachmentsFolder.file(attachmentName)
        if (!file) continue

        const existingFile = await prisma.file.findFirst({
          where: {
            name: attachmentName,
            skriptId: skript.id
          }
        })

        if (!existingFile) {
          const buffer = Buffer.from(await file.async('arraybuffer'))
          const hash = createHash('sha256').update(buffer).digest('hex')
          const ext = attachmentName.split('.').pop() || 'bin'
          const physicalFilename = `${hash}.${ext}`
          const physicalPath = join(uploadDir, physicalFilename)

          if (!existsSync(physicalPath)) {
            await writeFile(physicalPath, buffer)
          }

          const contentTypeMap = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'json': 'application/json',
            'db': 'application/octet-stream',
            'sqlite': 'application/octet-stream'
          }
          const contentType = contentTypeMap[ext.toLowerCase()] || 'application/octet-stream'

          await prisma.file.create({
            data: {
              name: attachmentName,
              isDirectory: false,
              skriptId: skript.id,
              hash,
              contentType,
              size: BigInt(buffer.length),
              createdBy: userId
            }
          })

          result.files++
          filesCreated++
        }
      }
    }

    console.log(`created (${pagesCreated} pages, ${filesCreated} files)`)
  }

  console.log('\n✅ Import complete!')
  console.log(`   Collections: ${result.collections}`)
  console.log(`   Skripts: ${result.skripts}`)
  console.log(`   Pages: ${result.pages}`)
  console.log(`   Files: ${result.files}`)
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const [, frontmatterStr, body] = match
  const frontmatter = {}

  frontmatterStr.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      let value = line.slice(colonIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      frontmatter[key] = value
    }
  })

  return { frontmatter, body }
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
