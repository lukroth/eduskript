'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { AlertDialogModal } from '@/components/ui/alert-dialog-modal'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { Eye, EyeOff, Pencil, Code, Bold, Italic, Heading, List, ListOrdered, Link, Palette, Highlighter, Circle, Wand2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sketch } from '@uiw/react-color'
import { ExcalidrawEditor } from './excalidraw-editor'
import { InteractivePreview } from './interactive-preview'
import type { EditorView } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'

interface CodeMirrorEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  skriptId?: string
  pageId?: string
  domain?: string
  isReadOnly?: boolean
  fileList?: Array<{id: string, name: string, url?: string, isDirectory?: boolean}>
  fileListLoading?: boolean
  onFileUpload?: () => void
  onFileDrop?: (file: {
    id: string
    name: string
    url?: string
    isDirectory?: boolean
  }, position: number, screenX: number, screenY: number) => void
  onExcalidrawEdit?: (filename: string, fileId: string) => void
  onAIEdit?: () => void
}

const CodeMirrorEditor = function CodeMirrorEditor({
  content,
  onChange,
  skriptId,
  pageId,
  isReadOnly = false,
  fileList,
  onFileUpload,
  onFileDrop,
  onExcalidrawEdit: onExcalidrawEditProp,
  onAIEdit
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const previewRef = useRef<HTMLDivElement>(null)
  const [editorWidth, setEditorWidth] = useState(50) // Percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Removed previewContent state - React renderer handles markdown directly
  const [isMounted, setIsMounted] = useState(false)
  const [useSimpleEditor, setUseSimpleEditor] = useState(false)
  const [textareaContent, setTextareaContent] = useState(content || '')
  const [dragOver, setDragOver] = useState(false)
  const [excalidrawOpen, setExcalidrawOpen] = useState(false)
  const [excalidrawInitialData, setExcalidrawInitialData] = useState<{
    name: string
    elements: readonly unknown[]
    appState?: unknown
    files?: Record<string, unknown>  // Embedded images
  } | undefined>(undefined)
  const [isEditingExistingExcalidraw, setIsEditingExistingExcalidraw] = useState(false)
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const alert = useAlertDialog()

  // Track current heading/paragraph (use refs to avoid re-renders on every keystroke)
  const [currentHeading, setCurrentHeading] = useState<string>('')
  const [selectionStartLine, setSelectionStartLine] = useState<number>(1)
  const [selectionEndLine, setSelectionEndLine] = useState<number>(1)

  // Debounce ref for selection updates - avoids excessive re-renders while typing
  const selectionDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSelectionRef = useRef<{ start: number; end: number; heading: string } | null>(null)

  // Scroll sync
  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isScrollingSyncRef = useRef(false)

  // Calculate visibility based on width
  const showEditor = editorWidth > 0
  const showPreview = editorWidth < 100

  // Update the onChange ref when it changes
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Handle file drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
    
    // Update cursor position based on mouse position during drag
    if (editorViewRef.current && !useSimpleEditor) {
      const view = editorViewRef.current
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
      if (pos !== null) {
        // Update selection to show where the file will be inserted
        view.dispatch({
          selection: { anchor: pos, head: pos }
        })
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    // Get drop position from mouse coordinates
    let dropPosition = null
    if (editorViewRef.current && !useSimpleEditor) {
      dropPosition = editorViewRef.current.posAtCoords({ x: e.clientX, y: e.clientY })
    }

    // Check if it's a file from the file browser (has custom data)
    const fileData = e.dataTransfer.getData('application/Eduskript-file')
    if (fileData) {
      try {
        const file = JSON.parse(fileData)
        // Use onFileDrop callback if available (allows showing insertion menu)
        if (onFileDrop && dropPosition !== null) {
          onFileDrop(file, dropPosition, e.clientX, e.clientY)
        } else {
          // Fallback to direct insertion
          insertFileAtPosition(file, dropPosition)
        }
        return
      } catch (error) {
        console.error('Error parsing file data:', error)
      }
    }

    // Handle computer file drops
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && skriptId) {
      try {
        for (const file of files) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('uploadType', 'skript')
          formData.append('skriptId', skriptId)

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const uploadedFile = await response.json()
            insertFileAtPosition(uploadedFile, dropPosition)
            // Refresh file list after successful upload
            if (onFileUpload) {
              onFileUpload()
            }
          } else {
            // Handle upload error
            try {
              const errorData = await response.json()
              const errorMessage = errorData.error || 'Upload failed'
              alert.showError(`Failed to upload file: ${errorMessage}`)
            } catch {
              alert.showError(`Failed to upload file (status ${response.status})`)
            }
          }
        }
      } catch (error) {
        console.error('Error uploading dropped files:', error)
        alert.showError('Failed to upload file. Please try again.')
      }
    }
  }

  // Insert file at specific position (or cursor if no position provided)
  const insertFileAtPosition = (file: { id: string; name?: string; filename?: string; url?: string; isDirectory?: boolean }, position?: number | null) => {
    if (file.isDirectory) return // Don't insert directories

    let insertText = ''

    // Determine the type of insert based on file extension
    // Handle both 'name' and 'filename' properties for backward compatibility
    const fileName = file.name || file.filename
    if (!fileName) {
      console.error('File has no name property:', file)
      return
    }
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['sqlite', 'db'].includes(extension || '')) {
      // Database file - insert SQL editor block
      insertText = `\`\`\`sql editor db="${fileName}"\n-- Show all tables in the database\nSELECT name FROM sqlite_master WHERE type='table' ORDER BY name;\n\`\`\``
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      // Image - use regular markdown syntax with just filename for path resolution
      const altText = fileName.replace(/\.[^/.]+$/, '')
      insertText = `![${altText}](${fileName})`
    } else if (extension === 'excalidraw') {
      // Excalidraw drawing - use image syntax with just filename
      insertText = `![](${fileName})`
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      // Video - use full URL for non-image files
      insertText = `<video controls>\n  <source src="${file.url || fileName}" type="video/${extension}">\n  Your browser does not support the video tag.\n</video>`
    } else if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
      // Audio - use full URL for non-image files
      insertText = `<audio controls>\n  <source src="${file.url || fileName}" type="audio/${extension}">\n  Your browser does not support the audio tag.\n</audio>`
    } else {
      // Generic file/download link - use full URL for non-image files
      insertText = `[${fileName}](${file.url || fileName})`
    }

    if (editorViewRef.current && !useSimpleEditor) {
      // Insert at specific position or current cursor position in CodeMirror
      const view = editorViewRef.current
      const insertPos = position !== null && position !== undefined ? position : view.state.selection.main.head
      const transaction = view.state.update({
        changes: { from: insertPos, insert: insertText },
        selection: { anchor: insertPos + insertText.length }
      })
      view.dispatch(transaction)
      onChange(view.state.doc.toString())
    } else if (useSimpleEditor) {
      // Insert at cursor position in textarea
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newContent = textareaContent.substring(0, start) + insertText + textareaContent.substring(end)
        setTextareaContent(newContent)
        onChange(newContent)
        // Restore cursor position after the inserted text
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertText.length
          textarea.focus()
        }, 0)
      }
    }
  }

  // Handle splitter drag (mouse)
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle splitter drag (touch)
  const handleSplitterTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newEditorWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Snap to edges if dragged past threshold, otherwise clamp to 10-90%
      if (newEditorWidth > 92) {
        setEditorWidth(100) // Snap to hide preview
      } else if (newEditorWidth < 8) {
        setEditorWidth(0) // Snap to hide editor
      } else {
        setEditorWidth(Math.max(10, Math.min(90, newEditorWidth)))
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !e.touches[0]) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newEditorWidth = ((e.touches[0].clientX - containerRect.left) / containerRect.width) * 100

      // Snap to edges if dragged past threshold, otherwise clamp to 10-90%
      if (newEditorWidth > 92) {
        setEditorWidth(100) // Snap to hide preview
      } else if (newEditorWidth < 8) {
        setEditorWidth(0) // Snap to hide editor
      } else {
        setEditorWidth(Math.max(10, Math.min(90, newEditorWidth)))
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isDragging])

  // Allow natural scrolling - browser handles it correctly
  // CodeMirror's .cm-scroller has overflow, so it scrolls internally when needed
  // When content doesn't overflow, the wheel event naturally bubbles to page scroll

  // Fallback for content
  const editorContent = content || ''

  // Ensure component is mounted
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // No longer need to process markdown for preview - React renderer handles it
  // Just pass the raw markdown to InteractivePreview
  useEffect(() => {
    if (!isMounted || !editorRef.current) return

    // Set a hard timeout to fallback to simple editor
    const fallbackTimeout = setTimeout(() => {
      setUseSimpleEditor(true)
    }, 5000) // Increased timeout to 5 seconds

    const initializeCodeMirror = async () => {
      try {
        // Clean up existing editor first
        if (editorViewRef.current) {
          editorViewRef.current.destroy()
          editorViewRef.current = null
        }
        
        // Try to import CodeMirror modules one by one with better error handling
        const { basicSetup } = await import('codemirror')
        const { EditorView, keymap } = await import('@codemirror/view')
        const { EditorState } = await import('@codemirror/state')
        const { indentWithTab } = await import('@codemirror/commands')
        const { markdown, markdownLanguage } = await import('@codemirror/lang-markdown')
        const { LanguageDescription } = await import('@codemirror/language')
        
        // Language support
        const { javascript } = await import('@codemirror/lang-javascript')
        const { python } = await import('@codemirror/lang-python')
        const { sql } = await import('@codemirror/lang-sql')
        const { php } = await import('@codemirror/lang-php')
        const { java } = await import('@codemirror/lang-java')
        const { cpp } = await import('@codemirror/lang-cpp')
        const { rust } = await import('@codemirror/lang-rust')
        const { go } = await import('@codemirror/lang-go')
        const { html } = await import('@codemirror/lang-html')
        const { css } = await import('@codemirror/lang-css')
        const { json } = await import('@codemirror/lang-json')
        const { xml } = await import('@codemirror/lang-xml')
        const { yaml } = await import('@codemirror/lang-yaml')
        
        // Load theme extensions
        const { vsCodeLight } = await import('@fsegurai/codemirror-theme-vscode-light')
        const { vsCodeDark } = await import('@fsegurai/codemirror-theme-vscode-dark')
        
        // Create enhanced markdown with language support
        const markdownExtension = markdown({
          base: markdownLanguage, // Use GFM-enabled markdown language
          codeLanguages: [
            LanguageDescription.of({ name: 'javascript', alias: ['js'], support: javascript() }),
            LanguageDescription.of({ name: 'typescript', alias: ['ts'], support: javascript({ typescript: true }) }),
            LanguageDescription.of({ name: 'python', alias: ['py'], support: python() }),
            LanguageDescription.of({ name: 'sql', support: sql() }),
            LanguageDescription.of({ name: 'php', support: php() }),
            LanguageDescription.of({ name: 'java', support: java() }),
            LanguageDescription.of({ name: 'cpp', alias: ['c++', 'c'], support: cpp() }),
            LanguageDescription.of({ name: 'rust', alias: ['rs'], support: rust() }),
            LanguageDescription.of({ name: 'go', support: go() }),
            LanguageDescription.of({ name: 'html', support: html() }),
            LanguageDescription.of({ name: 'css', support: css() }),
            LanguageDescription.of({ name: 'json', support: json() }),
            LanguageDescription.of({ name: 'xml', support: xml() }),
            LanguageDescription.of({ name: 'yaml', alias: ['yml'], support: yaml() }),
          ]
        })
        
        const startState = EditorState.create({
          doc: editorContent,
          extensions: [
            basicSetup,
            keymap.of([indentWithTab]), // Enable Tab/Shift+Tab for indentation
            markdownExtension,
            ...(isDark ? [vsCodeDark] : [vsCodeLight]),
            EditorView.updateListener.of((update: ViewUpdate) => {
              if (update.docChanged) {
                const newContent = update.state.doc.toString()
                onChange(newContent)
              }

              // Track selection range and current heading (debounced to avoid re-renders while typing)
              if (update.selectionSet || update.docChanged) {
                const { state } = update
                const selection = state.selection.main

                // Get start and end lines of selection
                const startLine = state.doc.lineAt(selection.from).number
                const endLine = state.doc.lineAt(selection.to).number

                // Find the current heading by searching backwards from cursor
                const text = state.doc.toString()
                const lines = text.split('\n')
                let heading = ''

                for (let i = startLine - 1; i >= 0; i--) {
                  const line = lines[i]
                  const match = line.match(/^(#{1,6})\s+(.+)/)
                  if (match) {
                    heading = match[2] // Extract heading text without the #
                    break
                  }
                }

                // Store pending values and debounce the state updates
                pendingSelectionRef.current = { start: startLine, end: endLine, heading: heading || 'Top of document' }

                // Clear existing debounce
                if (selectionDebounceRef.current) {
                  clearTimeout(selectionDebounceRef.current)
                }

                // Apply state updates after 100ms of inactivity
                selectionDebounceRef.current = setTimeout(() => {
                  const pending = pendingSelectionRef.current
                  if (pending) {
                    setSelectionStartLine(pending.start)
                    setSelectionEndLine(pending.end)
                    setCurrentHeading(pending.heading)
                  }
                }, 100)
              }
            }),
            EditorView.theme({
              '&': {
                height: '100%',
              },
              '.cm-content': {
                padding: '12px',
                fontSize: '14px',
                lineHeight: '1.5',
                minHeight: '100%',
              },
              '.cm-focused': {
                outline: 'none',
              },
              '.cm-editor': {
                borderRadius: '8px',
                height: '100%',
              },
              '.cm-scroller': {
                minHeight: '100%',
                overflowX: 'hidden', // Prevent horizontal overflow
              },
              '.cm-line': {
                wordBreak: 'break-word', // Break long words
              },
            }),
            EditorView.lineWrapping, // Add line wrapping extension
          ],
        })

        // Clear the container before creating new editor
        if (editorRef.current) {
          editorRef.current.innerHTML = ''
        }
        
        const view = new EditorView({
          state: startState,
          parent: editorRef.current!,
        })

        editorViewRef.current = view
        clearTimeout(fallbackTimeout)

        return () => {
          view.destroy()
          editorViewRef.current = null
        }
      } catch (error) {
        console.error('Error loading CodeMirror:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
          console.error('Error stack:', error.stack)
        }
        clearTimeout(fallbackTimeout)
        setUseSimpleEditor(true)
      }
    }

    initializeCodeMirror()

    // Cleanup function
    return () => {
      clearTimeout(fallbackTimeout)
      if (editorViewRef.current) {
        editorViewRef.current.destroy()
        editorViewRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, isDark]) // Only re-initialize when mounted state or theme changes

  // Update editor content when prop changes (e.g., from image resize in preview)
  useEffect(() => {
    if (editorViewRef.current && editorContent !== editorViewRef.current.state.doc.toString()) {
      try {
        const view = editorViewRef.current
        // Preserve cursor position
        const cursorPos = view.state.selection.main.head
        const cursorLine = view.state.doc.lineAt(cursorPos).number

        const transaction = view.state.update({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: editorContent,
          },
        })
        view.dispatch(transaction)

        // Restore cursor to same line (clamped to new doc length)
        requestAnimationFrame(() => {
          if (!editorViewRef.current) return
          const newView = editorViewRef.current
          const newDoc = newView.state.doc
          // Try to restore to same line number, clamped to valid range
          const targetLine = Math.min(cursorLine, newDoc.lines)
          const line = newDoc.line(targetLine)
          newView.dispatch({
            selection: { anchor: line.from },
          })
        })
      } catch (error) {
        console.error('Error updating editor content:', error)
      }
    }
  }, [editorContent])

  // Refresh CodeMirror when editor becomes visible
  useEffect(() => {
    if (showEditor && editorViewRef.current && !useSimpleEditor) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (editorViewRef.current) {
          // Force a full layout recalculation
          editorViewRef.current.requestMeasure()
          // Also dispatch an empty transaction to force a redraw
          editorViewRef.current.dispatch({})
        }
      }, 0)
    }
  }, [showEditor, useSimpleEditor])

  // Scroll synchronization between editor and preview
  useEffect(() => {
    if (!isMounted || (!showEditor || !showPreview)) return

    const editorScroller = editorRef.current?.querySelector('.cm-scroller')
    const previewScroller = previewRef.current

    if (!editorScroller || !previewScroller) return

    const syncScroll = (source: Element, target: Element) => {
      if (isScrollingSyncRef.current) return

      isScrollingSyncRef.current = true

      // Clear existing timeout
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current)
      }

      // Calculate scroll percentage
      const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight)

      // Apply to target
      const targetScrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight)
      target.scrollTo({ top: targetScrollTop, behavior: 'auto' })

      // Reset flag after a short delay
      scrollSyncTimeoutRef.current = setTimeout(() => {
        isScrollingSyncRef.current = false
      }, 100)
    }

    const handleEditorScroll = () => syncScroll(editorScroller, previewScroller)
    const handlePreviewScroll = () => syncScroll(previewScroller, editorScroller)

    editorScroller.addEventListener('scroll', handleEditorScroll, { passive: true })
    previewScroller.addEventListener('scroll', handlePreviewScroll, { passive: true })

    return () => {
      editorScroller.removeEventListener('scroll', handleEditorScroll)
      previewScroller.removeEventListener('scroll', handlePreviewScroll)
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current)
      }
    }
  }, [isMounted, showEditor, showPreview, useSimpleEditor])

  // Highlight current paragraph(s) in preview
  useEffect(() => {
    if (!previewRef.current || !showPreview) return

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (!previewRef.current) return

      // Find all elements with source line data
      const allElements = previewRef.current.querySelectorAll('[data-source-line-start]')

      // Remove previous highlights
      allElements.forEach(element => {
        element.classList.remove('editor-current-paragraph')
      })

      // Find all elements that overlap with the selection range
      const matchingElements: Element[] = []
      allElements.forEach(element => {
        const elementStart = parseInt(element.getAttribute('data-source-line-start') || '0', 10)
        const elementEnd = parseInt(element.getAttribute('data-source-line-end') || '0', 10)

        // Check if ranges overlap: elementStart <= selectionEnd && elementEnd >= selectionStart
        if (elementStart <= selectionEndLine && elementEnd >= selectionStartLine) {
          matchingElements.push(element)
        }
      })

      // Highlight all matching elements
      matchingElements.forEach(element => {
        element.classList.add('editor-current-paragraph')
      })

      // Scroll first matching element into view if it's not visible
      if (matchingElements.length > 0) {
        const firstElement = matchingElements[0] as HTMLElement
        const container = previewRef.current
        const containerRect = container.getBoundingClientRect()
        const elementRect = firstElement.getBoundingClientRect()

        // Check if element is outside viewport
        if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
          firstElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    })
  }, [selectionStartLine, selectionEndLine, showPreview, content])

  // Handle click on preview to jump to source line in editor
  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle if editor is not shown or not using CodeMirror
    if (!showEditor || useSimpleEditor || !editorViewRef.current) return

    // Don't interfere with interactive elements (buttons, inputs, links, etc.)
    const target = e.target as HTMLElement
    if (target.closest('button, input, textarea, a, [role="button"], .code-editor, [data-interactive]')) {
      return
    }

    // Find the nearest element with source line data
    const elementWithLine = target.closest('[data-source-line-start]') as HTMLElement | null
    if (!elementWithLine) return

    const lineNumber = parseInt(elementWithLine.getAttribute('data-source-line-start') || '0', 10)
    if (lineNumber <= 0) return

    // Get the position at the start of that line in CodeMirror
    const view = editorViewRef.current
    try {
      const line = view.state.doc.line(lineNumber)

      // Set cursor to the start of the line
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      })

      // Focus the editor
      view.focus()
    } catch (err) {
      // Line number out of range - content may have changed
      console.debug('Could not jump to line:', lineNumber, err)
    }
  }, [showEditor, useSimpleEditor])

  // Handle textarea change for simple editor
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setTextareaContent(newContent)
    onChange(newContent)
  }

  // Insert code editor block
  const insertCodeEditor = () => {
    const codeEditorTemplate = '```python editor\n# Write your Python code here\nprint("Hello, World!")\n```\n'

    if (editorViewRef.current && !useSimpleEditor) {
      const view = editorViewRef.current
      const insertPos = view.state.selection.main.head
      const transaction = view.state.update({
        changes: { from: insertPos, insert: codeEditorTemplate },
        selection: { anchor: insertPos + codeEditorTemplate.length }
      })
      view.dispatch(transaction)
      onChange(view.state.doc.toString())
    } else if (useSimpleEditor) {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement
      if (textarea) {
        const start = textarea.selectionStart
        const newContent = textareaContent.substring(0, start) + codeEditorTemplate + textareaContent.substring(start)
        setTextareaContent(newContent)
        onChange(newContent)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + codeEditorTemplate.length
          textarea.focus()
        }, 0)
      }
    }
  }

  // Handle Excalidraw save
  const handleExcalidrawSave = async (name: string, excalidrawData: string, lightSvg: string, darkSvg: string) => {
    if (!skriptId) {
      alert.showError('Skript ID is required to save drawings')
      return
    }

    try {
      const response = await fetch('/api/excalidraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          excalidrawData,
          lightSvg,
          darkSvg,
          skriptId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save drawing')
      }

      // Only insert reference for NEW drawings, not when editing existing ones
      if (!isEditingExistingExcalidraw) {
        const insertText = `![](${name}.excalidraw)\n`

        if (editorViewRef.current && !useSimpleEditor) {
          const view = editorViewRef.current
          const insertPos = view.state.selection.main.head
          const transaction = view.state.update({
            changes: { from: insertPos, insert: insertText },
            selection: { anchor: insertPos + insertText.length }
          })
          view.dispatch(transaction)
          onChange(view.state.doc.toString())
        } else if (useSimpleEditor) {
          const textarea = document.querySelector('textarea') as HTMLTextAreaElement
          if (textarea) {
            const start = textarea.selectionStart
            const newContent = textareaContent.substring(0, start) + insertText + textareaContent.substring(start)
            setTextareaContent(newContent)
            onChange(newContent)
          }
        }
      }

      // Refresh file list
      if (onFileUpload) {
        onFileUpload()
      }
    } catch (error) {
      console.error('Error saving drawing:', error)
      alert.showError('Failed to save drawing. Please try again.')
    }
  }

  // Handle editing an existing Excalidraw drawing (from preview or file browser)
  const handleExcalidrawEdit = async (filename: string, fileId: string) => {
    if (!skriptId) {
      alert.showError('Cannot edit drawing: no skript context')
      return
    }

    try {
      // Fetch the excalidraw data from the API
      const response = await fetch(`/api/excalidraw?fileId=${fileId}&skriptId=${skriptId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch drawing data')
      }

      const data = await response.json()

      // Set initial data and open editor (mark as editing existing file)
      setExcalidrawInitialData({
        name: data.name,
        elements: data.data.elements || [],
        appState: data.data.appState,
        files: data.data.files  // Include embedded images
      })
      setIsEditingExistingExcalidraw(true)
      setExcalidrawOpen(true)
    } catch (error) {
      console.error('Error loading drawing:', error)
      alert.showError('Failed to load drawing for editing')
    }
  }

  // Formatting helpers
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    if (editorViewRef.current && !useSimpleEditor) {
      const view = editorViewRef.current
      const { from, to } = view.state.selection.main
      const selectedText = view.state.doc.sliceString(from, to)
      const wrappedText = `${prefix}${selectedText}${suffix}`

      view.dispatch({
        changes: { from, to, insert: wrappedText },
        selection: { anchor: from + prefix.length, head: to + prefix.length }
      })
      view.focus()
    }
  }

  const insertAtCursor = (text: string) => {
    if (editorViewRef.current && !useSimpleEditor) {
      const view = editorViewRef.current
      const pos = view.state.selection.main.head

      view.dispatch({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length }
      })
      view.focus()
    }
  }

  const insertBold = () => wrapSelection('**')
  const insertItalic = () => wrapSelection('*')
  const insertHeading = () => {
    if (editorViewRef.current && !useSimpleEditor) {
      const view = editorViewRef.current
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      const lineStart = line.from

      view.dispatch({
        changes: { from: lineStart, insert: '## ' },
        selection: { anchor: lineStart + 3 }
      })
      view.focus()
    }
  }
  const insertBulletList = () => insertAtCursor('\n- ')
  const insertNumberedList = () => insertAtCursor('\n1. ')
  const insertLink = () => wrapSelection('[', '](url)')

  // Text color and highlight helpers
  const insertTextColor = (color: string) => {
    if (!editorViewRef.current || useSimpleEditor) return
    const view = editorViewRef.current
    const { from, to } = view.state.selection.main
    const text = view.state.doc.sliceString(from, to)
    const styled = `<span style="color: ${color}">${text}</span>`
    view.dispatch({
      changes: { from, to, insert: styled },
      selection: { anchor: from + styled.length }
    })
    view.focus()
  }

  const insertHighlight = (color: string) => {
    if (!editorViewRef.current || useSimpleEditor) return
    const view = editorViewRef.current
    const { from, to } = view.state.selection.main
    const text = view.state.doc.sliceString(from, to)
    const styled = `<span style="background-color: ${color}">${text}</span>`
    view.dispatch({
      changes: { from, to, insert: styled },
      selection: { anchor: from + styled.length }
    })
    view.focus()
  }

  // Insert/replace invert attribute for images (only works when cursor is on an image)
  const insertInvert = (mode: 'dark' | 'light' | 'always' = 'dark') => {
    if (!editorViewRef.current || useSimpleEditor) return
    const view = editorViewRef.current
    const pos = view.state.selection.main.head
    const doc = view.state.doc.toString()

    // Find if cursor is inside or touching an image tag
    // Pattern: ![alt](src){optional attributes}
    const imageRegex = /!\[[^\]]*\]\([^)]+\)(\{[^}]*\})?/g
    let match
    let foundImage: { start: number; end: number; hasAttrs: boolean; attrsStart: number; attrsEnd: number; attrs: string } | null = null

    while ((match = imageRegex.exec(doc)) !== null) {
      const start = match.index
      const end = start + match[0].length

      // Check if cursor is inside or touching this image (within 1 char)
      if (pos >= start && pos <= end + 1) {
        const hasAttrs = !!match[1]
        foundImage = {
          start,
          end,
          hasAttrs,
          attrsStart: hasAttrs ? end - match[1].length : end,
          attrsEnd: end,
          attrs: hasAttrs ? match[1].slice(1, -1) : '' // Remove { and }
        }
        break
      }
    }

    // If cursor is not on an image, do nothing
    if (!foundImage) return

    const invertValue = mode === 'dark' ? 'invert' : `invert=${mode}`

    if (foundImage.hasAttrs) {
      // Update existing attributes - replace or add invert
      let newAttrs = foundImage.attrs
        .split(';')
        .map(a => a.trim())
        .filter(a => !a.startsWith('invert')) // Remove existing invert
        .filter(a => a) // Remove empty

      newAttrs.unshift(invertValue) // Add new invert at start
      const newAttrsStr = `{${newAttrs.join(';')}}`

      view.dispatch({
        changes: { from: foundImage.attrsStart, to: foundImage.attrsEnd, insert: newAttrsStr },
        selection: { anchor: foundImage.attrsStart + newAttrsStr.length }
      })
    } else {
      // Add new attributes block
      const newAttrsStr = `{${invertValue}}`
      view.dispatch({
        changes: { from: foundImage.end, insert: newAttrsStr },
        selection: { anchor: foundImage.end + newAttrsStr.length }
      })
    }
    view.focus()
  }

  return (
    <div 
      className={`border border-border rounded-lg bg-card ${
        dragOver ? 'border-primary bg-primary/10' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* AI Edit button - leftmost */}
          {onAIEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAIEdit}
              title="AI Edit"
              className="px-2"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          )}
          {/* Formatting buttons */}
          {!useSimpleEditor && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={insertBold}
                title="Bold (Ctrl+B)"
                className="px-2"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertItalic}
                title="Italic (Ctrl+I)"
                className="px-2"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertHeading}
                title="Heading"
                className="px-2"
              >
                <Heading className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertBulletList}
                title="Bullet List"
                className="px-2"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertNumberedList}
                title="Numbered List"
                className="px-2"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertLink}
                title="Link"
                className="px-2"
              >
                <Link className="w-4 h-4" />
              </Button>
              <div className="h-4 w-px bg-border" />
              {/* Text Color Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Text Color"
                    className="px-2"
                  >
                    <Palette className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => insertTextColor('#dc2626')}>
                    <span className="w-4 h-4 rounded-full bg-red-600 mr-2" /> Red
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertTextColor('#2563eb')}>
                    <span className="w-4 h-4 rounded-full bg-blue-600 mr-2" /> Blue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertTextColor('#16a34a')}>
                    <span className="w-4 h-4 rounded-full bg-green-600 mr-2" /> Green
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertTextColor('#9333ea')}>
                    <span className="w-4 h-4 rounded-full bg-purple-600 mr-2" /> Purple
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertTextColor('#ea580c')}>
                    <span className="w-4 h-4 rounded-full bg-orange-600 mr-2" /> Orange
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowTextColorPicker(true)}>
                    Custom color...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Highlight Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Highlight"
                    className="px-2"
                  >
                    <Highlighter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => insertHighlight('#fef08a')}>
                    <span className="w-4 h-4 rounded-full bg-yellow-200 mr-2" /> Yellow
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertHighlight('#bbf7d0')}>
                    <span className="w-4 h-4 rounded-full bg-green-200 mr-2" /> Green
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertHighlight('#bfdbfe')}>
                    <span className="w-4 h-4 rounded-full bg-blue-200 mr-2" /> Blue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertHighlight('#fbcfe8')}>
                    <span className="w-4 h-4 rounded-full bg-pink-200 mr-2" /> Pink
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertHighlight('#fed7aa')}>
                    <span className="w-4 h-4 rounded-full bg-orange-200 mr-2" /> Orange
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowHighlightPicker(true)}>
                    Custom color...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Invert Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Invert image colors (for dark mode diagrams)"
                    className="px-2"
                  >
                    <span className="w-4 h-4 rounded-full border border-current overflow-hidden flex">
                      <span className="w-1/2 bg-current" />
                      <span className="w-1/2" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => insertInvert('dark')}>
                    <span className="w-4 h-4 rounded-full mr-2 border overflow-hidden flex">
                      <span className="w-1/2 bg-black" />
                      <span className="w-1/2 bg-white" />
                    </span>
                    Invert in dark mode
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertInvert('light')}>
                    <span className="w-4 h-4 rounded-full mr-2 border overflow-hidden flex">
                      <span className="w-1/2 bg-white" />
                      <span className="w-1/2 bg-black" />
                    </span>
                    Invert in light mode
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertInvert('always')}>
                    <span className="w-4 h-4 rounded-full mr-2 border bg-gray-400" />
                    Always invert
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="h-4 w-px bg-border" />
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={insertCodeEditor}
            className="flex items-center gap-2"
            title="Insert Python Code Editor"
          >
            <Code className="w-4 h-4" />
            Add Code Editor
          </Button>
          {skriptId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExcalidrawOpen(true)}
              className="flex items-center gap-2"
              title="Create Drawing"
            >
              <Pencil className="w-4 h-4" />
              Add Drawing
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!showEditor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditorWidth(50)}
              className="flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Show Editor
            </Button>
          )}
          {!showPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditorWidth(50)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Show Preview
            </Button>
          )}
        </div>
      </div>

      {/* Editor and Preview */}
      <div ref={containerRef} className="flex h-[600px] min-h-[400px] relative">
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded">
            <div className="text-center">
              <div className="text-primary text-lg font-semibold">
                Drop files here to insert
              </div>
              <div className="text-primary/80 text-sm">
                Images, documents, videos, and more
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div
          style={{
            width: showEditor ? (showPreview ? `${editorWidth}%` : '100%') : '0',
            display: showEditor ? 'block' : 'none'
          }}
        >
          {useSimpleEditor ? (
            <textarea
              value={textareaContent}
              onChange={handleTextareaChange}
              readOnly={isReadOnly}
              className="w-full h-full p-3 border-0 bg-transparent text-foreground font-mono text-sm resize-none focus:outline-none"
              placeholder="Start typing your markdown here..."
              style={{ minHeight: '100%' }}
            />
          ) : (
            <div ref={editorRef} className="h-full" />
          )}
        </div>

        {/* Draggable Splitter - wider touch target on mobile */}
        {showEditor && showPreview && (
          <div
            onMouseDown={handleSplitterMouseDown}
            onTouchStart={handleSplitterTouchStart}
            className={`w-2 sm:w-2 touch:w-4 bg-border hover:bg-primary/20 cursor-col-resize flex-shrink-0 transition-colors relative flex items-center justify-center touch-none ${
              isDragging ? 'bg-primary/30' : ''
            }`}
            style={{ minWidth: '8px' }}
          >
            {/* Drag indicator */}
            <div className="text-muted-foreground/40 text-xs select-none pointer-events-none">
              ⋮
            </div>
            {/* Extended touch target (invisible but increases hit area) */}
            <div className="absolute inset-y-0 -left-2 -right-2 md:hidden" />
          </div>
        )}

        {/* Preview */}
        {showPreview && (
          <div ref={previewRef} onClick={handlePreviewClick} style={{ width: showEditor ? `${100 - editorWidth}%` : '100%' }} className="overflow-auto bg-card" id="markdown-preview-scroll-container" data-typography="modern">
            <div className="p-4">
              <InteractivePreview
                markdown={useSimpleEditor ? textareaContent : editorContent}
                onContentChange={onChange}
                fileList={fileList}
                pageId={pageId}
                onExcalidrawEdit={onExcalidrawEditProp ?? handleExcalidrawEdit}
              />
            </div>
          </div>
        )}
      </div>

      {/* Excalidraw Modal */}
      {skriptId && (
        <ExcalidrawEditor
          open={excalidrawOpen}
          onClose={() => {
            setExcalidrawOpen(false)
            setExcalidrawInitialData(undefined)
            setIsEditingExistingExcalidraw(false) // Reset flag when closing
          }}
          onSave={handleExcalidrawSave}
          skriptId={skriptId}
          initialData={excalidrawInitialData}
        />
      )}
      {/* Custom Text Color Picker */}
      <Popover open={showTextColorPicker} onOpenChange={setShowTextColorPicker}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Sketch
            color="#000000"
            onChange={(color) => {
              insertTextColor(color.hex)
              setShowTextColorPicker(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Custom Highlight Picker */}
      <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Sketch
            color="#fef08a"
            onChange={(color) => {
              insertHighlight(color.hex)
              setShowHighlightPicker(false)
            }}
          />
        </PopoverContent>
      </Popover>

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

export default CodeMirrorEditor
