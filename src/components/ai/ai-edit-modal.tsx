'use client'

import { useState } from 'react'
import { Wand2, Loader2, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAIEdit } from '@/hooks/use-ai-edit'
import { EditProposalReview } from './edit-proposal-review'
import type { PageEdit } from '@/lib/ai/types'

interface AIEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skriptId: string
  skriptTitle: string
  pageId?: string
  pageTitle?: string
  /** Current editor content (may have unsaved changes) */
  currentContent?: string
  /** Called after edits are applied, with the new content for the focused page */
  onEditsApplied?: (newContent?: string) => void
}

export function AIEditModal({
  open,
  onOpenChange,
  skriptId,
  skriptTitle,
  pageId,
  pageTitle,
  currentContent,
  onEditsApplied,
}: AIEditModalProps) {
  const [instruction, setInstruction] = useState('')
  const { proposal, isLoading, error, requestEdit, applyEdits, clearProposal } =
    useAIEdit({ skriptId, pageId, currentContent })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instruction.trim() || isLoading) return
    await requestEdit(instruction.trim())
  }

  const handleAccept = async (edits: PageEdit[]) => {
    await applyEdits(edits)
    // Find the edit for the focused page and pass its content back
    const focusedEdit = pageId ? edits.find(e => e.pageId === pageId) : undefined
    onEditsApplied?.(focusedEdit?.proposedContent)
    onOpenChange(false)
  }

  const handleCancel = () => {
    clearProposal()
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      clearProposal()
      setInstruction('')
    }
    onOpenChange(open)
  }

  const contextLabel = pageTitle
    ? `Editing: ${pageTitle} (in ${skriptTitle})`
    : `Editing: ${skriptTitle}`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0">
        {proposal ? (
          // Review mode
          <EditProposalReview
            proposal={proposal}
            onAccept={handleAccept}
            onCancel={handleCancel}
          />
        ) : (
          // Input mode
          <>
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                <DialogTitle>AI Edit</DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">{contextLabel}</p>
            </DialogHeader>

            <div className="flex-1 flex flex-col p-6 gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="instruction" className="text-sm font-medium">
                  What would you like to change?
                </label>
                <Textarea
                  id="instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder={
                    pageId
                      ? 'e.g., "Add more examples to explain recursion" or "Translate this page to German"'
                      : 'e.g., "Add learning objectives to each page" or "Improve the introduction"'
                  }
                  className="flex-1 min-h-[120px] resize-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {pageId
                    ? 'The AI will focus on the current page but has access to the entire skript for context.'
                    : 'The AI can propose changes to any pages in this skript.'}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!instruction.trim() || isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
