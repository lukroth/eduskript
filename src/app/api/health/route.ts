import { NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/db-connection'

export async function GET() {
  try {
    const isHealthy = await checkDatabaseConnection()
    
    if (!isHealthy) {
      return NextResponse.json(
        { status: 'unhealthy', database: 'disconnected' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    )
  }
}
