'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPermissions } from '@/types'
import { PermissionManager } from './PermissionManager'
import { ShareSkriptModal } from './ShareSkriptModal'
import { Skript, SkriptAuthor, User, Collection, CollectionSkript } from '@prisma/client'

interface SkriptWithData extends Skript {
  authors: (SkriptAuthor & { user: Pick<User, 'id' | 'name' | 'email' | 'image' | 'title'> })[]
  collectionSkripts: (CollectionSkript & { collection: Collection | null })[]
}

interface SkriptAccessManagerProps {
  skript: SkriptWithData
  userPermissions: UserPermissions
  currentUserId: string
  onPermissionChange?: () => void
  /** Render without Card wrapper for embedding in tabs/panels */
  compact?: boolean
}

interface UserForPermissionManager {
  id: string
  name: string | null
  email: string | null
  image: string | null
  title: string | null
}

interface UserPermission {
  user: UserForPermissionManager
  permission: 'author' | 'viewer'
}

interface Collaboration {
  id: string
  createdAt: string
  requester: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  receiver: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface CollaboratorForSharing {
  id: string
  name: string | null
  email: string | null
  image: string | null
  hasCollectionAccess: boolean
  collectionPermission?: string
  skriptAccess: {
    skriptId: string
    skriptTitle: string
    permission: string
  }[]
}

export function SkriptAccessManager({
  skript,
  userPermissions,
  currentUserId,
  onPermissionChange,
  compact = false
}: SkriptAccessManagerProps) {
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [collaborators, setCollaborators] = useState<CollaboratorForSharing[]>([])

  // Check if current user can manage access
  const canManageAccess = userPermissions.canManageAuthors

  const loadCollaborators = useCallback(async () => {
    try {
      const response = await fetch('/api/collaboration-requests')
      const data = await response.json()
      
      if (data.success && data.data.collaborations) {
        const collaborations: Collaboration[] = data.data.collaborations
        
        // Transform collaborations into collaborators with access information
        const collaboratorsData: CollaboratorForSharing[] = collaborations.map(collab => {
          // The collaborator is the other person (not current user)
          const collaborator = collab.requester.id === currentUserId ? collab.receiver : collab.requester
          
          // Check if this collaborator has access to the current skript
          const hasSkriptAccess = skript.authors.some(author => author.user.id === collaborator.id)
          const skriptAuthor = skript.authors.find(author => author.user.id === collaborator.id)
          
          return {
            id: collaborator.id,
            name: collaborator.name,
            email: collaborator.email,
            image: collaborator.image,
            hasCollectionAccess: false, // Not relevant for skript modal
            skriptAccess: hasSkriptAccess ? [{
              skriptId: skript.id,
              skriptTitle: skript.title,
              permission: skriptAuthor?.permission || 'none'
            }] : []
          }
        })
        
        setCollaborators(collaboratorsData)
      }
    } catch (error) {
      console.error('Error loading collaborators:', error)
    }
  }, [skript.authors, currentUserId, skript.id, skript.title])

  const loadPermissions = useCallback(async () => {
    setIsLoading(true)
    try {
      // Convert skript authors to UserPermission format
      const userPermissions: UserPermission[] = skript.authors.map(author => ({
        user: {
          id: author.user.id,
          name: author.user.name,
          email: author.user.email,
          image: author.user.image,
          title: author.user.title
        },
        permission: author.permission as 'author' | 'viewer'
      }))

      setPermissions(userPermissions)
      
      // Also load collaborators
      await loadCollaborators()
    } catch (error) {
      console.error('Error loading permissions:', error)
    }
    setIsLoading(false)
  }, [skript.authors, loadCollaborators])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const handlePermissionChange = async (userId: string, newPermission: 'author' | 'viewer') => {
    try {
      const response = await fetch(`/api/skripts/${skript.id}/authors/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPermission })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update permission')
      }

      // Update the local permissions immediately
      setPermissions(prev => 
        prev.map(p => 
          p.user.id === userId 
            ? { ...p, permission: newPermission }
            : p
        )
      )
      
      // Notify parent if needed
      onPermissionChange?.()
    } catch (error) {
      console.error('Error updating permission:', error)
      throw error
    }
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/skripts/${skript.id}/authors/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove user')
      }

      // Remove the user from the local permissions list immediately
      setPermissions(prev => prev.filter(p => p.user.id !== userId))
      
      // Update collaborators to reflect the removal
      setCollaborators(prev => 
        prev.map(c => 
          c.id === userId 
            ? { ...c, skriptAccess: [] }
            : c
        )
      )
      
      // Notify parent if needed
      onPermissionChange?.()
    } catch (error) {
      console.error('Error removing user:', error)
      throw error
    }
  }

  const handleShare = async (newUserId: string, permission: 'author' | 'viewer') => {
    // Add the user to the skript
    const response = await fetch(`/api/skripts/${skript.id}/authors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: newUserId, permission })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add user')
    }

    // Find the collaborator that was just added
    const newCollaborator = collaborators.find(c => c.id === newUserId)
    if (newCollaborator) {
      // Add them to the permissions list immediately
      const newPermission: UserPermission = {
        user: {
          id: newCollaborator.id,
          name: newCollaborator.name,
          email: newCollaborator.email,
          image: newCollaborator.image,
          title: null // collaborators don't have title in their type
        },
        permission
      }
      setPermissions(prev => [...prev, newPermission])
      
      // Update collaborators to reflect the new access
      setCollaborators(prev => 
        prev.map(c => 
          c.id === newUserId 
            ? { ...c, skriptAccess: [{ skriptId: skript.id, skriptTitle: skript.title, permission }] }
            : c
        )
      )
    }
    setShowShareModal(false)
    onPermissionChange?.()
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading permissions...</div>
  }

  return (
    <div className="space-y-4">
      {/* Permission Manager */}
      <PermissionManager
        title={compact ? undefined : "Access Management"}
        description={compact ? undefined : `Manage who can access "${skript.title}"`}
        contentId={skript.id}
        contentType="skript"
        currentUserId={currentUserId}
        permissions={permissions}
        onPermissionChange={handlePermissionChange}
        onRemoveUser={handleRemoveUser}
        canManageAccess={canManageAccess}
        onShareClick={() => setShowShareModal(true)}
        compact={compact}
      />

      {/* Share Content Modal - Modified to handle skripts */}
      {showShareModal && (
        <ShareSkriptModal
          skript={skript}
          collaborators={collaborators}
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
        />
      )}
    </div>
  )
}