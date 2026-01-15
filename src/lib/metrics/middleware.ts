/**
 * Metrics Middleware
 *
 * Wrap API routes to track per-request metrics.
 * Records DB queries per request and API response time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRequestMetrics, finalizeRequestMetrics } from './request-context'
import { recordMetric } from './buffer'

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<Response> | Response

/**
 * Wrap an API route handler to track metrics
 */
export function withMetrics(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    return withRequestMetrics(async () => {
      const response = await handler(request, context)

      // Record metrics after response
      const metrics = finalizeRequestMetrics()
      if (metrics) {
        recordMetric('db_queries_per_request', metrics.queryCount)
        recordMetric('db_query_time_ms', metrics.queryTimeMs)
        recordMetric('api_response_time_ms', metrics.totalTimeMs)
      }

      return response
    })
  }
}

/**
 * Higher-order function to wrap all methods of a route module
 */
export function wrapRouteWithMetrics(methods: {
  GET?: RouteHandler
  POST?: RouteHandler
  PUT?: RouteHandler
  PATCH?: RouteHandler
  DELETE?: RouteHandler
}) {
  const wrapped: typeof methods = {}

  for (const [method, handler] of Object.entries(methods)) {
    if (handler) {
      wrapped[method as keyof typeof methods] = withMetrics(handler)
    }
  }

  return wrapped
}
