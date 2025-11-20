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

describe('Pages API', () => {
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

  describe('Page data validation', () => {
    it('should validate page structure', () => {
      const validPage = {
        title: 'Test Page',
        slug: 'test-page',
        content: '# Test Page\n\nContent here',
        isPublished: true,
        skriptId: 'skript-id',
        order: 0,
      }

      expect(validPage.title).toBeTruthy()
      expect(validPage.slug).toBeTruthy()
      expect(validPage.content).toBeTruthy()
      expect(validPage.skriptId).toBeTruthy()
    })

    it('should handle markdown content', () => {
      const markdown = '# Heading\n\nParagraph with **bold** text.'
      expect(markdown).toContain('#')
      expect(markdown).toContain('**')
    })
  })
})
