/**
 * Request Context for Metrics
 *
 * Uses AsyncLocalStorage to track metrics per-request.
 * Allows us to count DB queries and measure response time per request.
 */

import { AsyncLocalStorage } from 'async_hooks'

interface RequestMetrics {
  queryCount: number
  queryTimeMs: number
  startTime: number
}

const asyncLocalStorage = new AsyncLocalStorage<RequestMetrics>()

/**
 * Run a function within a request context that tracks metrics
 */
export function withRequestMetrics<T>(fn: () => T | Promise<T>): Promise<T> {
  const context: RequestMetrics = {
    queryCount: 0,
    queryTimeMs: 0,
    startTime: Date.now(),
  }
  return asyncLocalStorage.run(context, async () => fn())
}

/**
 * Get current request's metrics context
 */
export function getRequestMetrics(): RequestMetrics | undefined {
  return asyncLocalStorage.getStore()
}

/**
 * Record a DB query in the current request context
 */
export function recordDbQuery(durationMs: number): void {
  const context = asyncLocalStorage.getStore()
  if (context) {
    context.queryCount++
    context.queryTimeMs += durationMs
  }
}

/**
 * Get final metrics for current request
 */
export function finalizeRequestMetrics(): { queryCount: number; queryTimeMs: number; totalTimeMs: number } | null {
  const context = asyncLocalStorage.getStore()
  if (!context) return null

  return {
    queryCount: context.queryCount,
    queryTimeMs: context.queryTimeMs,
    totalTimeMs: Date.now() - context.startTime,
  }
}
