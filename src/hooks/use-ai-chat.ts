'use client'

import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ChatStreamEvent } from '@/lib/ai/types'

interface UseAIChatOptions {
  skriptId: string
  pageId?: string
}

interface UseAIChatReturn {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}

export function useAIChat({ skriptId, pageId }: UseAIChatOptions): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      setError(null)

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      const newMessages = [...messages, userMessage]
      setMessages(newMessages)

      // Prepare assistant message placeholder
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      setMessages([...newMessages, assistantMessage])
      setIsStreaming(true)

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skriptId,
            pageId,
            messages: newMessages,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to send message')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let accumulatedContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6)) as ChatStreamEvent

                if (event.type === 'content' && event.content) {
                  accumulatedContent += event.content
                  setMessages((prev) => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulatedContent,
                    }
                    return updated
                  })
                } else if (event.type === 'error') {
                  throw new Error(event.error)
                }
              } catch (parseError) {
                // Ignore JSON parse errors for incomplete chunks
                if (parseError instanceof SyntaxError) continue
                throw parseError
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, don't show error
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)

        // Remove the empty assistant message on error
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [messages, isStreaming, skriptId, pageId]
  )

  const clearMessages = useCallback(() => {
    // Cancel any ongoing stream
    abortControllerRef.current?.abort()
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
  }
}
