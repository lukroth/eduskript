/**
 * Metrics System
 *
 * A lightweight, future-proof metrics system for tracking site-wide statistics.
 *
 * Usage:
 *
 * 1. Server-side recording:
 *    import { recordMetric } from '@/lib/metrics'
 *    recordMetric('db_queries_per_request', 5)
 *
 * 2. Wrap API routes for automatic tracking:
 *    import { withMetrics } from '@/lib/metrics'
 *    export const GET = withMetrics(async (req) => { ... })
 *
 * 3. Client-side recording:
 *    fetch('/api/metrics', {
 *      method: 'POST',
 *      body: JSON.stringify({ name: 'page_load_time_ms', value: 1234 })
 *    })
 *
 * 4. Add new metrics by updating registry.ts
 */

export { recordMetric, getRecentMinutes, startMetricsFlush, stopMetricsFlush, getActiveMetricNames } from './buffer'
export { withMetrics, wrapRouteWithMetrics } from './middleware'
export {
  METRICS,
  type MetricName,
  isValidMetricName,
  isClientMetric,
  isServerMetric,
  formatMetricName,
  getMetricUnit,
} from './registry'
export { withRequestMetrics, getRequestMetrics, finalizeRequestMetrics } from './request-context'
export {
  cleanupOldMetrics,
  getAggregatedMetrics,
  getMetricTimeSeries,
  getMetricDailyAggregates,
  runAggregationTasks,
} from './aggregation'
