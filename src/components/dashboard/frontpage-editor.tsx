'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialogModal } from '@/components/ui/alert-dialog-modal'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { MarkdownEditor } from '@/components/dashboard/markdown-editor'
import { CollapsibleDrawer } from '@/components/ui/collapsible-drawer'
import { PublishToggle } from '@/components/dashboard/publish-toggle'
import { ArrowLeft, Save, History, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface FrontPageVersion {
  id: string
  content: string
  version: number
  changeLog?: string
  createdAt: string
  author: {
    name?: string
    email: string
  }
}

interface FrontPageEditorProps {
  // For user frontpage: pass userId and no skript
  // For skript frontpage: pass skript details
  type: 'user' | 'skript'
  frontPage?: {
    id: string
    content: string
    isPublished: boolean
  } | null
  skript?: {
    id: string
    slug: string
    title: string
    collectionSlug?: string
  }
  backUrl: string
  previewUrl?: string
}

export function FrontPageEditor({
  type,
  frontPage,
  skript,
  backUrl,
  previewUrl
}: FrontPageEditorProps) {
  const [content, setContent] = useState(frontPage?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [versions, setVersions] = useState<FrontPageVersion[]>([])
  const [frontPageId, setFrontPageId] = useState(frontPage?.id || null)
  const [isPublished, setIsPublished] = useState(frontPage?.isPublished || false)
  const contentRef = useRef(content)
  const router = useRouter()
  const { data: session } = useSession()
  const alert = useAlertDialog()

  // Update ref when content changes
  useEffect(() => {
    contentRef.current = content
  }, [content])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  // Determine the API endpoint based on type
  const getApiEndpoint = useCallback(() => {
    if (type === 'user') {
      return '/api/frontpage/user'
    } else {
      return `/api/frontpage/skript/${skript?.id}`
    }
  }, [type, skript?.id])

  // Load version history
  const loadVersions = useCallback(async () => {
    if (!frontPageId) return

    try {
      const response = await fetch(`/api/frontpage/${frontPageId}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
      } else {
        console.error('Failed to load versions')
      }
    } catch (error) {
      console.error('Error loading versions:', error)
    }
  }, [frontPageId])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentRef.current,
          isPublished
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLastSaved(new Date())
        setHasUnsavedChanges(false)

        // If this was the first save, update the frontPageId
        if (data.frontPage?.id && !frontPageId) {
          setFrontPageId(data.frontPage.id)
        }

        // Reload versions to show the new version
        if (data.versionCreated) {
          loadVersions()
        }
      } else {
        const data = await response.json()
        alert.showError(data.error || 'Failed to save front page')
      }
    } catch (error) {
      console.error('Error saving front page:', error)
      alert.showError('Failed to save front page')
    }
    setIsSaving(false)
  }, [getApiEndpoint, isPublished, frontPageId, loadVersions, alert])

  // Handle publish toggle
  const handlePublishToggle = async () => {
    const newPublishedState = !isPublished
    setIsPublished(newPublishedState)
    setHasUnsavedChanges(true)

    // Auto-save when toggling publish state
    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentRef.current,
          isPublished: newPublishedState
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLastSaved(new Date())
        setHasUnsavedChanges(false)

        if (data.frontPage?.id && !frontPageId) {
          setFrontPageId(data.frontPage.id)
        }
      } else {
        // Revert on error
        setIsPublished(!newPublishedState)
        const data = await response.json()
        alert.showError(data.error || 'Failed to update publish state')
      }
    } catch (error) {
      setIsPublished(!newPublishedState)
      console.error('Error updating publish state:', error)
      alert.showError('Failed to update publish state')
    }
  }

  // Handle version restoration
  const handleRestoreVersion = async (versionId: string, versionContent: string) => {
    if (!frontPageId) return

    try {
      const response = await fetch(`/api/frontpage/${frontPageId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setContent(versionContent)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        loadVersions()
      } else {
        const data = await response.json()
        alert.showError(data.error || 'Failed to restore version')
      }
    } catch (error) {
      console.error('Error restoring version:', error)
      alert.showError('Failed to restore version')
    }
  }

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        handleSave()
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [hasUnsavedChanges, handleSave])

  // Save with Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // Load version history on mount and when frontPageId changes
  useEffect(() => {
    if (frontPageId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch is acceptable
      loadVersions()
    }
  }, [frontPageId, loadVersions])

  const title = type === 'user'
    ? 'Your Front Page'
    : `Front Page: ${skript?.title || 'Skript'}`

  const description = type === 'user'
    ? 'Customize your public landing page. This is what visitors see when they visit your profile.'
    : 'Customize the introduction page for this skript. Visitors will see this before the list of pages.'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* Custom Publish Toggle */}
          <Button
            variant={isPublished ? 'default' : 'outline'}
            size="sm"
            onClick={handlePublishToggle}
            title={isPublished ? 'Published - click to unpublish' : 'Draft - click to publish'}
          >
            {isPublished ? 'Published' : 'Draft'}
          </Button>

          {previewUrl && (
            <Link
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
            >
              <Button variant="ghost" size="sm" title="Preview front page">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="relative"
            title={isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'No changes to save'}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
            {hasUnsavedChanges && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
            )}
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Write your front page content using markdown. Ctrl+S to save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
            onSave={handleSave}
            skriptId={skript?.id}
            domain={(session?.user as { pageSlug?: string })?.pageSlug || undefined}
            fileList={[]}
            fileListLoading={false}
          />
        </CardContent>
      </Card>

      {/* Version History - Only show if we have a frontPageId */}
      {frontPageId && versions.length > 0 && (
        <CollapsibleDrawer
          title={
            <div className="flex items-center gap-2">
              <span>History</span>
              {lastSaved && (
                <span className="text-xs text-muted-foreground font-normal">
                  Last saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          }
          icon={<History className="w-5 h-5" />}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <div className="font-medium">Version {version.version}</div>
                  <div className="text-xs text-muted-foreground">
                    {version.author?.name || version.author?.email} • {new Date(version.createdAt).toLocaleString()}
                    {version.changeLog && ` • ${version.changeLog}`}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreVersion(version.id, version.content)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </CollapsibleDrawer>
      )}

      <AlertDialogModal
        open={alert.open}
        onOpenChange={alert.setOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />
    </div>
  )
}
