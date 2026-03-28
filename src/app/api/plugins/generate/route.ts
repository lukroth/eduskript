import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are an expert plugin generator for Eduskript, an education platform.
You create self-contained HTML plugins that run inside sandboxed iframes.

## Plugin SDK

The host injects an SDK. Your plugin must call eduskript.init() to communicate:

\`\`\`js
var plugin = eduskript.init();

// Called once when the host sends initial data
plugin.onReady(function(ctx) {
  // ctx.config  — attributes from markdown (e.g., { mode: "quiz" })
  // ctx.data    — previously saved state, or null
  // ctx.theme   — "light" or "dark"
});

// Persist state (host validates: <1MB, rate-limited 2/s)
plugin.setData({ state: { /* your data */ }, updatedAt: Date.now() });

// Request current saved state
plugin.getData().then(function(data) { /* ... */ });

// React to theme changes
plugin.onThemeChange(function(theme) { /* "light" or "dark" */ });

// React to external data changes (teacher broadcast, multi-device sync)
plugin.onDataChanged(function(data) { /* ... */ });

// Resize the iframe (host auto-adjusts)
plugin.resize(height);
\`\`\`

## Constraints

- Output ONLY the HTML body content (no <!DOCTYPE>, <html>, <head>, or <body> tags — the host wraps your output)
- Use inline <style> and <script> tags
- You CAN use CDN libraries from: cdn.jsdelivr.net, unpkg.com, cdnjs.cloudflare.com
- You CANNOT use fetch(), XMLHttpRequest, or WebSocket (blocked by CSP)
- Support both light and dark themes via the onThemeChange callback
- Use 'var' instead of 'let/const' for maximum browser compatibility in the sandbox
- Keep it simple, educational, and visually polished
- Always call eduskript.init() and plugin.onReady()

## Output Format

Return a JSON object with these fields:
- name: Display name for the plugin (string)
- slug: URL-safe slug, lowercase with hyphens (string)
- description: One-line description (string)
- entryHtml: The HTML content (string — the <style>, <div>, and <script> content)

Return ONLY the JSON object, no markdown fences, no explanation.`

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  // Rate limiting (DB-backed)
  const recentJobs = await prisma.importJob.count({
    where: {
      userId: session.user.id,
      type: 'plugin-generate',
      createdAt: { gt: new Date(Date.now() - 60_000) },
    },
  })
  if (recentJobs >= 10) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 })
  }

  const { prompt } = await request.json()
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }

  // Track the request
  await prisma.importJob.create({
    data: {
      userId: session.user.id,
      type: 'plugin-generate',
      status: 'processing',
      progress: 0,
      message: prompt.slice(0, 200),
      result: {},
    },
  })

  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://eduskript.org',
      'X-Title': 'Eduskript',
    },
  })

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL ?? 'z-ai/glm-5',
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''

    // Parse JSON response — strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    let parsed: { name?: string; slug?: string; description?: string; entryHtml?: string }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // If not valid JSON, treat the entire response as HTML
      return NextResponse.json({
        name: 'Generated Plugin',
        slug: 'generated-plugin',
        description: '',
        entryHtml: text,
      })
    }

    return NextResponse.json({
      name: parsed.name || 'Generated Plugin',
      slug: parsed.slug || 'generated-plugin',
      description: parsed.description || '',
      entryHtml: parsed.entryHtml || text,
    })
  } catch (error) {
    console.error('Plugin generation failed:', error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
