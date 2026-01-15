/**
 * Metrics Aggregation & Cleanup
 *
 * With normalized hourly storage, SQL handles aggregation on query.
 * This module provides cleanup of old data and query helpers.
 */

import { prisma } from '@/lib/prisma'

/**
 * Clean up old metric points
 * Call this daily via cron
 */
export async function cleanupOldMetrics(retentionDays = 30): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const result = await prisma.metricPoint.deleteMany({
    where: {
      timestamp: { lt: cutoff },
    },
  })

  if (result.count > 0) {
    console.log(`[Metrics] Cleaned up ${result.count} old metric points`)
  }

  return result.count
}

/**
 * Get aggregated metrics for a time range using SQL
 */
export async function getAggregatedMetrics(
  since: Date,
  until?: Date
): Promise<Array<{ name: string; avg: number; count: number }>> {
  const result = await prisma.$queryRaw<Array<{ name: string; weighted_avg: number; total_count: bigint }>>`
    SELECT
      name,
      SUM(avg * count) / NULLIF(SUM(count), 0) as weighted_avg,
      SUM(count) as total_count
    FROM metric_points
    WHERE timestamp >= ${since}
    ${until ? prisma.$queryRaw`AND timestamp < ${until}` : prisma.$queryRaw``}
    GROUP BY name
    ORDER BY name
  `

  return result.map(r => ({
    name: r.name,
    avg: r.weighted_avg ?? 0,
    count: Number(r.total_count),
  }))
}

/**
 * Get time series data for a specific metric
 */
export async function getMetricTimeSeries(
  metricName: string,
  since: Date,
  until?: Date
): Promise<Array<{ timestamp: Date; avg: number; count: number }>> {
  const points = await prisma.metricPoint.findMany({
    where: {
      name: metricName,
      timestamp: {
        gte: since,
        ...(until && { lt: until }),
      },
    },
    orderBy: { timestamp: 'asc' },
    select: {
      timestamp: true,
      avg: true,
      count: true,
    },
  })

  return points
}

/**
 * Get daily aggregates for a metric (for long-term charts)
 */
export async function getMetricDailyAggregates(
  metricName: string,
  days = 7
): Promise<Array<{ date: string; avg: number; count: number }>> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const result = await prisma.$queryRaw<Array<{ day: Date; weighted_avg: number; total_count: bigint }>>`
    SELECT
      DATE_TRUNC('day', timestamp) as day,
      SUM(avg * count) / NULLIF(SUM(count), 0) as weighted_avg,
      SUM(count) as total_count
    FROM metric_points
    WHERE name = ${metricName}
    AND timestamp >= ${since}
    GROUP BY DATE_TRUNC('day', timestamp)
    ORDER BY day
  `

  return result.map(r => ({
    date: r.day.toISOString().split('T')[0],
    avg: r.weighted_avg ?? 0,
    count: Number(r.total_count),
  }))
}

/**
 * Run cleanup task - call from cron
 */
export async function runAggregationTasks(): Promise<void> {
  try {
    await cleanupOldMetrics()
  } catch (error) {
    console.error('[Metrics] Cleanup task failed:', error)
  }
}
