import { describe, it, expect } from 'vitest'
import {
  checkCollectionPermissions,
  checkSkriptPermissions,
  checkPagePermissions,
  canRemoveSelfAsAuthor,
  getCollectionViewers,
  getSkriptViewers,
} from '@/lib/permissions'

describe('lib/permissions', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  }

  const mockOtherUser = {
    id: 'user-2',
    email: 'other@example.com',
    name: 'Other User',
  }

  describe('checkCollectionPermissions', () => {
    it('should grant edit permissions to author', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkCollectionPermissions(mockUser.id, authors)

      expect(result.canEdit).toBe(true)
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(true)
      expect(result.permission).toBe('author')
    })

    it('should grant view-only permissions to viewer', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkCollectionPermissions(mockUser.id, authors)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBe('viewer')
    })

    it('should deny all permissions to non-author', () => {
      const authors = [
        {
          id: '1',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockOtherUser,
        },
      ]

      const result = checkCollectionPermissions(mockUser.id, authors)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(false)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBeUndefined()
    })
  })

  describe('checkSkriptPermissions', () => {
    it('should grant edit permissions to direct skript author', () => {
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkSkriptPermissions(mockUser.id, skriptAuthors)

      expect(result.canEdit).toBe(true)
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(true)
      expect(result.permission).toBe('author')
    })

    it('should grant view-only to skript viewer', () => {
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkSkriptPermissions(mockUser.id, skriptAuthors)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBe('viewer')
    })

    it('should grant view permissions to collection author (inherited)', () => {
      const skriptAuthors: any[] = []
      const collectionAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkSkriptPermissions(mockUser.id, skriptAuthors, collectionAuthors)

      expect(result.canEdit).toBe(false) // Collection authors can't edit skripts
      expect(result.canView).toBe(true)  // But they can view them
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBe('viewer')
    })

    it('should deny all permissions when not authorized', () => {
      const skriptAuthors: any[] = []
      const collectionAuthors: any[] = []

      const result = checkSkriptPermissions(mockUser.id, skriptAuthors, collectionAuthors)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(false)
      expect(result.canManageAuthors).toBe(false)
    })
  })

  describe('checkPagePermissions', () => {
    it('should grant edit permissions to direct page author', () => {
      const pageAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          pageId: 'page-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkPagePermissions(mockUser.id, pageAuthors, [], [])

      expect(result.canEdit).toBe(true)
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(true)
      expect(result.permission).toBe('author')
    })

    it('should grant edit permissions to skript author (inherited)', () => {
      const pageAuthors: any[] = []
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkPagePermissions(mockUser.id, pageAuthors, skriptAuthors, [])

      expect(result.canEdit).toBe(true) // Skript authors can edit pages
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(true)
      expect(result.permission).toBe('author')
    })

    it('should grant view permissions to collection author (inherited)', () => {
      const pageAuthors: any[] = []
      const skriptAuthors: any[] = []
      const collectionAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkPagePermissions(mockUser.id, pageAuthors, skriptAuthors, collectionAuthors)

      expect(result.canEdit).toBe(false) // Collection authors can't edit pages
      expect(result.canView).toBe(true)  // But they can view them
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBe('viewer')
    })

    it('should prioritize page permissions over skript permissions', () => {
      const pageAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          pageId: 'page-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]
      const skriptAuthors = [
        {
          id: '2',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkPagePermissions(mockUser.id, pageAuthors, skriptAuthors, [])

      // Page-level permission should override skript-level
      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(true)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBe('viewer')
    })

    it('should grant view-only to skript viewer even if collection author', () => {
      const pageAuthors: any[] = []
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]
      const collectionAuthors = [
        {
          id: '2',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkPagePermissions(mockUser.id, pageAuthors, skriptAuthors, collectionAuthors)

      // Skript viewer permission should take precedence over collection
      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(true)
      expect(result.permission).toBe('viewer')
    })

    it('should deny all permissions when user has no access at any level', () => {
      const pageAuthors: any[] = []
      const skriptAuthors: any[] = []
      const collectionAuthors: any[] = []

      const result = checkPagePermissions(mockUser.id, pageAuthors, skriptAuthors, collectionAuthors)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(false)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBeUndefined()
    })
  })

  describe('checkCollectionPermissions - Edge Cases', () => {
    it('should deny permissions when authors array is empty', () => {
      const result = checkCollectionPermissions(mockUser.id, [])

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(false)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBeUndefined()
    })

    it('should handle multiple authors correctly', () => {
      const authors = [
        {
          id: '1',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockOtherUser,
        },
        {
          id: '2',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkCollectionPermissions(mockUser.id, authors)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(true)
      expect(result.permission).toBe('viewer')
    })
  })

  describe('checkSkriptPermissions - Edge Cases', () => {
    it('should handle empty arrays correctly', () => {
      const result = checkSkriptPermissions(mockUser.id, [], [])

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(false)
      expect(result.canManageAuthors).toBe(false)
      expect(result.permission).toBeUndefined()
    })

    it('should prioritize direct skript permission over collection permission', () => {
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]
      const collectionAuthors = [
        {
          id: '2',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = checkSkriptPermissions(mockUser.id, skriptAuthors, collectionAuthors)

      // Direct skript permission should be used
      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(true)
      expect(result.permission).toBe('viewer')
    })

    it('should work when collectionAuthors is undefined', () => {
      const skriptAuthors: any[] = []

      const result = checkSkriptPermissions(mockUser.id, skriptAuthors, undefined)

      expect(result.canEdit).toBe(false)
      expect(result.canView).toBe(false)
      expect(result.permission).toBeUndefined()
    })
  })

  describe('canRemoveSelfAsAuthor', () => {
    it('should allow removal when user is author and there are other authors', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = canRemoveSelfAsAuthor(mockUser.id, authors)

      expect(result).toBe(true)
    })

    it('should prevent removal when user is the only author', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = canRemoveSelfAsAuthor(mockUser.id, authors)

      expect(result).toBe(false)
    })

    it('should prevent removal when user is a viewer', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = canRemoveSelfAsAuthor(mockUser.id, authors)

      expect(result).toBe(false)
    })

    it('should return false when user is not in authors list', () => {
      const authors = [
        {
          id: '1',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = canRemoveSelfAsAuthor(mockUser.id, authors)

      expect(result).toBe(false)
    })

    it('should handle empty authors array', () => {
      const result = canRemoveSelfAsAuthor(mockUser.id, [])

      expect(result).toBe(false)
    })

    it('should handle single author array correctly', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = canRemoveSelfAsAuthor(mockUser.id, authors)

      expect(result).toBe(false) // Last author cannot remove themselves
    })

    it('should work with multiple authors of mixed permissions', () => {
      const authors = [
        {
          id: '1',
          userId: 'user-3',
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '4',
          userId: 'user-4',
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = canRemoveSelfAsAuthor(mockUser.id, authors)

      expect(result).toBe(true) // There are 2 authors total, so can remove
    })
  })

  describe('getCollectionViewers', () => {
    it('should return all users from collection authors', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
        {
          id: '2',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockOtherUser,
        },
      ]

      const result = getCollectionViewers(authors)

      expect(result).toHaveLength(2)
      expect(result).toContainEqual(mockUser)
      expect(result).toContainEqual(mockOtherUser)
    })

    it('should return empty array when no authors', () => {
      const result = getCollectionViewers([])

      expect(result).toEqual([])
    })

    it('should handle single author', () => {
      const authors = [
        {
          id: '1',
          userId: mockUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = getCollectionViewers(authors)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockUser)
    })
  })

  describe('getSkriptViewers', () => {
    it('should combine skript and collection authors', () => {
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]
      const collectionAuthors = [
        {
          id: '2',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockOtherUser,
        },
      ]

      const result = getSkriptViewers(skriptAuthors, collectionAuthors)

      expect(result).toHaveLength(2)
      expect(result).toContainEqual(mockUser)
      expect(result).toContainEqual(mockOtherUser)
    })

    it('should deduplicate users who are in both skript and collection authors', () => {
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]
      const collectionAuthors = [
        {
          id: '2',
          userId: mockUser.id, // Same user
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = getSkriptViewers(skriptAuthors, collectionAuthors)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockUser)
    })

    it('should return only skript authors when no collection authors', () => {
      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
      ]

      const result = getSkriptViewers(skriptAuthors, [])

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockUser)
    })

    it('should return only collection authors when no skript authors', () => {
      const collectionAuthors = [
        {
          id: '1',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockOtherUser,
        },
      ]

      const result = getSkriptViewers([], collectionAuthors)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockOtherUser)
    })

    it('should return empty array when both arrays are empty', () => {
      const result = getSkriptViewers([], [])

      expect(result).toEqual([])
    })

    it('should handle multiple users in both arrays with proper deduplication', () => {
      const user3 = { id: 'user-3', email: 'user3@example.com', name: 'User 3' }
      const user4 = { id: 'user-4', email: 'user4@example.com', name: 'User 4' }

      const skriptAuthors = [
        {
          id: '1',
          userId: mockUser.id,
          skriptId: 'skript-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
        {
          id: '2',
          userId: user3.id,
          skriptId: 'skript-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: user3,
        },
      ]
      const collectionAuthors = [
        {
          id: '3',
          userId: mockUser.id, // Duplicate
          collectionId: 'col-1',
          permission: 'author' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockUser,
        },
        {
          id: '4',
          userId: mockOtherUser.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: mockOtherUser,
        },
        {
          id: '5',
          userId: user4.id,
          collectionId: 'col-1',
          permission: 'viewer' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: user4,
        },
      ]

      const result = getSkriptViewers(skriptAuthors, collectionAuthors)

      expect(result).toHaveLength(4) // mockUser, user3, mockOtherUser, user4
      expect(result).toContainEqual(mockUser)
      expect(result).toContainEqual(user3)
      expect(result).toContainEqual(mockOtherUser)
      expect(result).toContainEqual(user4)
    })
  })
})
