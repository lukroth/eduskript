import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authOptions } from '@/lib/auth'
import type { User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

describe('lib/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authOptions', () => {
    it('should have correct configuration', () => {
      expect(authOptions.session.strategy).toBe('jwt')
      expect(authOptions.pages?.signIn).toBe('/auth/signin')
    })

    it('should have providers configured', () => {
      expect(authOptions.providers).toBeDefined()
      expect(authOptions.providers.length).toBeGreaterThan(0)
    })

    it('should have JWT and session callbacks defined', () => {
      expect(authOptions.callbacks?.jwt).toBeDefined()
      expect(authOptions.callbacks?.session).toBeDefined()
    })
  })

  describe('CredentialsProvider - authorize', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      hashedPassword: '$2a$10$hashedpassword',
      emailVerified: new Date(),
      image: null,
      subdomain: 'test',
      title: 'Teacher',
      isAdmin: false,
      verified: true,
      requirePasswordReset: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Get the authorize function from credentials provider
    const getAuthorize = () => {
      const provider = authOptions.providers[0] as any
      return provider.options?.authorize || provider.authorize
    }

    it('should return null when email is missing', async () => {
      const authorize = getAuthorize()

      const result = await authorize(
        { password: 'password123' },
        {} as any
      )

      expect(result).toBeNull()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should return null when password is missing', async () => {
      const authorize = getAuthorize()

      const result = await authorize(
        { email: 'test@example.com' },
        {} as any
      )

      expect(result).toBeNull()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should return null when both email and password are missing', async () => {
      const authorize = getAuthorize()

      const result = await authorize({}, {} as any)

      expect(result).toBeNull()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should throw error when user does not exist', async () => {
      const authorize = getAuthorize()
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      await expect(
        authorize({
          email: 'nonexistent@example.com',
          password: 'password123',
        }, {} as any)
      ).rejects.toThrow('Invalid credentials')

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      })
    })

    it('should throw error when user has no hashed password', async () => {
      const authorize = getAuthorize()
      const userWithoutPassword = { ...mockUser, hashedPassword: null }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userWithoutPassword)

      await expect(
        authorize({
          email: 'test@example.com',
          password: 'password123',
        }, {} as any)
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw error when email is not verified', async () => {
      const authorize = getAuthorize()
      const unverifiedUser = { ...mockUser, emailVerified: null }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(unverifiedUser)

      await expect(
        authorize({
          email: 'test@example.com',
          password: 'password123',
        }, {} as any)
      ).rejects.toThrow('Please verify your email address before signing in.')

      expect(bcrypt.compare).not.toHaveBeenCalled()
    })

    it('should throw error when password is invalid', async () => {
      const authorize = getAuthorize()
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never)

      await expect(
        authorize({
          email: 'test@example.com',
          password: 'wrongpassword',
        }, {} as any)
      ).rejects.toThrow('Invalid credentials')

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.hashedPassword
      )
    })

    it('should successfully authorize with valid credentials', async () => {
      const authorize = getAuthorize()
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

      const result = await authorize({
        email: 'test@example.com',
        password: 'correctpassword',
      }, {} as any)

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        image: mockUser.image,
      })

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correctpassword',
        mockUser.hashedPassword
      )
    })

    it('should handle database errors gracefully', async () => {
      const authorize = getAuthorize()
      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      await expect(
        authorize({
          email: 'test@example.com',
          password: 'password123',
        }, {} as any)
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle bcrypt errors gracefully', async () => {
      const authorize = getAuthorize()
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)
      vi.mocked(bcrypt.compare).mockRejectedValueOnce(
        new Error('Bcrypt error') as never
      )

      await expect(
        authorize({
          email: 'test@example.com',
          password: 'password123',
        }, {} as any)
      ).rejects.toThrow('Bcrypt error')
    })
  })

  describe('JWT callback', () => {
    const jwtCallback = authOptions.callbacks!.jwt!

    const mockDbUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
      subdomain: 'testuser',
      title: 'Math Teacher',
      isAdmin: false,
      requirePasswordReset: false,
    }

    it('should add user data to token on sign-in', async () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      }

      const token: JWT = {}

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockDbUser as any)

      const result = await jwtCallback({ token, user, trigger: undefined as any })

      expect(result.id).toBe('user-1')
      expect(result.subdomain).toBe('testuser')
      expect(result.title).toBe('Math Teacher')
      expect(result.isAdmin).toBe(false)
      expect(result.requirePasswordReset).toBe(false)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          subdomain: true,
          title: true,
          isAdmin: true,
          requirePasswordReset: true,
        },
      })
    })

    it('should handle missing user during sign-in', async () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      }

      const token: JWT = {}

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      const result = await jwtCallback({ token, user, trigger: undefined as any })

      // Should still add id to token even if db fetch fails
      expect(result.id).toBe('user-1')
      expect(result.subdomain).toBeUndefined()
    })

    it('should not fetch user data when no user provided and no update trigger', async () => {
      const token: JWT = { id: 'user-1' }

      const result = await jwtCallback({ token, trigger: undefined as any })

      expect(result).toEqual(token)
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should refetch user data on update trigger', async () => {
      const token: JWT = { id: 'user-1', subdomain: 'oldsubdomain' }

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        ...mockDbUser,
        subdomain: 'newsubdomain',
      } as any)

      const result = await jwtCallback({ token, trigger: 'update' })

      expect(result.subdomain).toBe('newsubdomain')
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          subdomain: true,
          title: true,
          isAdmin: true,
          requirePasswordReset: true,
        },
      })
    })

    it('should handle missing user on update trigger', async () => {
      const token: JWT = { id: 'user-1', subdomain: 'testuser' }

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      const result = await jwtCallback({ token, trigger: 'update' })

      // Should keep existing token data when user not found
      expect(result.subdomain).toBe('testuser')
    })

    it('should not update on non-update triggers', async () => {
      const token: JWT = { id: 'user-1', subdomain: 'testuser' }

      // @ts-ignore - testing with custom trigger
      const result = await jwtCallback({ token, trigger: 'signIn' })

      expect(result).toEqual(token)
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should update all user properties on update trigger', async () => {
      const token: JWT = {
        id: 'user-1',
        subdomain: 'old',
        title: 'Old Title',
        isAdmin: false,
        requirePasswordReset: false,
      }

      const updatedUser = {
        ...mockDbUser,
        subdomain: 'new',
        title: 'New Title',
        isAdmin: true,
        requirePasswordReset: true,
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(updatedUser as any)

      const result = await jwtCallback({ token, trigger: 'update' })

      expect(result.subdomain).toBe('new')
      expect(result.title).toBe('New Title')
      expect(result.isAdmin).toBe(true)
      expect(result.requirePasswordReset).toBe(true)
    })

    it('should handle database errors during token creation', async () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      }

      const token: JWT = {}

      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(
        new Error('Database error')
      )

      await expect(
        jwtCallback({ token, user, trigger: undefined as any })
      ).rejects.toThrow('Database error')
    })
  })

  describe('Session callback', () => {
    const sessionCallback = authOptions.callbacks!.session!

    it('should map token data to session', async () => {
      const token: JWT = {
        id: 'user-1',
        subdomain: 'testuser',
        title: 'Math Teacher',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
        isAdmin: false,
        requirePasswordReset: false,
      }

      const session = {
        user: {
          id: '',
          subdomain: '',
          title: '',
          name: '',
          email: '',
          image: '',
          isAdmin: false,
          requirePasswordReset: false,
        },
        expires: '2024-12-31',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.id).toBe('user-1')
      expect(result.user.subdomain).toBe('testuser')
      expect(result.user.title).toBe('Math Teacher')
      expect(result.user.name).toBe('Test User')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.image).toBe('https://example.com/avatar.jpg')
      expect(result.user.isAdmin).toBe(false)
      expect(result.user.requirePasswordReset).toBe(false)
    })

    it('should handle missing token gracefully', async () => {
      const session = {
        user: {
          id: 'existing-id',
          subdomain: 'existing',
          title: 'Existing',
          name: 'Existing User',
          email: 'existing@example.com',
          image: null,
          isAdmin: false,
          requirePasswordReset: false,
        },
        expires: '2024-12-31',
      }

      const result = await sessionCallback({ session, token: {} as JWT })

      // Should return session as-is when token is empty
      expect(result).toEqual(session)
    })

    it('should handle missing session.user gracefully', async () => {
      const token: JWT = {
        id: 'user-1',
        subdomain: 'testuser',
      }

      const session = {
        expires: '2024-12-31',
      } as any

      const result = await sessionCallback({ session, token })

      // Should return session unchanged when user is missing
      expect(result).toEqual(session)
    })

    it('should handle undefined token properties', async () => {
      const token: JWT = {
        id: 'user-1',
        // Missing other properties
      }

      const session = {
        user: {
          id: '',
          subdomain: '',
          title: '',
          name: '',
          email: '',
          image: '',
          isAdmin: false,
          requirePasswordReset: false,
        },
        expires: '2024-12-31',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.id).toBe('user-1')
      // Undefined values get cast to string 'undefined'
      expect(result.user.subdomain).toBe(undefined as any)
      expect(result.user.title).toBe(undefined as any)
    })

    it('should handle boolean values correctly', async () => {
      const token: JWT = {
        id: 'user-1',
        isAdmin: true,
        requirePasswordReset: true,
      }

      const session = {
        user: {
          id: '',
          subdomain: '',
          title: '',
          name: '',
          email: '',
          image: '',
          isAdmin: false,
          requirePasswordReset: false,
        },
        expires: '2024-12-31',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.isAdmin).toBe(true)
      expect(result.user.requirePasswordReset).toBe(true)
    })

    it('should preserve session structure', async () => {
      const token: JWT = {
        id: 'user-1',
        name: 'Test User',
      }

      const session = {
        user: {
          id: '',
          subdomain: '',
          title: '',
          name: '',
          email: '',
          image: '',
          isAdmin: false,
          requirePasswordReset: false,
        },
        expires: '2024-12-31',
      }

      const result = await sessionCallback({ session, token })

      expect(result.expires).toBe('2024-12-31')
      expect(result.user).toBeDefined()
    })
  })
})
