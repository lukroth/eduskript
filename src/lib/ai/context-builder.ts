import type { SkriptContext } from './types'

/**
 * Formats skript data into a structured context string for Claude.
 * Prioritizes clear hierarchy and preserves markdown content.
 */
export function formatSkriptContext(context: SkriptContext): string {
  const { skript, pages, files, focusedPageId } = context

  const lines: string[] = [
    '## Skript Overview',
    `Title: ${skript.title}`,
    `Slug: ${skript.slug}`,
    `Published: ${skript.isPublished ? 'Yes' : 'No'}`,
  ]

  if (skript.description) {
    lines.push(`Description: ${skript.description}`)
  }

  lines.push('', `## Pages (${pages.length} total)`)

  for (const page of pages) {
    const isFocused = page.id === focusedPageId
    const focusMarker = isFocused ? ' [CURRENT PAGE - User is working on this]' : ''
    const publishedStatus = page.isPublished ? 'Published' : 'Draft'

    lines.push(
      '',
      `### ${page.order + 1}. ${page.title}${focusMarker}`,
      `Slug: ${page.slug} | Status: ${publishedStatus}`,
      '',
      '```markdown',
      page.content,
      '```'
    )
  }

  if (files.length > 0) {
    lines.push('', '## Attached Files')
    for (const file of files) {
      lines.push(`- ${file.name} (${file.contentType || 'unknown type'})`)
    }
  }

  return lines.join('\n')
}

/**
 * Estimates token count for context (rough approximation: 1 token ~ 4 chars).
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}
