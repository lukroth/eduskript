/**
 * Event System Entry Point
 *
 * Factory that selects the appropriate EventBus implementation
 * based on environment configuration.
 *
 * Usage:
 *   import { eventBus } from '@/lib/events'
 *   await eventBus.publish('user:123', { type: 'class-invitation', ... })
 */

import type { EventBus } from './types'
import { memoryEventBus } from './memory-bus'
import { postgresEventBus } from './postgres-bus'

/**
 * Get the configured EventBus implementation
 *
 * Default: PostgreSQL (works across Turbopack workers)
 * Set EVENT_BUS=memory if you need in-memory only (single-process)
 */
export const eventBus: EventBus =
  process.env.EVENT_BUS === 'memory'
    ? memoryEventBus
    : postgresEventBus

// Re-export types for convenience
export * from './types'
