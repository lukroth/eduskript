import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db-connection module
vi.mock('@/lib/db-connection', () => ({
  checkDatabaseConnection: vi.fn(),
}))

import { checkDatabaseConnection } from '@/lib/db-connection'
import { GET } from '@/app/api/health/route'

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      vi.mocked(checkDatabaseConnection).mockResolvedValue(true)

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.database).toBe('connected')
      expect(data.timestamp).toBeDefined()
    })

    it('should return timestamp in ISO format', async () => {
      vi.mocked(checkDatabaseConnection).mockResolvedValue(true)

      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should return 503 when database is disconnected', async () => {
      vi.mocked(checkDatabaseConnection).mockResolvedValue(false)

      const response = await GET()

      expect(response.status).toBe(503)
      const data = await response.json()
      expect(data.status).toBe('unhealthy')
      expect(data.database).toBe('disconnected')
    })

    it('should return 500 when health check throws error', async () => {
      vi.mocked(checkDatabaseConnection).mockRejectedValue(
        new Error('Connection failed')
      )

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.status).toBe('error')
      expect(data.message).toBe('Health check failed')
    })
  })
})
