/**
 * Seed script: inserts built-in plugins into the database.
 *
 * Usage: node scripts/seed-plugins.mjs [pageSlug]
 *
 * If pageSlug is provided, creates plugins under that user.
 * Otherwise, uses the first teacher account found.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
import { config } from 'dotenv'
config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function readPlugin(filename) {
  return readFileSync(join(__dirname, 'seed-plugins', filename), 'utf-8')
}

const PLUGINS = [
  {
    slug: 'color-sliders',
    name: 'Color Sliders',
    description: 'Interactive RGB color sliders for teaching color representation',
    manifest: { defaultHeight: 250, configSchema: {} },
    file: 'color-sliders.html',
  },
  {
    slug: 'mod-calc',
    name: 'Power Mod Calculator',
    description: 'Modular exponentiation calculator (base^exp mod n) for cryptography lessons',
    manifest: {
      defaultHeight: 450,
      configSchema: {
        formula: { type: 'string', enum: ['dlog', 'rsa-enc', 'rsa-dec'], default: 'dlog' },
      },
    },
    file: 'mod-calc.html',
  },
  {
    slug: 'cipher-lab',
    name: 'Cipher Lab',
    description: 'Caesar and Vigenère cipher encryption/decryption tool',
    manifest: {
      defaultHeight: 500,
      configSchema: {
        cipher: { type: 'string', enum: ['caesar', 'vigenere'], default: 'caesar' },
        cipherkey: { type: 'string' },
        text: { type: 'string' },
      },
    },
    file: 'cipher-lab.html',
  },
  {
    slug: 'mermaid-diagram',
    name: 'Mermaid Diagram',
    description: 'Renders Mermaid diagrams (flowcharts, sequences, etc.) with theme support',
    manifest: {
      defaultHeight: 400,
      configSchema: {
        definition: { type: 'string', description: 'Mermaid diagram definition' },
      },
    },
    file: 'mermaid-diagram.html',
  },
  {
    slug: 'data-cube-visualizer',
    name: 'Data Cube Visualizer',
    description: 'Interactive 3D RGB data cube for teaching image quantization',
    manifest: { defaultHeight: 600, configSchema: {} },
    file: 'data-cube-visualizer.html',
  },
  {
    slug: 'dijkstra-visualizer',
    name: 'Dijkstra Visualizer',
    description: 'Interactive Dijkstra algorithm visualization with draggable graph nodes',
    manifest: {
      defaultHeight: 650,
      configSchema: {
        initialnodecount: { type: 'number', default: 7 },
        initialdirected: { type: 'boolean', default: false },
      },
    },
    file: 'dijkstra-visualizer.html',
  },
]

async function main() {
  const pageSlug = process.argv[2]

  // Find the author
  let user
  if (pageSlug) {
    user = await prisma.user.findFirst({ where: { pageSlug } })
    if (!user) {
      console.error(`No user found with pageSlug "${pageSlug}"`)
      process.exit(1)
    }
  } else {
    user = await prisma.user.findFirst({
      where: { accountType: 'teacher', pageSlug: { not: null } },
      orderBy: { createdAt: 'asc' },
    })
    if (!user) {
      console.error('No teacher accounts found. Create a user first.')
      process.exit(1)
    }
  }

  console.log(`Seeding plugins for user: ${user.pageName || user.name || user.pageSlug} (${user.pageSlug})`)

  let created = 0
  let updated = 0

  for (const def of PLUGINS) {
    const entryHtml = readPlugin(def.file)

    const existing = await prisma.plugin.findUnique({
      where: { authorId_slug: { authorId: user.id, slug: def.slug } },
    })

    if (existing) {
      await prisma.plugin.update({
        where: { id: existing.id },
        data: {
          name: def.name,
          description: def.description,
          manifest: def.manifest,
          entryHtml,
        },
      })
      console.log(`  Updated: ${def.slug}`)
      updated++
    } else {
      await prisma.plugin.create({
        data: {
          slug: def.slug,
          name: def.name,
          description: def.description,
          manifest: def.manifest,
          entryHtml,
          authorId: user.id,
        },
      })
      console.log(`  Created: ${def.slug}`)
      created++
    }
  }

  console.log(`\nDone! Created ${created}, updated ${updated} plugins.`)
  console.log(`\nUsage in markdown:`)
  for (const def of PLUGINS) {
    console.log(`  <plugin src="${user.pageSlug}/${def.slug}"></plugin>`)
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
