import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkSkriptPermissions } from '@/lib/permissions'
import { assembleEditPrompt } from '@/lib/ai/prompts'
import type { EditRequest, EditResponse, SkriptContext, PageEdit } from '@/lib/ai/types'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for large edit requests

// Rate limiting (shared with chat endpoint in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10 // Lower limit for edit requests (more expensive)
const RATE_WINDOW = 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const key = `edit:${userId}`
  const record = requestCounts.get(key)

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' } as EditResponse, { status: 401 })
    }

    const userId = session.user.id

    // 2. Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { success: false, error: 'AI service not configured' } as EditResponse,
        { status: 503 }
      )
    }

    // 3. Rate limiting
    if (!checkRateLimit(userId)) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded. Please wait before requesting more edits.' } as EditResponse,
        { status: 429 }
      )
    }

    // 4. Parse request
    const body = (await request.json()) as EditRequest & { currentContent?: string }
    const { skriptId, pageId, instruction, currentContent } = body

    if (!skriptId || !instruction?.trim()) {
      return Response.json(
        { success: false, error: 'Missing required fields: skriptId and instruction' } as EditResponse,
        { status: 400 }
      )
    }

    // 5. Fetch skript
    const skript = await prisma.skript.findUnique({
      where: { id: skriptId },
      include: {
        pages: { orderBy: { order: 'asc' } },
        authors: { include: { user: true } },
        files: { select: { id: true, name: true, contentType: true } },
      },
    })

    if (!skript) {
      return Response.json({ success: false, error: 'Skript not found' } as EditResponse, { status: 404 })
    }

    // 6. Check permissions (need edit permission for edit proposals)
    const permissions = checkSkriptPermissions(userId, skript.authors)
    if (!permissions.canEdit) {
      return Response.json({ success: false, error: 'Edit access denied' } as EditResponse, { status: 403 })
    }

    // 7. Get organization prompt
    let orgPrompt: string | undefined
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMemberships: {
          include: { organization: true },
        },
      },
    })

    const orgWithPrompt = user?.organizationMemberships.find(
      (m) => m.organization.aiSystemPrompt
    )?.organization

    if (orgWithPrompt?.aiSystemPrompt) {
      orgPrompt = orgWithPrompt.aiSystemPrompt
    }

    // 8. Build context
    // Use currentContent for the focused page if provided (unsaved editor changes)
    const skriptContext: SkriptContext = {
      skript: {
        id: skript.id,
        title: skript.title,
        description: skript.description,
        slug: skript.slug,
        isPublished: skript.isPublished,
      },
      pages: skript.pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        // Use currentContent for the focused page, otherwise use DB content
        content: (pageId && p.id === pageId && currentContent !== undefined)
          ? currentContent
          : p.content,
        order: p.order,
        isPublished: p.isPublished,
      })),
      files: skript.files,
      focusedPageId: pageId,
    }

    const systemPrompt = assembleEditPrompt({
      orgPrompt,
      skriptContext,
    })

    // 9. Call Claude API (non-streaming for structured output)
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192, // Higher limit for full page content
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: instruction,
        },
      ],
    })

    // 10. Parse response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Try to parse JSON from response
    let parsedResponse: {
      edits: Array<{
        pageId: string | null
        pageTitle: string
        pageSlug: string
        proposedContent: string
        summary: string
        isNew?: boolean
      }>
      overallSummary: string
    }
    try {
      // Remove any markdown code blocks if present
      const jsonStr = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      parsedResponse = JSON.parse(jsonStr)
    } catch {
      // AI responded conversationally instead of with JSON
      // This usually means the instruction was unclear
      console.error('Failed to parse Claude response as JSON:', responseText)

      // Return the AI's response as the error so user can see it
      const truncated = responseText.length > 500
        ? responseText.slice(0, 500) + '...'
        : responseText
      return Response.json(
        { success: false, error: truncated } as EditResponse,
        { status: 400 }
      )
    }

    // 11. Build edit proposal with original content
    // Create maps by both ID and slug since AI might use either
    const pageByIdMap = new Map(skript.pages.map(p => [p.id, p]))
    const pageBySlugMap = new Map(skript.pages.map(p => [p.slug, p]))

    const edits: PageEdit[] = parsedResponse.edits.map(edit => {
      // Try to find the original page by ID first, then by slug
      let originalPage = edit.pageId ? pageByIdMap.get(edit.pageId) : undefined
      if (!originalPage && edit.pageSlug) {
        originalPage = pageBySlugMap.get(edit.pageSlug)
      }

      // Determine if this is a new page
      const isNew = edit.isNew === true || (!originalPage && edit.pageId === null)

      // Use the actual page ID if we found it, otherwise keep what AI returned
      const actualPageId = originalPage?.id ?? edit.pageId

      // For the focused page, use currentContent as original (editor might have unsaved changes)
      const isFocusedPage = pageId && actualPageId === pageId
      const originalContent = (isFocusedPage && currentContent !== undefined)
        ? currentContent
        : (originalPage?.content ?? '')

      return {
        pageId: actualPageId,
        pageTitle: edit.pageTitle,
        pageSlug: edit.pageSlug,
        originalContent,
        proposedContent: edit.proposedContent,
        isNew: isNew && !originalPage, // Only truly new if we didn't find an existing page
        summary: edit.summary,
      }
    })

    return Response.json({
      success: true,
      proposal: {
        skriptId,
        edits,
        overallSummary: parsedResponse.overallSummary,
      },
    } as EditResponse)
  } catch (error) {
    console.error('AI Edit error:', error)
    return Response.json(
      { success: false, error: 'Internal server error' } as EditResponse,
      { status: 500 }
    )
  }
}
