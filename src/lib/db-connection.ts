import { prisma } from './prisma'

export async function withDatabaseConnection<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation()
    return result
  } catch (error) {
    console.error('Database operation failed:', error)
    throw error
  } finally {
    // Don't disconnect here in production, let Prisma manage the pool
    if (process.env.NODE_ENV === 'development') {
      // Only disconnect in development for debugging
    }
  }
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
