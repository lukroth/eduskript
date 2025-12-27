export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface ChatRequest {
  skriptId: string
  pageId?: string // Optional: focus on specific page
  messages: ChatMessage[]
}

export interface ChatStreamEvent {
  type: 'content' | 'error' | 'done'
  content?: string
  error?: string
}

export interface SkriptContext {
  skript: {
    id: string
    title: string
    description: string | null
    slug: string
    isPublished: boolean
  }
  pages: Array<{
    id: string
    title: string
    slug: string
    content: string
    order: number
    isPublished: boolean
  }>
  files: Array<{
    id: string
    name: string
    contentType: string | null
  }>
  focusedPageId?: string
}

export interface AISystemPromptConfig {
  orgPrompt?: string
  skriptContext: SkriptContext
}

// Edit proposal types for structured content changes
export interface PageEdit {
  pageId: string | null // null for new pages
  pageTitle: string
  pageSlug: string
  originalContent: string // empty string for new pages
  proposedContent: string
  summary: string // Brief description of what changed
  isNew?: boolean // true if this is a new page to create
}

export interface EditProposal {
  skriptId: string
  edits: PageEdit[]
  overallSummary: string // High-level description of all changes
}

export interface EditRequest {
  skriptId: string
  pageId?: string // Optional: focus edits on specific page
  instruction: string // What the user wants changed
}

export interface EditResponse {
  success: boolean
  proposal?: EditProposal
  error?: string
}
