/**
 * PostgreSQL LISTEN/NOTIFY EventBus Implementation
 *
 * Uses PostgreSQL's built-in pub/sub mechanism to enable real-time events
 * across multiple server processes (fixes Turbopack worker isolation issue).
 *
 * How it works:
 * - publish() sends NOTIFY on a channel with JSON payload
 * - subscribe() uses a dedicated connection with LISTEN
 * - PostgreSQL broadcasts to all listening connections
 */

import pg from 'pg'
import type { EventBus, AppEvent } from './types'

const { Pool, Client } = pg

type Handler = (event: AppEvent) => void

// Channel prefix to avoid conflicts with other PostgreSQL NOTIFY users
const CHANNEL_PREFIX = 'eduskript_'

// Sanitize channel names for PostgreSQL (alphanumeric + underscore only)
// PostgreSQL channel names are limited to 63 characters (NAMEDATALEN - 1)
const MAX_CHANNEL_LENGTH = 63

function sanitizeChannel(channel: string): string {
  const sanitized = CHANNEL_PREFIX + channel.replace(/[^a-zA-Z0-9]/g, '_')
  // Truncate to PostgreSQL's limit if necessary
  if (sanitized.length > MAX_CHANNEL_LENGTH) {
    return sanitized.substring(0, MAX_CHANNEL_LENGTH)
  }
  return sanitized
}

// Parse SSL config from DATABASE_URL or environment
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
  const url = process.env.DATABASE_URL || ''
  // If sslmode is specified in URL, let pg handle it
  if (url.includes('sslmode=')) {
    return false // Let connection string handle SSL
  }
  // Enable SSL for production (non-localhost databases)
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    return { rejectUnauthorized: false } // Accept self-signed certs
  }
  return false
}

class PostgresEventBus implements EventBus {
  private pool: pg.Pool
  private listenerClient: pg.Client | null = null
  private subscribers = new Map<string, Set<Handler>>()
  private isConnecting = false
  private connectionPromise: Promise<void> | null = null

  constructor() {
    const sslConfig = getSSLConfig()
    // Create a pool for publishing (uses connection pooling)
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3, // Small pool just for NOTIFY commands
      ...(sslConfig && { ssl: sslConfig }),
    })

    // Start listening connection
    this.ensureListenerConnection()
  }

  /**
   * Ensure we have a dedicated listener connection
   */
  private async ensureListenerConnection(): Promise<void> {
    if (this.listenerClient) return
    if (this.connectionPromise) return this.connectionPromise

    if (this.isConnecting) return

    this.isConnecting = true
    this.connectionPromise = this.createListenerConnection()

    try {
      await this.connectionPromise
    } finally {
      this.isConnecting = false
      this.connectionPromise = null
    }
  }

  private async createListenerConnection(): Promise<void> {
    try {
      const sslConfig = getSSLConfig()
      this.listenerClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ...(sslConfig && { ssl: sslConfig }),
      })

      await this.listenerClient.connect()

      // Handle incoming notifications
      this.listenerClient.on('notification', (msg) => {
        if (!msg.channel.startsWith(CHANNEL_PREFIX)) return

        try {
          const event = JSON.parse(msg.payload || '{}') as AppEvent

          // Find handlers for this channel (need to match sanitized version)
          for (const [subscribedChannel, handlers] of this.subscribers) {
            const sanitized = sanitizeChannel(subscribedChannel)
            if (sanitized === msg.channel) {
              handlers.forEach(handler => {
                try {
                  handler(event)
                } catch (error) {
                  console.error(`[PostgresEventBus] Handler error for ${subscribedChannel}:`, error)
                }
              })
            }
          }
        } catch (error) {
          console.error('[PostgresEventBus] Failed to parse notification:', error)
        }
      })

      // Handle connection errors/closure
      this.listenerClient.on('error', (err) => {
        console.error('[PostgresEventBus] Listener connection error:', err)
        this.listenerClient = null
        // Attempt to reconnect after a delay
        setTimeout(() => this.ensureListenerConnection(), 1000)
      })

      this.listenerClient.on('end', () => {
        this.listenerClient = null
      })

      // Re-subscribe to all active channels on this new connection
      for (const channel of this.subscribers.keys()) {
        const pgChannel = sanitizeChannel(channel)
        await this.listenerClient.query(`LISTEN ${pgChannel}`)
      }
    } catch (error) {
      console.error('[PostgresEventBus] Failed to create listener connection:', error)
      this.listenerClient = null
      throw error
    }
  }

  async publish(channel: string, event: AppEvent): Promise<void> {
    const pgChannel = sanitizeChannel(channel)
    const payload = JSON.stringify(event)

    try {
      // Use pool for publishing (connection reuse)
      await this.pool.query(`SELECT pg_notify($1, $2)`, [pgChannel, payload])
    } catch (error) {
      console.error(`[PostgresEventBus] Failed to publish to ${channel}:`, error)
      throw error
    }
  }

  subscribe(channel: string, handler: Handler): () => void {
    const pgChannel = sanitizeChannel(channel)

    // Add to local subscribers map
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
    }
    this.subscribers.get(channel)!.add(handler)

    // Start LISTEN on the channel if we have a connection
    if (this.listenerClient) {
      this.listenerClient.query(`LISTEN ${pgChannel}`)
        .catch((err) => console.error(`[PostgresEventBus] LISTEN ${pgChannel} failed:`, err))
    } else {
      // Ensure connection is being established
      this.ensureListenerConnection().then(() => {
        if (this.listenerClient) {
          this.listenerClient.query(`LISTEN ${pgChannel}`)
            .catch((err) => console.error(`[PostgresEventBus] LISTEN ${pgChannel} failed:`, err))
        }
      })
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.get(channel)?.delete(handler)

      // If no more handlers for this channel, UNLISTEN
      if (this.subscribers.get(channel)?.size === 0) {
        this.subscribers.delete(channel)

        if (this.listenerClient) {
          this.listenerClient.query(`UNLISTEN ${pgChannel}`).catch(() => {
            // Silently handle UNLISTEN failures
          })
        }
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

  /**
   * Cleanup connections (for graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.listenerClient) {
      await this.listenerClient.end()
      this.listenerClient = null
    }
    await this.pool.end()
  }
}

// Singleton instance
export const postgresEventBus = new PostgresEventBus()
