'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Users, Share2, FileText, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Permission } from '@/types'

interface ShareSkriptModalProps {
  skript: {
    id: string
    title: string
  }
  collaborators: Array<{
    id: string
    name: string | null
    email: string
    image: string | null
    hasCollectionAccess: boolean
    skriptAccess: {
      skriptId: string
      skriptTitle: string
      permission: string
    }[]
  }>
  onClose: () => void
  onShare: (userId: string, permission: Permission) => Promise<void>
}

export function ShareSkriptModal({ 
  skript, 
  collaborators, 
  onClose, 
  onShare 
}: ShareSkriptModalProps) {
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('')
  const [selectedPermission, setSelectedPermission] = useState<Permission>('viewer')
  const [isSharing, setIsSharing] = useState(false)

  // Filter collaborators who don't already have skript access
  const availableCollaborators = collaborators.filter(c => 
    !c.skriptAccess.some(access => access.skriptId === skript.id)
  )

  const selectedCollaboratorData = availableCollaborators.find(c => c.id === selectedCollaborator)

  const handleShare = async () => {
    if (!selectedCollaborator) return

    setIsSharing(true)
    try {
      await onShare(selectedCollaborator, selectedPermission)
      onClose()
    } catch (error) {
      console.error('Error sharing skript:', error)
      // TODO: Add toast notification
    }
    setIsSharing(false)
  }

  if (availableCollaborators.length === 0) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Skript
            </DialogTitle>
            <DialogDescription>
              Share &quot;{skript.title}&quot; with collaborators
            </DialogDescription>
          </DialogHeader>

          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No collaborators available</p>
            <p className="text-sm text-muted-foreground">
              All your collaborators already have access to this skript.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Skript
          </DialogTitle>
          <DialogDescription>
            Give a collaborator access to &quot;{skript.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Select Collaborator */}
          <div>
            <label className="text-sm font-medium">Select Collaborator</label>
            <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a collaborator to share with..." />
              </SelectTrigger>
              <SelectContent>
                {availableCollaborators.map((collaborator) => (
                  <SelectItem key={collaborator.id} value={collaborator.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        {collaborator.image ? (
                          <Image src={collaborator.image} alt={collaborator.name || ''} width={24} height={24} className="w-6 h-6 rounded-full" />
                        ) : (
                          <Users className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{collaborator.name || 'No name'}</div>
                        <div className="text-xs text-gray-600">{collaborator.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Permission */}
          <div>
            <label className="text-sm font-medium">Permission Level</label>
            <Select value={selectedPermission} onValueChange={(value) => setSelectedPermission(value as Permission)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium">Viewer</div>
                      <div className="text-xs text-muted-foreground">Can view and use content</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="author">
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Co-Author</div>
                      <div className="text-xs text-muted-foreground">Can edit and manage content</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Collaborator Preview */}
          {selectedCollaboratorData && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedCollaboratorData.image ? (
                      <Image src={selectedCollaboratorData.image} alt={selectedCollaboratorData.name || ''} width={40} height={40} className="w-10 h-10 rounded-full" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedCollaboratorData.name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{selectedCollaboratorData.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      {selectedPermission === 'viewer' ? <Eye className="w-3 h-3" /> : <Edit className="w-3 h-3" />}
                      <span className="capitalize">{selectedPermission}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleShare} 
              disabled={!selectedCollaborator || isSharing}
            >
              {isSharing ? 'Sharing...' : 'Share Skript'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}