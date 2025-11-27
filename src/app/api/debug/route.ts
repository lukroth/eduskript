import { NextRequest, NextResponse } from 'next/server'

// Only available in development
const isDev = process.env.NODE_ENV === 'development'

// Store debug reports in memory (cleared on server restart)
const debugReports: Array<{
  timestamp: string
  userAgent: string
  measurements: Record<string, string>
  id: string
}> = []

// GET - retrieve all debug reports
export async function GET() {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  // Also log to console for easy viewing
  console.log('\n========== DEBUG REPORTS ==========')
  debugReports.forEach((report, i) => {
    console.log(`\n--- Report ${i + 1} (${report.timestamp}) ---`)
    console.log(`Device: ${report.userAgent.slice(0, 80)}...`)
    Object.entries(report.measurements).forEach(([key, value]) => {
      const color = key === 'OVERFLOW' && value !== 'none' ? '\x1b[31m' : '\x1b[0m'
      console.log(`${color}  ${key}: ${value}\x1b[0m`)
    })
  })
  console.log('\n===================================\n')

  return NextResponse.json({
    count: debugReports.length,
    reports: debugReports
  })
}

// POST - receive debug report from a device
export async function POST(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const data = await request.json()
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const report = {
      timestamp: new Date().toISOString(),
      userAgent,
      measurements: data.measurements || {},
      id: Math.random().toString(36).slice(2, 8)
    }

    debugReports.push(report)

    // Keep only last 50 reports
    if (debugReports.length > 50) {
      debugReports.shift()
    }


    return NextResponse.json({ success: true, id: report.id })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
}

// DELETE - clear all reports
export async function DELETE() {
  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  debugReports.length = 0
  console.log('🗑️ Debug reports cleared')
  return NextResponse.json({ success: true })
}
