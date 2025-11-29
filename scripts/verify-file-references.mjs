#!/usr/bin/env node
/**
 * Verify that all file references in markdown content exist in the database
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const isLocal = process.env.DATABASE_URL?.includes('localhost')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Patterns to extract file references from markdown
const patterns = {
  // ![alt](filename) or ![alt](filename){attributes}
  image: /!\[([^\]]*)\]\(([^)]+)\)(?:\{[^}]*\})?/g,
  // db="filename"
  database: /db="([^"]+)"/g,
  // Excalidraw references
  excalidraw: /\(([^)]+\.excalidraw)\)/g,
}

async function main() {
  console.log('🔍 Verifying file references in markdown...\n')

  // Get all pages with their skript info
  const pages = await prisma.page.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      skript: {
        select: {
          id: true,
          title: true,
          slug: true,
        }
      }
    }
  })

  // Get all files grouped by skript
  const files = await prisma.file.findMany({
    select: {
      id: true,
      name: true,
      skriptId: true,
    }
  })

  // Create a lookup map: skriptId -> Set of filenames
  const filesBySkript = new Map()
  for (const file of files) {
    if (!filesBySkript.has(file.skriptId)) {
      filesBySkript.set(file.skriptId, new Set())
    }
    filesBySkript.get(file.skriptId).add(file.name.toLowerCase())
  }

  const issues = []
  let totalReferences = 0
  let missingReferences = 0

  for (const page of pages) {
    if (!page.content) continue

    const skriptId = page.skript.id
    const skriptFiles = filesBySkript.get(skriptId) || new Set()

    // Extract image references
    let match
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)(?:\{[^}]*\})?/g
    while ((match = imagePattern.exec(page.content)) !== null) {
      const filename = match[2]

      // Skip external URLs
      if (filename.startsWith('http://') || filename.startsWith('https://')) continue
      // Skip API routes (already resolved)
      if (filename.startsWith('/api/')) continue

      totalReferences++

      // Check if file exists (case-insensitive)
      const filenameLower = filename.toLowerCase()

      // For excalidraw files, check for light/dark SVG variants
      if (filename.endsWith('.excalidraw')) {
        const baseName = filename.replace(/\.excalidraw$/, '')
        const lightExists = skriptFiles.has(`${baseName}.excalidraw.light.svg`.toLowerCase())
        const darkExists = skriptFiles.has(`${baseName}.excalidraw.dark.svg`.toLowerCase())

        if (!lightExists && !darkExists) {
          missingReferences++
          issues.push({
            page: `${page.skript.title} / ${page.title}`,
            pageSlug: page.slug,
            skriptSlug: page.skript.slug,
            filename,
            type: 'excalidraw',
            message: 'Excalidraw SVG variants not found'
          })
        }
      } else if (!skriptFiles.has(filenameLower)) {
        // Check with common variations
        const variations = [
          filenameLower,
          filenameLower.replace(/\.jpg$/, '.jpeg'),
          filenameLower.replace(/\.jpeg$/, '.jpg'),
        ]

        const found = variations.some(v => skriptFiles.has(v))
        if (!found) {
          missingReferences++
          issues.push({
            page: `${page.skript.title} / ${page.title}`,
            pageSlug: page.slug,
            skriptSlug: page.skript.slug,
            filename,
            type: 'image',
            message: 'File not found in database'
          })
        }
      }
    }

    // Extract database references
    const dbPattern = /db="([^"]+)"/g
    while ((match = dbPattern.exec(page.content)) !== null) {
      const filename = match[1]
      totalReferences++

      const filenameLower = filename.toLowerCase()
      // Check for .db or .sqlite extension
      const variations = [
        filenameLower,
        filenameLower + '.db',
        filenameLower + '.sqlite',
        filenameLower.replace(/\.db$/, '.sqlite'),
        filenameLower.replace(/\.sqlite$/, '.db'),
      ]

      const found = variations.some(v => skriptFiles.has(v))
      if (!found) {
        missingReferences++
        issues.push({
          page: `${page.skript.title} / ${page.title}`,
          pageSlug: page.slug,
          skriptSlug: page.skript.slug,
          filename,
          type: 'database',
          message: 'Database file not found'
        })
      }
    }
  }

  // Print summary
  console.log('=' .repeat(60))
  console.log('📊 Summary')
  console.log('=' .repeat(60))
  console.log(`Total file references: ${totalReferences}`)
  console.log(`Missing references: ${missingReferences}`)
  console.log(`Files in database: ${files.length}`)
  console.log()

  if (issues.length > 0) {
    console.log('❌ Missing Files:')
    console.log('-'.repeat(60))

    // Group by skript
    const bySkript = new Map()
    for (const issue of issues) {
      const key = issue.skriptSlug
      if (!bySkript.has(key)) {
        bySkript.set(key, [])
      }
      bySkript.get(key).push(issue)
    }

    for (const [skript, skriptIssues] of bySkript) {
      console.log(`\n📁 ${skript}:`)
      for (const issue of skriptIssues) {
        console.log(`   - [${issue.type}] ${issue.filename}`)
        console.log(`     Page: ${issue.pageSlug}`)
      }
    }
  } else {
    console.log('✅ All file references are valid!')
  }

  await prisma.$disconnect()

  // Return issues for programmatic use
  return issues
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
