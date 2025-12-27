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
