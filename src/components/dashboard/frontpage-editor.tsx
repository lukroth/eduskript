'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialogModal } from '@/components/ui/alert-dialog-modal'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { MarkdownEditor } from '@/components/dashboard/markdown-editor'
import { FileBrowser } from '@/components/dashboard/file-browser'
import { ExcalidrawEditor } from '@/components/dashboard/excalidraw-editor'
import { CollapsibleDrawer } from '@/components/ui/collapsible-drawer'
import { PublishToggle } from '@/components/dashboard/publish-toggle'
import { ArrowLeft, Save, History, Eye, Files } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePublicUrl } from '@/hooks/use-public-url'

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
  // For organization frontpage: pass organization details
  type: 'user' | 'skript' | 'organization'
  frontPage?: {
    id: string
    content: string
    isPublished: boolean
    fileSkriptId?: string | null
  } | null
  skript?: {
    id: string
    slug: string
    title: string
    collectionSlug?: string
  }
  organization?: {
    id: string
    slug: string
    name: string
  }
  backUrl: string
  previewUrl?: string
  hideHeader?: boolean // When true, omit the header (used when parent provides OrgNav)
}

export function FrontPageEditor({
  type,
  frontPage,
  skript,
  organization,
  backUrl,
  previewUrl,
  hideHeader = false
}: FrontPageEditorProps) {
  const [content, setContent] = useState(frontPage?.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [versions, setVersions] = useState<FrontPageVersion[]>([])
  const [frontPageId, setFrontPageId] = useState(frontPage?.id || null)
  const [isPublished, setIsPublished] = useState(frontPage?.isPublished || false)
  const [fileSkriptId, setFileSkriptId] = useState<string | null>(frontPage?.fileSkriptId || null)
  const contentRef = useRef(content)
  const router = useRouter()
  const { data: session } = useSession()
  const pageSlug = (session?.user as { pageSlug?: string })?.pageSlug
  const { isCustomDomain } = usePublicUrl(pageSlug)

  // On custom domains, the proxy prepends the pageSlug, so strip it from previewUrl
  const resolvedPreviewUrl = (() => {
    if (!previewUrl || !isCustomDomain || !pageSlug) return previewUrl
    // Strip leading /{pageSlug} — proxy will add it back
    const prefix = `/${pageSlug}`
    if (previewUrl.startsWith(prefix)) {
      return previewUrl.slice(prefix.length) || '/'
    }
    return previewUrl
  })()
  const alert = useAlertDialog()

  // File list state for file browser
  const [fileList, setFileList] = useState<Array<{
    id: string
    name: string
    size?: number
    url?: string
    isDirectory?: boolean
    contentType?: string
    createdAt: Date
    updatedAt: Date
  }>>([])
  const [fileListLoading, setFileListLoading] = useState(false)

  // Excalidraw editor state
  const [excalidrawOpen, setExcalidrawOpen] = useState(false)
  const [excalidrawInitialData, setExcalidrawInitialData] = useState<{
    name: string
    elements: readonly unknown[]
    appState?: unknown
    files?: Record<string, unknown>  // Embedded images
  } | undefined>(undefined)

  // Effective skript ID for file storage:
  // - Skript FrontPages use their skript's files
  // - User/Org FrontPages use their dedicated fileSkriptId
  const effectiveSkriptId = type === 'skript' ? skript?.id : fileSkriptId

  // Update ref when content changes
  useEffect(() => {
    contentRef.current = content
  }, [content])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  // Fetch file list from API
  const refreshFileList = useCallback(async () => {
    if (!effectiveSkriptId) return

    setFileListLoading(true)
    try {
      const response = await fetch(`/api/upload?skriptId=${effectiveSkriptId}`)
      if (response.ok) {
        const data = await response.json()
        setFileList(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching file list:', error)
    } finally {
      setFileListLoading(false)
    }
  }, [effectiveSkriptId])

  // Fetch file list on mount and when skriptId changes
  useEffect(() => {
    if (effectiveSkriptId) {
      refreshFileList()
    }
  }, [effectiveSkriptId, refreshFileList])

  // Handle file insertion into content
  const handleFileInsert = (file: {
    id: string
    name: string
    url?: string
    isDirectory?: boolean
    position?: number
  }, insertionType: 'embed' | 'link' | 'sql-editor' = 'embed') => {
    if (file.isDirectory) return

    let insertText = ''
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (['sqlite', 'db'].includes(extension || '')) {
      if (insertionType === 'sql-editor') {
        // Start with a query to show all tables - helps users discover the schema
        insertText = `\`\`\`sql editor db="${file.name}"\n-- Show all tables in the database\nSELECT name FROM sqlite_master WHERE type='table' ORDER BY name;\n\`\`\``
      } else {
        insertText = `[${file.name}](${file.url || file.name})`
      }
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      if (insertionType === 'embed') {
        const altText = file.name.replace(/\.[^/.]+$/, '')
        insertText = `![${altText}](${file.name})`
      } else {
        insertText = `[${file.name}](${file.url || file.name})`
      }
    } else if (extension === 'excalidraw') {
      insertText = `![](${file.name})`
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      insertText = `<video controls>\n  <source src="${file.url || file.name}" type="video/${extension}">\n  Your browser does not support the video tag.\n</video>`
    } else if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
      insertText = `<audio controls>\n  <source src="${file.url || file.name}" type="audio/${extension}">\n  Your browser does not support the audio tag.\n</audio>`
    } else {
      insertText = `[${file.name}](${file.url || file.name})`
    }

    if (file.position !== undefined) {
      setContent((prev: string) => prev.slice(0, file.position) + insertText + prev.slice(file.position))
    } else {
      setContent((prev: string) => prev + '\n\n' + insertText)
    }
    setHasUnsavedChanges(true)
  }

  // Handle file renames - update content references
  const handleFileRenamed = (oldFilename: string, newFilename: string) => {
    const updatedContent = content
      .replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${oldFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
        `![$1](${newFilename})`
      )
      .replace(
        new RegExp(`\\[([^\\]]*)\\]\\(${oldFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
        `[$1](${newFilename})`
      )

    if (updatedContent !== content) {
      setContent(updatedContent)
      setHasUnsavedChanges(true)
    }
  }

  // Ensure file storage exists for user/org FrontPages
  const [isCreatingFileStorage, setIsCreatingFileStorage] = useState(false)
  const ensureFileStorage = async () => {
    if (!frontPageId) {
      alert.showError('Please save the front page first before adding files')
      return
    }

    setIsCreatingFileStorage(true)
    try {
      const response = await fetch(`/api/frontpage/${frontPageId}/ensure-file-storage`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setFileSkriptId(data.fileSkriptId)
        // Refresh file list with the new skript
        if (data.fileSkriptId) {
          const filesResponse = await fetch(`/api/upload?skriptId=${data.fileSkriptId}`)
          if (filesResponse.ok) {
            const filesData = await filesResponse.json()
            setFileList(filesData.files || [])
          }
        }
      } else {
        const data = await response.json()
        alert.showError(data.error || 'Failed to enable file storage')
      }
    } catch (error) {
      console.error('Error ensuring file storage:', error)
      alert.showError('Failed to enable file storage')
    } finally {
      setIsCreatingFileStorage(false)
    }
  }

  // Handle Excalidraw save (for both new and existing drawings)
  const handleExcalidrawSave = async (name: string, excalidrawData: string, lightSvg: string, darkSvg: string) => {
    if (!effectiveSkriptId) {
      alert.showError('No file storage available')
      return
    }

    try {
      const response = await fetch('/api/excalidraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          excalidrawData,
          lightSvg,
          darkSvg,
          skriptId: effectiveSkriptId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save drawing')
      }

      // Refresh file list
      refreshFileList()
    } catch (error) {
      console.error('Error saving drawing:', error)
      alert.showError('Failed to save drawing')
    }
  }

  // Handle editing an existing Excalidraw drawing or creating a new one
  const handleExcalidrawEdit = async (file: { id: string; name: string; url?: string; skriptId?: string }) => {
    const targetSkriptId = file.skriptId || effectiveSkriptId
    if (!targetSkriptId) {
      alert.showError('Cannot edit drawing: no file storage')
      return
    }

    try {
      // If file ID is empty, it's a new file - open editor with empty data
      if (!file.id) {
        setExcalidrawInitialData({
          name: file.name,
          elements: [],
          appState: undefined
        })
        setExcalidrawOpen(true)
        return
      }

      // Fetch the existing .excalidraw file data with cache busting
      // Use proxy=true to avoid CORS issues with S3 redirects
      const baseUrl = file.url || `/api/files/${file.id}`
      const separator = baseUrl.includes('?') ? '&' : '?'
      const fileUrl = `${baseUrl}${separator}proxy=true&v=${Date.now()}`
      const response = await fetch(fileUrl)

      if (!response.ok) {
        throw new Error('Failed to fetch drawing data')
      }

      const text = await response.text()
      let data

      // Try parsing as pure JSON first
      try {
        data = JSON.parse(text)
      } catch {
        // Try extracting from Obsidian Excalidraw format: ```json { ... } ```
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[1])
        } else {
          throw new Error('Could not parse Excalidraw data')
        }
      }

      setExcalidrawInitialData({
        name: file.name,
        elements: data.elements || [],
        appState: data.appState,
        files: data.files  // Include embedded images
      })
      setExcalidrawOpen(true)
    } catch (error) {
      console.error('Error loading drawing:', error)
      alert.showError('Failed to load drawing for editing')
    }
  }

  // Adapter for FileBrowser which uses file object (directly compatible now)
  const handleFileBrowserExcalidrawEdit = handleExcalidrawEdit

  // Adapter for MarkdownEditor which uses (filename, fileId) signature
  const handleMarkdownEditorExcalidrawEdit = (filename: string, fileId: string) => {
    handleExcalidrawEdit({ id: fileId, name: filename })
  }

  // Determine the API endpoint based on type
  const getApiEndpoint = useCallback(() => {
    if (type === 'user') {
      return '/api/frontpage/user'
    } else if (type === 'organization') {
      return `/api/frontpage/organization/${organization?.id}`
    } else {
      return `/api/frontpage/skript/${skript?.id}`
    }
  }, [type, skript?.id, organization?.id])

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
       
      loadVersions()
    }
  }, [frontPageId, loadVersions])

  const title = type === 'user'
    ? 'Your Front Page'
    : type === 'organization'
    ? `Front Page: ${organization?.name || 'Organization'}`
    : `Front Page: ${skript?.title || 'Skript'}`

  const description = type === 'user'
    ? 'Customize your public landing page. This is what visitors see when they visit your profile.'
    : type === 'organization'
    ? 'Customize your organization\'s public landing page. This is what visitors see when they visit your organization.'
    : 'Customize the introduction page for this skript. Visitors will see this before the list of pages.'

  return (
    <div className="space-y-6">
      {/* Header - can be hidden when parent provides its own nav */}
      {!hideHeader && (
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

            {resolvedPreviewUrl && (
              <Link
                href={resolvedPreviewUrl}
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
      )}

      {/* Toolbar when header is hidden */}
      {hideHeader && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex gap-2 items-center">
            <Button
              variant={isPublished ? 'default' : 'outline'}
              size="sm"
              onClick={handlePublishToggle}
              title={isPublished ? 'Published - click to unpublish' : 'Draft - click to publish'}
            >
              {isPublished ? 'Published' : 'Draft'}
            </Button>

            {resolvedPreviewUrl && (
              <Link
                href={resolvedPreviewUrl}
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
      )}

      {/* Files Section */}
      {effectiveSkriptId ? (
        <CollapsibleDrawer
          title="Files"
          icon={<Files className="w-5 h-5" />}
          defaultOpen={false}
        >
          <FileBrowser
            skriptId={effectiveSkriptId}
            files={fileList}
            loading={fileListLoading}
            onFileSelect={(file) => {
              handleFileInsert(file)
              refreshFileList()
            }}
            onUploadComplete={refreshFileList}
            onFileRenamed={handleFileRenamed}
            onExcalidrawEdit={handleFileBrowserExcalidrawEdit}
          />
        </CollapsibleDrawer>
      ) : type !== 'skript' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Files className="w-5 h-5" />
              Files
            </CardTitle>
            <CardDescription>
              Enable file storage to upload and embed images in your front page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={ensureFileStorage}
              disabled={isCreatingFileStorage || !frontPageId}
              variant="outline"
              size="sm"
            >
              {isCreatingFileStorage ? 'Enabling...' : 'Enable File Storage'}
            </Button>
            {!frontPageId && (
              <p className="text-xs text-muted-foreground mt-2">
                Save the front page first to enable file storage.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Write your front page content using markdown.
            {effectiveSkriptId ? ' Drag files from the Files drawer to insert them.' : ''} Ctrl+S to save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
            onSave={handleSave}
            skriptId={effectiveSkriptId || undefined}
            domain={(session?.user as { pageSlug?: string })?.pageSlug || undefined}
            fileList={fileList}
            fileListLoading={fileListLoading}
            onFileUpload={refreshFileList}
            onExcalidrawEdit={handleMarkdownEditorExcalidrawEdit}
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

      {/* Excalidraw Editor Modal */}
      {effectiveSkriptId && (
        <ExcalidrawEditor
          open={excalidrawOpen}
          onClose={() => {
            setExcalidrawOpen(false)
            setExcalidrawInitialData(undefined)
          }}
          onSave={handleExcalidrawSave}
          skriptId={effectiveSkriptId}
          initialData={excalidrawInitialData}
        />
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
