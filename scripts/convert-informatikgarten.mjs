#!/usr/bin/env node
/**
 * Convert old Informatikgarten content to Eduskript export format
 *
 * This script converts the Obsidian-based content structure to a zip file
 * that can be imported into Eduskript using the standard import feature.
 *
 * Usage:
 *   node scripts/convert-informatikgarten.mjs [topic]
 *   node scripts/convert-informatikgarten.mjs --all
 *
 * Options:
 *   topic    - Convert specific topic (e.g., 'code', 'aufbau')
 *   --all    - Convert all topics
 *   --dry-run - Validate only, don't create zip
 *
 * Examples:
 *   node scripts/convert-informatikgarten.mjs adder
 *   node scripts/convert-informatikgarten.mjs --all
 *   node scripts/convert-informatikgarten.mjs --all --dry-run
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync, copyFileSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const oldContentDir = join(__dirname, '..', 'oldstuff', 'informatikgarten.ch', 'sites', 'ig', 'ig_content')
const videosDir = join(oldContentDir, 'videos')
const globalAttachmentsDir = join(oldContentDir, 'attachments')
const outputDir = join(__dirname, '..', 'export-output')

// Parse arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const convertAll = args.includes('--all')
const specificTopic = args.find(a => !a.startsWith('--'))

// Collection mapping
const COLLECTION_MAP = {
  'adder': { collection: 'Grundjahr', title: 'Building an Adder', order: 1 },
  'aufbau': { collection: 'Grundjahr', title: 'Computer & OS', order: 2 },
  'code': { collection: 'Grundjahr', title: 'Programmieren 1', order: 3 },
  'data': { collection: 'Grundjahr', title: 'Daten & Information', order: 4 },
  'code2': { collection: 'Grundjahr', title: 'Programmieren 2', order: 5 },
  'net': { collection: 'Grundjahr', title: 'Netzwerke & Internet', order: 6 },
  'blender': { collection: 'Weitere Inhalte', title: 'Blender & VFX', order: 1 },
  'crypto': { collection: 'Weitere Inhalte', title: 'Kryptologie', order: 2 },
  'microbit': { collection: 'Weitere Inhalte', title: 'Robotik', order: 3 },
  'didactics': { collection: 'Weitere Inhalte', title: 'Didaktik', order: 4 },
  'sql': { collection: 'Weitere Inhalte', title: 'Datenbanken', order: 5 },
  'turtleinvaders': { collection: 'Weitere Inhalte', title: 'Turtle Invaders', order: 6 },
  'webdev': { collection: 'Weitere Inhalte', title: 'Web-Entwicklung', order: 7 },
  'IKT': { collection: 'Weitere Inhalte', title: 'ICT', order: 8 },
  'population': { collection: 'Weitere Inhalte', title: 'Populationsdynamik', order: 9 }
}

// Validation errors/warnings
const issues = []

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!match) {
    return { frontmatter: {}, content }
  }

  const [, frontmatterStr, bodyContent] = match
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

  return { frontmatter, content: bodyContent }
}

/**
 * Transform wiki-links to proper markdown
 */
function transformWikiLinks(content, topicDir, attachmentsDir) {
  const referencedAssets = new Set()

  // Transform image/video embeds: ![[filename]] or ![[filename|alt]]
  let transformed = content.replace(/!\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, filename, alt) => {
    // Handle Excalidraw diagrams - flatten path for both asset tracking and output
    // Support both .excalidraw and .excalidraw.md extensions
    if (!filename.includes('.') || filename.endsWith('.excalidraw') || filename.endsWith('.excalidraw.md')) {
      const baseName = filename.replace(/\.excalidraw(\.md)?$/, '')
      const flatBaseName = basename(baseName)
      referencedAssets.add(`${baseName}.excalidraw`) // Original path for finding asset (normalized)
      return `![${alt || ''}](${flatBaseName}.excalidraw)` // Flattened for output (always .excalidraw)
    }

    // Videos - reference by filename, the .mp4.json metadata will be alongside
    if (filename.match(/\.(mp4|webm|mov)$/i)) {
      const flatFilename = basename(filename)
      referencedAssets.add(filename) // Original path for finding asset
      return `![${alt || ''}](${flatFilename})` // Flattened for output
    }

    // Regular images - flatten path
    const flatFilename = basename(filename)
    referencedAssets.add(filename) // Original path for finding asset
    return `![${alt || ''}](${flatFilename})` // Flattened for output
  })

  // Transform internal links: [[page-name|link text]] or [[page-name]]
  transformed = transformed.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (match, target, linkText) => {
    const displayText = linkText || target
    // Convert to relative markdown link
    return `[${displayText}](${target})`
  })

  // Transform inline code with language hints: `code{:python}` → `code`
  transformed = transformed.replace(/`([^`]+?)\{:(\w+)\}`/g, '`$1`')

  return { transformedContent: transformed, referencedAssets: Array.from(referencedAssets) }
}

/**
 * Transform code block languages
 */
function transformCodeBlocks(content) {
  // Transform turtle → python editor
  return content.replace(/```turtle\n/g, '```python editor\n')
}

/**
 * Validate markdown syntax
 */
function validateMarkdown(content, location) {
  const localIssues = []

  // Check for unclosed code blocks
  const codeBlockMatches = content.match(/```/g) || []
  if (codeBlockMatches.length % 2 !== 0) {
    localIssues.push({
      type: 'error',
      location,
      message: 'Unclosed code block (odd number of ```)'
    })
  }

  // Check for broken image/link syntax
  if (content.match(/!\[[^\]]*\]\([^)]*$/m)) {
    localIssues.push({
      type: 'error',
      location,
      message: 'Broken image/link syntax (unclosed parenthesis)'
    })
  }

  // Check for remaining wiki-links
  const wikiLinks = content.match(/\[\[[^\]]+\]\]/g)
  if (wikiLinks) {
    localIssues.push({
      type: 'warning',
      location,
      message: `Found ${wikiLinks.length} unconverted wiki-links: ${wikiLinks.slice(0, 3).join(', ')}${wikiLinks.length > 3 ? '...' : ''}`
    })
  }

  // Check frontmatter
  if (content.startsWith('---')) {
    const frontmatterEnd = content.indexOf('---', 4)
    if (frontmatterEnd === -1) {
      localIssues.push({
        type: 'error',
        location,
        message: 'Unclosed YAML frontmatter'
      })
    }
  }

  // Check for potentially problematic callout syntax
  const calloutMatches = content.match(/^>\s*\[!([^\]]+)\]/gm) || []
  for (const callout of calloutMatches) {
    const typeMatch = callout.match(/\[!([^\]]+)\]/)
    if (typeMatch) {
      const calloutType = typeMatch[1].toLowerCase().replace(/[+-]$/, '')
      const validTypes = [
        'note', 'tip', 'warning', 'abstract', 'info', 'todo', 'success',
        'question', 'failure', 'danger', 'bug', 'example', 'quote', 'solution',
        'discuss', 'lernziele', 'hint', 'exercise', 'aufgabe', 'summary',
        'caution', 'attention', 'important', 'check', 'done', 'help', 'faq',
        'fail', 'missing', 'error', 'cite', 'tldr', 'definition', 'def',
        'idea', 'code'
      ]
      if (!validTypes.includes(calloutType)) {
        localIssues.push({
          type: 'warning',
          location,
          message: `Unknown callout type: [!${calloutType}]`
        })
      }
    }
  }

  return localIssues
}

/**
 * Slugify a string for use in URLs
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Find asset file in various locations
 */
function findAsset(filename, topicAttachmentsDir, topicPath) {
  // Handle relative paths like ../other-topic/attachments/sample.jpg
  // These are resolved from the topic root, not from attachments/
  if (filename.startsWith('../')) {
    const resolvedPath = join(topicPath, filename)
    if (existsSync(resolvedPath)) return resolvedPath
  }

  // Also search subdirectories of attachments (e.g., attachments/fde-demo/)
  if (existsSync(topicAttachmentsDir)) {
    const subdirs = readdirSync(topicAttachmentsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const subdir of subdirs) {
      const subPath = join(topicAttachmentsDir, subdir, filename)
      if (existsSync(subPath)) return subPath
    }
  }

  const possiblePaths = [
    join(topicAttachmentsDir, filename),
    join(globalAttachmentsDir, filename),
    join(videosDir, filename)
  ]

  // For Excalidraw, look for light/dark SVGs
  // Support both .excalidraw and .excalidraw.md extensions
  if (filename.endsWith('.excalidraw') || filename.endsWith('.excalidraw.md')) {
    const baseName = filename.replace(/\.excalidraw(\.md)?$/, '')
    // Build paths for SVG variants (including subdirectories)
    const svgBasePaths = [
      join(topicAttachmentsDir, baseName),
      join(globalAttachmentsDir, baseName),
      join(videosDir, baseName)
    ]

    // Also check subdirectories of attachments
    if (existsSync(topicAttachmentsDir)) {
      const subdirs = readdirSync(topicAttachmentsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
      for (const subdir of subdirs) {
        svgBasePaths.push(join(topicAttachmentsDir, subdir, baseName))
      }
    }

    // Handle relative paths for Excalidraw
    if (baseName.startsWith('../')) {
      svgBasePaths.unshift(join(topicPath, baseName))
    }

    const lightPath = svgBasePaths.map(p => `${p}.excalidraw.light.svg`).find(p => existsSync(p))
    const darkPath = svgBasePaths.map(p => `${p}.excalidraw.dark.svg`).find(p => existsSync(p))
    if (lightPath || darkPath) {
      return { type: 'excalidraw', lightPath, darkPath, baseName }
    }
  }

  // For videos, only return metadata - we don't want to copy the actual video files
  if (filename.match(/\.(mp4|mov|webm)$/i)) {
    const jsonPath = possiblePaths.map(p => `${p}.json`).find(p => existsSync(p))
    if (jsonPath) {
      return { type: 'video', jsonPath, filename }
    }
    // If no json metadata exists, skip the video entirely
    return null
  }

  // For regular files, return the path if found
  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }

  return null
}

/**
 * Process a single topic
 */
async function processTopic(topicDir, outputTopicDir) {
  const topicPath = join(oldContentDir, topicDir)
  const topicMeta = COLLECTION_MAP[topicDir]

  if (!topicMeta) {
    issues.push({
      type: 'warning',
      location: topicDir,
      message: `Topic not in COLLECTION_MAP, skipping`
    })
    return null
  }

  if (!existsSync(topicPath)) {
    issues.push({
      type: 'error',
      location: topicDir,
      message: `Directory not found: ${topicPath}`
    })
    return null
  }

  console.log(`\n📖 Processing: ${topicDir} → "${topicMeta.title}"`)

  // Find all markdown files
  const files = readdirSync(topicPath)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999')
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999')
      return numA - numB
    })

  console.log(`   Found ${files.length} pages`)

  const topicAttachmentsDir = join(topicPath, 'attachments')
  const skriptSlug = slugify(topicMeta.title)
  const pages = []
  const allReferencedAssets = new Set()

  // Process each page
  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    const filepath = join(topicPath, filename)

    const rawContent = readFileSync(filepath, 'utf-8')
    const { frontmatter, content } = parseFrontmatter(rawContent)

    // Get title
    let title = frontmatter.title
    if (!title) {
      // Extract from filename: "01-intro.md" → "intro"
      title = filename.replace(/^\d+-/, '').replace('.md', '').replace(/-/g, ' ')
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1)
    }

    const pageSlug = slugify(title)

    // Transform content
    let transformed = content
    const { transformedContent, referencedAssets } = transformWikiLinks(transformed, topicDir, topicAttachmentsDir)
    transformed = transformedContent
    transformed = transformCodeBlocks(transformed)

    // Track referenced assets
    referencedAssets.forEach(a => allReferencedAssets.add(a))

    // Validate
    const validationIssues = validateMarkdown(transformed, `${topicDir}/${filename}`)
    issues.push(...validationIssues)

    // Create page filename
    const pageFilename = `${String(i + 1).padStart(2, '0')}-${pageSlug}.md`

    // Add frontmatter
    const finalContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\n---\n\n${transformed}`

    pages.push({
      slug: pageSlug,
      filename: pageFilename,
      content: finalContent
    })

    if (!dryRun) {
      // Write page file
      const skriptDir = join(outputTopicDir, skriptSlug)
      if (!existsSync(skriptDir)) {
        await mkdir(skriptDir, { recursive: true })
      }
      writeFileSync(join(skriptDir, pageFilename), finalContent)
    }

    console.log(`   ✓ ${filename} → ${pageFilename}`)
  }

  // Process attachments
  const attachmentsCopied = []
  if (!dryRun && allReferencedAssets.size > 0) {
    const attachmentsOutputDir = join(outputTopicDir, skriptSlug, 'attachments')
    await mkdir(attachmentsOutputDir, { recursive: true })

    for (const assetName of allReferencedAssets) {
      const found = findAsset(assetName, topicAttachmentsDir, topicPath)

      if (!found) {
        issues.push({
          type: 'warning',
          location: `${topicDir}/attachments`,
          message: `Asset not found: ${assetName}`
        })
        continue
      }

      if (typeof found === 'string') {
        // Regular file - flatten path (remove any subdirectories)
        const flatName = basename(assetName)
        copyFileSync(found, join(attachmentsOutputDir, flatName))
        attachmentsCopied.push(flatName)
      } else if (found.type === 'excalidraw') {
        // Excalidraw - copy both light and dark SVGs (flatten path)
        const flatBaseName = basename(found.baseName)
        if (found.lightPath) {
          const lightName = `${flatBaseName}.excalidraw.light.svg`
          copyFileSync(found.lightPath, join(attachmentsOutputDir, lightName))
          attachmentsCopied.push(lightName)
        }
        if (found.darkPath) {
          const darkName = `${flatBaseName}.excalidraw.dark.svg`
          copyFileSync(found.darkPath, join(attachmentsOutputDir, darkName))
          attachmentsCopied.push(darkName)
        }
      } else if (found.type === 'video') {
        // Video - only copy the .mp4.json metadata file (videos are on Mux)
        const flatFilename = basename(found.filename)
        if (found.jsonPath) {
          const jsonName = `${flatFilename}.json`
          copyFileSync(found.jsonPath, join(attachmentsOutputDir, jsonName))
          attachmentsCopied.push(jsonName)
        }
        // Note: We intentionally don't copy actual video files since they're hosted on Mux
        // The .mp4.json metadata contains the Mux playback ID
      }
    }
  }

  console.log(`   📎 ${attachmentsCopied.length} attachments`)

  return {
    slug: skriptSlug,
    title: topicMeta.title,
    description: `Migrated from ${topicDir}`,
    collection: topicMeta.collection,
    order: topicMeta.order,
    pages: pages.map(p => p.slug)
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Informatikgarten to Eduskript Export Converter\n')

  if (!specificTopic && !convertAll) {
    console.error('Usage: node scripts/convert-informatikgarten.mjs [topic] | --all [--dry-run]')
    console.error('\nAvailable topics:', Object.keys(COLLECTION_MAP).join(', '))
    process.exit(1)
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - Validation only\n')
  }

  // Determine which topics to process
  const topicsToProcess = convertAll
    ? Object.keys(COLLECTION_MAP)
    : [specificTopic]

  // Clean and create output directory
  if (!dryRun) {
    if (existsSync(outputDir)) {
      await rm(outputDir, { recursive: true })
    }
    await mkdir(outputDir, { recursive: true })
  }

  // Build manifest
  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: [],
    skripts: {}
  }

  // Group by collection
  const collectionSkripts = new Map()

  // Process topics
  for (const topic of topicsToProcess) {
    const result = await processTopic(topic, outputDir)
    if (result) {
      manifest.skripts[result.slug] = {
        title: result.title,
        description: result.description,
        pages: result.pages
      }

      // Group by collection
      if (!collectionSkripts.has(result.collection)) {
        collectionSkripts.set(result.collection, [])
      }
      collectionSkripts.get(result.collection).push({
        slug: result.slug,
        order: result.order
      })
    }
  }

  // Build collections in manifest
  for (const [collectionName, skripts] of collectionSkripts) {
    // Sort skripts by order
    skripts.sort((a, b) => a.order - b.order)

    manifest.collections.push({
      slug: slugify(collectionName),
      title: collectionName,
      description: `Migrated content collection`,
      skripts: skripts.map(s => s.slug)
    })
  }

  // Write manifest
  if (!dryRun) {
    writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))
  console.log(`Collections: ${manifest.collections.length}`)
  console.log(`Skripts: ${Object.keys(manifest.skripts).length}`)

  const totalPages = Object.values(manifest.skripts).reduce((sum, s) => sum + s.pages.length, 0)
  console.log(`Pages: ${totalPages}`)

  // Print issues
  const errors = issues.filter(i => i.type === 'error')
  const warnings = issues.filter(i => i.type === 'warning')

  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`)
    for (const error of errors) {
      console.log(`   ${error.location}: ${error.message}`)
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${warnings.length}`)
    for (const warning of warnings.slice(0, 20)) {
      console.log(`   ${warning.location}: ${warning.message}`)
    }
    if (warnings.length > 20) {
      console.log(`   ... and ${warnings.length - 20} more`)
    }
  }

  if (!dryRun && errors.length === 0) {
    // Create zip file
    console.log('\n📦 Creating zip file...')
    const zipFilename = `informatikgarten-export-${new Date().toISOString().split('T')[0]}.zip`
    const zipPath = join(__dirname, '..', zipFilename)

    // Use system zip command for simplicity
    execSync(`cd "${outputDir}" && zip -r "${zipPath}" .`, { stdio: 'pipe' })

    console.log(`\n✅ Export complete!`)
    console.log(`   Output: ${zipPath}`)
    console.log(`\n📝 Next steps:`)
    console.log(`   1. Start dev server: pnpm dev`)
    console.log(`   2. Go to Settings > Import/Export`)
    console.log(`   3. Upload ${zipFilename}`)
    console.log(`   4. Review preview and confirm import`)
  } else if (errors.length > 0) {
    console.log('\n❌ Export aborted due to errors. Fix the issues above and try again.')
    process.exit(1)
  } else {
    console.log('\n✅ Validation complete! No blocking errors found.')
  }
}

main().catch(error => {
  console.error('💥 Conversion failed:', error)
  process.exit(1)
})
