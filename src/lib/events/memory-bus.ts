/**
 * In-Memory EventBus Implementation
 *
 * Phase 1 implementation for single-server deployment.
 * Swap to PostgreSQL LISTEN/NOTIFY when scaling to multiple servers.
 */

import type { EventBus, AppEvent } from './types'

type Handler = (event: AppEvent) => void

class InMemoryEventBus implements EventBus {
  private subscribers = new Map<string, Set<Handler>>()

  async publish(channel: string, event: AppEvent): Promise<void> {
    const handlers = this.subscribers.get(channel)
    console.log(`[EventBus] Publishing to ${channel}: ${handlers?.size ?? 0} subscribers (total channels: ${this.subscribers.size})`)
    if (handlers && handlers.size > 0) {
      // Notify all subscribers asynchronously
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error(`[EventBus] Error in handler for channel ${channel}:`, error)
        }
      })
    }
  }

  subscribe(channel: string, handler: Handler): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }
    this.subscribers.get(channel)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.subscribers.get(channel)?.delete(handler)
      // Cleanup empty channel sets
      if (this.subscribers.get(channel)?.size === 0) {
        this.subscribers.delete(channel)
      }
    }
  }

  /**
   * Get number of subscribers for a channel (for debugging/metrics)
   */
  getSubscriberCount(channel: string): number {
    return this.subscribers.get(channel)?.size ?? 0
  }

  /**
   * Get all active channels (for debugging/metrics)
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscribers.keys())
  }
}

// Singleton instance
export const memoryEventBus = new InMemoryEventBus()
