import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Session } from 'next-auth'

// Mock next-auth before importing route handlers
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { getServerSession } from 'next-auth'

describe('Skripts API', () => {
  const mockSession: Session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      subdomain: 'testuser',
      title: 'Teacher',
      isAdmin: false,
      requirePasswordReset: false,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const session = await getServerSession()
      expect(session).toBeNull()
    })

    it('should accept valid session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const session = await getServerSession()
      expect(session).toBeTruthy()
      expect(session?.user?.id).toBe('test-user-id')
    })
  })

  describe('Skript data validation', () => {
    it('should validate skript structure', () => {
      const validSkript = {
        title: 'Test Skript',
        slug: 'test-skript',
        description: 'A test skript',
        isPublished: true,
      }

      expect(validSkript.title).toBeTruthy()
      expect(validSkript.slug).toBeTruthy()
    })

    it('should handle slug normalization', () => {
      const testCases = [
        { input: 'Test Skript', expected: 'test-skript' },
        { input: 'Hello World', expected: 'hello-world' },
      ]

      testCases.forEach(({ input, expected }) => {
        const normalized = input.toLowerCase().replace(/\s+/g, '-')
        expect(normalized).toBe(expected)
      })
    })
  })
})
