'use client'

import { useState, useCallback } from 'react'
import { Check, X, Loader2, FileText, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MergeEditor, SimpleEditor } from './merge-editor'
import type { EditProposal, PageEdit } from '@/lib/ai/types'

interface EditProposalReviewProps {
  proposal: EditProposal
  onAccept: (edits: PageEdit[]) => Promise<void>
  onCancel: () => void
}

// Use pageSlug as unique key since pageId can be null for new pages
function getEditKey(edit: PageEdit): string {
  return edit.pageId ?? `new:${edit.pageSlug}`
}

export function EditProposalReview({ proposal, onAccept, onCancel }: EditProposalReviewProps) {
  // Track merged content for each page
  // Editor doc starts with proposed content, user can accept/reject chunks
  const [mergedContent, setMergedContent] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const edit of proposal.edits) {
      initial[getEditKey(edit)] = edit.proposedContent
    }
    return initial
  })

  const [isSaving, setIsSaving] = useState(false)
  const [expandedEdits, setExpandedEdits] = useState<Set<string>>(
    new Set(proposal.edits.map(getEditKey)) // All expanded by default
  )

  const toggleExpanded = (key: string) => {
    const next = new Set(expandedEdits)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setExpandedEdits(next)
  }

  const handleContentChange = useCallback((key: string, content: string) => {
    setMergedContent(prev => ({ ...prev, [key]: content }))
  }, [])

  const handleAccept = async () => {
    setIsSaving(true)
    try {
      // Create edits with the merged content
      const editsToApply = proposal.edits.map(edit => ({
        ...edit,
        proposedContent: mergedContent[getEditKey(edit)] || edit.proposedContent,
      }))
      await onAccept(editsToApply)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3 bg-muted/30">
        <h2 className="text-lg font-semibold mb-1">Proposed Changes</h2>
        <p className="text-sm text-muted-foreground">{proposal.overallSummary}</p>
      </div>

      {/* Edit list */}
      <div className="flex-1 overflow-y-auto">
        {proposal.edits.map((edit) => {
          const key = getEditKey(edit)
          const isExpanded = expandedEdits.has(key)

          return (
            <div key={key} className="border-b">
              {/* Edit header */}
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleExpanded(key)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {edit.isNew ? (
                  <Plus className="h-4 w-4 text-green-500" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {edit.pageTitle}
                    {edit.isNew && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{edit.summary}</div>
                </div>
              </div>

              {/* Merge editor (collapsible) */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  {edit.isNew ? (
                    <SimpleEditor
                      content={mergedContent[key] || edit.proposedContent}
                      onChange={(content) => handleContentChange(key, content)}
                      className="h-[400px] border rounded-md overflow-hidden"
                    />
                  ) : (
                    <MergeEditor
                      original={edit.originalContent}
                      proposed={edit.proposedContent}
                      onChange={(content) => handleContentChange(key, content)}
                      className="h-[400px] border rounded-md overflow-hidden"
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t px-4 py-3 bg-background flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {proposal.edits.length} {proposal.edits.length === 1 ? 'page' : 'pages'} to update
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
