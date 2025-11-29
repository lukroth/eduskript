'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, useDeferredValue, memo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeReact from 'rehype-react'
import * as prod from 'react/jsx-runtime'
import type { MarkdownContext } from '@/lib/markdown'
import { CodeMirrorCodeBlock } from './codemirror-code-block'
import { ImageWithResize } from './image-with-resize'
import { ExcalidrawImage } from './excalidraw-image'
import { Heading } from './heading'
import { MathBlock } from './math-block'
import { CodeEditor } from '@/components/public/code-editor'
import { MuxVideo } from './mux-video'
import { remarkFileResolver } from '@/lib/remark-plugins/file-resolver'
import { remarkImageAttributes } from '@/lib/remark-plugins/image-attributes'
import { remarkCodeEditor } from '@/lib/remark-plugins/code-editor'
import { remarkCallouts } from '@/lib/remark-plugins/callouts'
import { remarkMuxVideo } from '@/lib/remark-plugins/mux-video'
import { rehypeCodemirrorHighlight } from '@/lib/rehype-plugins/codemirror-highlight'
import { rehypeSourceLine } from '@/lib/rehype-plugins/source-line'
import { rehypeColorTitle } from '@/lib/rehype-plugins/color-title'
import { rehypeMarkdownInHtml } from '@/lib/rehype-plugins/markdown-in-html'
import { rehypeFileResolver } from '@/lib/rehype-plugins/file-resolver'
import { remarkTabs } from '@/lib/remark-plugins/tabs'
import { remarkYoutube } from '@/lib/remark-plugins/youtube'
import { remarkQuiz } from '@/lib/remark-plugins/quiz'
import { TabsContainer, TabItem } from './tabs'
import { Youtube } from './youtube'
import { Question, Option } from './quiz'
import rehypeSlug from 'rehype-slug'
import rehypeRaw from 'rehype-raw'
import { useTheme } from 'next-themes'
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  X,
  Bug,
  FileText,
  Quote,
  Sparkles,
  MessageCircle,
  ListTodo,
  ChevronRight,
} from 'lucide-react'

// Context for passing content, callback, and markdown context down to components
const MarkdownEditContext = createContext<{
  content: string
  onContentChange?: (newContent: string) => void
  markdownContext?: MarkdownContext
}>({ content: '' })

// Component wrapper functions (defined before MarkdownRenderer)
function PreComponent({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const codeChild = Array.isArray(children) ? children[0] : children
  const childProps = typeof codeChild === 'object' && codeChild !== null && 'props' in codeChild ? codeChild.props as Record<string, unknown> : null
  if (childProps?.className && typeof childProps.className === 'string' && childProps.className.startsWith('language-')) {
    return <>{children}</>
  }
  return <pre {...props}>{children}</pre>
}

function CodeComponent({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string }) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : undefined

  if (!language) {
    return (
      <code className="px-[0.4em] py-[0.2em] rounded bg-muted font-mono text-[0.9em]" {...props}>
        {children}
      </code>
    )
  }

  const code = String(children).replace(/\n$/, '')
  return <CodeMirrorCodeBlock language={language} className={className}>{code}</CodeMirrorCodeBlock>
}

function ImageComponent({ src, alt, title, style, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { content, onContentChange } = useContext(MarkdownEditContext)

  const originalSrc = ((props as Record<string, unknown>)['data-original-src'] as string) ||
                      ((props as Record<string, unknown>)['dataOriginalSrc'] as string)

  const handleWidthChange = (newMarkdown: string) => {
    if (!onContentChange) return

    const srcForMatching = originalSrc || src
    if (!srcForMatching || typeof srcForMatching !== 'string') return

    const escapedSrc = srcForMatching.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedSrc}\\)(\\{[^}]*\\})?`, 'g')

    const newContent = content.replace(imagePattern, newMarkdown)

    if (newContent !== content) {
      onContentChange(newContent)
    }
  }

  const dataExcalidraw = (props as Record<string, unknown>)['data-excalidraw'] as string | undefined
  if (dataExcalidraw) {
    const lightSrc = (props as Record<string, unknown>)['data-light-src'] as string
    const darkSrc = (props as Record<string, unknown>)['data-dark-src'] as string

    const dataAlignExcalidraw = ((props as Record<string, unknown>)['data-align'] as string) ||
                                ((props as Record<string, unknown>)['dataAlign'] as string) ||
                                'center'

    const dataWrapExcalidraw = ((props as Record<string, unknown>)['data-wrap'] as string) ||
                               ((props as Record<string, unknown>)['dataWrap'] as string)

    return (
      <ExcalidrawImage
        key={`excalidraw-${dataExcalidraw}`}
        lightSrc={lightSrc || (typeof src === 'string' ? src : '') || ''}
        darkSrc={darkSrc || (typeof src === 'string' ? src : '') || ''}
        alt={alt}
        filename={dataExcalidraw}
        style={style}
        align={dataAlignExcalidraw as 'left' | 'center' | 'right'}
        wrap={dataWrapExcalidraw === 'true'}
        onWidthChange={onContentChange ? handleWidthChange : undefined}
      />
    )
  }

  const dataAlign = ((props as Record<string, unknown>)['data-align'] as string) ||
                    ((props as Record<string, unknown>)['dataAlign'] as string) ||
                    'center'

  const dataWrap = ((props as Record<string, unknown>)['data-wrap'] as string) ||
                   ((props as Record<string, unknown>)['dataWrap'] as string)

  const dataInvert = ((props as Record<string, unknown>)['data-invert'] as string) ||
                     ((props as Record<string, unknown>)['dataInvert'] as string)

  const dataSaturate = ((props as Record<string, unknown>)['data-saturate'] as string) ||
                       ((props as Record<string, unknown>)['dataSaturate'] as string)

  return (
    <ImageWithResize
      key={`image-${originalSrc || src}`}
      src={typeof src === 'string' ? src : ''}
      alt={alt}
      title={title}
      style={style}
      originalSrc={originalSrc}
      align={dataAlign as 'left' | 'center' | 'right'}
      wrap={dataWrap === 'true'}
      invert={dataInvert as 'dark' | 'light' | 'always' | undefined}
      saturate={dataSaturate}
      onWidthChange={onContentChange ? handleWidthChange : undefined}
    />
  )
}

function DivComponent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const divProps = props as Record<string, unknown>
  const { content, onContentChange } = useContext(MarkdownEditContext)

  if (divProps['data-codemirror'] === 'true' || divProps['data-codemirror'] === true) {
    const language = (divProps['data-language'] as string) || 'text'
    const rawCode = (divProps['data-raw-code'] as string) || ''
    const annotationsJson = (divProps['data-annotations'] as string) || '[]'

    let lineAnnotations: any[] = []
    try {
      lineAnnotations = JSON.parse(annotationsJson)
    } catch (e) {
      console.error('Failed to parse line annotations:', e)
    }

    const handleLanguageChange = (newLanguage: string) => {
      if (!onContentChange) return

      // Get source line to target the specific code block
      const sourceLineStart = divProps['data-source-line-start'] as number | undefined

      if (sourceLineStart) {
        // Split content into lines and find the specific code block
        const lines = content.split('\n')
        // sourceLineStart is 1-indexed, arrays are 0-indexed
        const targetLineIndex = sourceLineStart - 1

        if (targetLineIndex >= 0 && targetLineIndex < lines.length) {
          const targetLine = lines[targetLineIndex]
          // Check if this line is the code fence we're looking for
          if (targetLine.match(new RegExp(`^\`\`\`${language}\\b`))) {
            lines[targetLineIndex] = targetLine.replace(
              new RegExp(`^\`\`\`${language}\\b`),
              `\`\`\`${newLanguage}`
            )
            const newContent = lines.join('\n')
            if (newContent !== content) {
              onContentChange(newContent)
            }
            return
          }
        }
      }

      // Fallback: only replace the first occurrence (not all)
      const newContent = content.replace(
        new RegExp(`\`\`\`${language}\\b`),
        `\`\`\`${newLanguage}`
      )

      if (newContent !== content) {
        onContentChange(newContent)
      }
    }

    return (
      <div {...props}>
        <CodeMirrorCodeBlock
          language={language}
          lineAnnotations={lineAnnotations}
          onLanguageChange={onContentChange ? handleLanguageChange : undefined}
        >
          {rawCode}
        </CodeMirrorCodeBlock>
      </div>
    )
  }

  return <div className={className} {...props}>{children}</div>
}

// Simple hash function for generating stable IDs
function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

function CodeEditorComponent({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
  const { resolvedTheme } = useTheme()
  const { markdownContext } = useContext(MarkdownEditContext)
  const language = (props['dataLanguage'] as string) || (props['data-language'] as string) || 'python'
  const code = (props['dataCode'] as string) || (props['data-code'] as string) || ''
  const providedId = (props['dataId'] as string) || (props['data-id'] as string)
  const showCanvas = (props['dataShowCanvas'] as string) || (props['data-show-canvas'] as string)
  const db = (props['dataDb'] as string) || (props['data-db'] as string) // Database filename from markdown
  const schemaImage = (props['dataSchemaImage'] as string) || (props['data-schema-image'] as string)
  const single = (props['dataSingle'] as string) || (props['data-single'] as string)

  // Auto-assign ID if not provided - use content hash for stable IDs across renders
  const id = providedId || `editor-${hashCode(code)}-${language}`

  const decodedCode = decodeHtmlEntities(code)

  // Look up database file URL from file list if db name is provided
  let dbUrl: string | undefined
  let schemaImageUrl: string | undefined

  if (db && language === 'sql' && markdownContext?.fileList) {
    // Try to find file with this name (with or without extension)
    const dbFile = markdownContext.fileList.find(f => {
      const nameWithoutExt = f.name.replace(/\.(sqlite|db)$/i, '')
      return nameWithoutExt === db || f.name === db
    })
    dbUrl = dbFile?.url

    // Auto-detect schema image with Excalidraw naming convention
    // Pattern: database-schema.excalidraw.{light|dark}.svg
    if (!schemaImage && db) {
      const dbBasename = db.replace(/\.(sqlite|db)$/i, '')
      const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
      const schemaFilename = `${dbBasename}-schema.excalidraw.${theme}.svg`

      const schemaFile = markdownContext.fileList.find(f => f.name === schemaFilename)
      schemaImageUrl = schemaFile?.url
    } else if (schemaImage) {
      // If explicit schema image provided, look it up in file list
      const schemaFile = markdownContext.fileList.find(f => {
        const nameWithoutExt = f.name.replace(/\.svg$/i, '')
        return nameWithoutExt === schemaImage || f.name === schemaImage
      })
      schemaImageUrl = schemaFile?.url
    }
  }

  return (
    <div {...props}>
      <CodeEditor
        key={id}
        id={id}
        pageId={markdownContext?.pageId}
        language={language as 'python' | 'javascript' | 'sql'}
        initialCode={decodedCode}
        showCanvas={showCanvas !== 'false'}
        db={dbUrl}
        schemaImage={schemaImageUrl}
        singleFile={single === 'true'}
      />
    </div>
  )
}

function decodeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'"
  }
  let result = text
  for (const [entity, char] of Object.entries(map)) {
    result = result.replace(new RegExp(entity, 'g'), char)
  }
  return result
}

function MuxVideoComponent({ ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
  const src = (props['src'] as string) || ''
  const poster = (props['poster'] as string) || ''
  const alt = (props['alt'] as string) || ''
  const blurDataURL = (props['blurDataURL'] as string) || (props['blurdataurl'] as string) || ''
  const aspectRatio = parseFloat((props['aspectRatio'] as string) || (props['aspectratio'] as string) || '') || 16 / 9

  // Use span to avoid hydration errors (figure/div can't be nested in p tags)
  return (
    <span className="block my-6">
      <MuxVideo
        src={src}
        poster={poster}
        alt={alt}
        blurDataURL={blurDataURL}
        aspectRatio={aspectRatio}
        className="w-full rounded-lg overflow-hidden"
      />
      {alt && !alt.includes('autoplay') && !alt.includes('loop') && (
        <span className="block text-center text-sm text-muted-foreground mt-2">
          {alt}
        </span>
      )}
    </span>
  )
}

function YoutubeEmbedComponent({ ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
  const id = (props['data-id'] as string) || (props['dataId'] as string) || ''
  const playlist = (props['data-playlist'] as string) || (props['dataPlaylist'] as string) || ''
  const startTimeStr = (props['data-start-time'] as string) || (props['dataStartTime'] as string) || ''
  const startTime = startTimeStr ? parseInt(startTimeStr, 10) : undefined

  return (
    <Youtube
      id={id || undefined}
      playlist={playlist || undefined}
      startTime={startTime}
    />
  )
}

function QuizQuestionComponent({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) {
  const { markdownContext } = useContext(MarkdownEditContext)
  const id = (props['id'] as string) || ''
  const type = ((props['type'] as string) || 'multiple') as 'single' | 'multiple' | 'text' | 'number'

  // Extract options from children
  const optionElements: React.ReactElement[] = []

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      optionElements.push(child)
    }
  })

  return (
    <Question
      id={id}
      pageId={markdownContext?.pageId || ''}
      type={type}
    >
      {optionElements.map((option, index) => {
        const optionProps = option.props as Record<string, unknown>
        const is = optionProps['is'] as string
        const feedback = decodeHtmlEntities((optionProps['feedback'] as string) || '')

        return (
          <Option
            key={index}
            is={is as 'true' | 'false' | undefined}
            feedback={feedback || undefined}
          >
            {optionProps.children as React.ReactNode}
          </Option>
        )
      })}
    </Question>
  )
}

function QuizOptionComponent({ children }: React.HTMLAttributes<HTMLElement>) {
  // This is rendered by QuizQuestionComponent, so this is just a passthrough
  return <>{children}</>
}

// Icon mapping for callout types
const calloutIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  note: FileText,
  abstract: FileText,
  info: Info,
  tip: Lightbulb,
  success: CheckCircle2,
  question: HelpCircle,
  warning: AlertTriangle,
  failure: X,
  danger: AlertCircle,
  bug: Bug,
  example: Sparkles,
  quote: Quote,
  solution: CheckCircle2,
  discuss: MessageCircle,
  todo: ListTodo,
}

// Blockquote component with callout support
function BlockquoteComponent({ children, className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) {
  // Check if initially folded (from markdown syntax like [!info]-)
  const initiallyFolded = className?.includes('callout-folded')

  // Always call hooks first, before any conditional returns
  const [isOpen, setIsOpen] = useState(!initiallyFolded)

  // Check if this is a callout blockquote
  const isCallout = className?.includes('callout')

  if (!isCallout) {
    return <blockquote className={className} {...props}>{children}</blockquote>
  }

  // Extract callout type from className
  const calloutTypeMatch = className?.match(/callout-(\w+)/)
  const calloutType = calloutTypeMatch?.[1]
  const Icon = calloutType ? calloutIcons[calloutType] : null

  // Check if it's foldable
  const isFoldable = className?.includes('callout-foldable')

  // Strip callout-folded from base className - we control it via React state
  const baseClassName = className?.replace(/\s*callout-folded\s*/g, ' ').trim()

  const handleToggle = (e: React.MouseEvent) => {
    if (!isFoldable) return

    // Don't toggle if clicking inside content
    const target = e.target as HTMLElement
    if (target.closest('.callout-content')) return

    setIsOpen(!isOpen)
  }

  return (
    <blockquote
      className={`${baseClassName} ${!isOpen && isFoldable ? 'callout-folded' : ''}`}
      onClick={handleToggle}
      {...props}
    >
      {React.Children.map(children, (child) => {
        // Add icon to the callout-title div
        if (React.isValidElement(child)) {
          const childProps = child.props as { className?: string; children?: React.ReactNode }
          if (childProps.className?.includes('callout-title')) {
            return React.cloneElement(child, {
              children: (
                <div className="flex items-center gap-2 w-full">
                  {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                  <span className="flex-1">{childProps.children}</span>
                  {isFoldable && (
                    <ChevronRight
                      className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  )}
                </div>
              )
            } as Partial<typeof childProps>)
          }
        }
        return child
      })}
    </blockquote>
  )
}

// Stable components object for rehype-react
const rehypeReactComponents = {
  pre: PreComponent,
  code: CodeComponent,
  img: ImageComponent,
  blockquote: BlockquoteComponent,
  'code-editor': CodeEditorComponent,
  'muxvideo': MuxVideoComponent,
  'tabs-container': TabsContainer,
  'tab-item': TabItem,
  'youtube-embed': YoutubeEmbedComponent,
  'question': QuizQuestionComponent,
  'option': QuizOptionComponent,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading level={1} {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading level={2} {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading level={3} {...props} />,
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading level={4} {...props} />,
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading level={5} {...props} />,
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading level={6} {...props} />,
  div: DivComponent,
}

interface MarkdownRendererProps {
  content: string
  context?: MarkdownContext
  onContentChange?: (newContent: string) => void
}

// Inner component that does the actual rendering
function MarkdownRendererInner({ content, context, onContentChange }: MarkdownRendererProps) {

  // Defer content updates so typing doesn't block
  const deferredContent = useDeferredValue(content)

  const [renderedContent, setRenderedContent] = useState<React.ReactNode>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const { resolvedTheme } = useTheme()
  const scrollPositionRef = useRef(0)
  const hasRestoredScroll = useRef(false)
  const processingRef = useRef(0) // Track current processing generation

  // Capture scroll position before any DOM changes
  useLayoutEffect(() => {
    const scrollContainer = document.getElementById('markdown-preview-scroll-container')
    if (scrollContainer) {
      scrollPositionRef.current = scrollContainer.scrollTop
    }
  })

  useEffect(() => {
    // Increment generation to cancel any in-flight processing
    const currentGeneration = ++processingRef.current

    const processContent = async () => {
      // Early bail-out if already superseded
      if (currentGeneration !== processingRef.current) return

      // Debounce - wait 150ms and check again (allows fast typing to batch)
      await new Promise(resolve => setTimeout(resolve, 150))
      if (currentGeneration !== processingRef.current) return

      try {
        setError(null)

        // Build the processing pipeline
        const processor = unified()
          .use(remarkParse)
          .use(remarkTabs)
          .use(remarkQuiz)
          .use(remarkGfm)
          .use(remarkMath)
          .use(remarkMuxVideo, { fileList: context?.fileList })
          .use(remarkFileResolver, { fileList: context?.fileList })
          .use(remarkImageAttributes)
          .use(remarkCodeEditor)
          .use(remarkCallouts)
          .use(remarkYoutube)
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeRaw)
          .use(rehypeMarkdownInHtml)
          .use(rehypeFileResolver, { fileList: context?.fileList })
          .use(rehypeSlug)
          .use(rehypeColorTitle)
          .use(rehypeKatex)
          .use(rehypeSourceLine)
          .use(rehypeCodemirrorHighlight)
          .use(rehypeReact, {
            jsx: prod.jsx,
            jsxs: prod.jsxs,
            Fragment: prod.Fragment,
            components: rehypeReactComponents,
          })

        const result = await processor.process(deferredContent)

        // Bail out if a newer generation started
        if (currentGeneration !== processingRef.current) {
          return
        }
        setRenderedContent(result.result)
        setIsInitialLoad(false)
        hasRestoredScroll.current = false
      } catch (err) {
        console.error('Markdown rendering error:', err)
        setError(String(err))
        setIsInitialLoad(false)
      }
    }

    processContent()
  }, [deferredContent, context, resolvedTheme])

  // Restore scroll position after DOM updates
  useLayoutEffect(() => {
    if (!hasRestoredScroll.current && renderedContent) {
      const scrollContainer = document.getElementById('markdown-preview-scroll-container')
      if (scrollContainer && scrollPositionRef.current > 0) {
        scrollContainer.scrollTop = scrollPositionRef.current
        hasRestoredScroll.current = true
      }
    }
  }, [renderedContent])

  // Add click-to-copy functionality for heading links
  useEffect(() => {
    if (!renderedContent) return

    const handleHeadingClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const headingLink = target.closest('a.heading-link')

      if (headingLink && headingLink instanceof HTMLAnchorElement) {
        e.preventDefault()

        // Get the full URL for the heading
        const headingId = headingLink.getAttribute('href')
        if (headingId) {
          const fullUrl = `${window.location.origin}${window.location.pathname}${headingId}`

          // Copy to clipboard
          navigator.clipboard.writeText(fullUrl).then(() => {
            // Show temporary feedback
            const originalContent = headingLink.innerHTML
            const tempSpan = document.createElement('span')
            tempSpan.style.fontSize = '0.8em'
            tempSpan.style.marginLeft = '0.5rem'
            tempSpan.style.color = 'hsl(142.1, 76.2%, 36.3%)'
            tempSpan.textContent = ' ✓ Copied!'
            headingLink.appendChild(tempSpan)

            setTimeout(() => {
              tempSpan.remove()
            }, 2000)
          }).catch((err) => {
            console.error('Failed to copy link:', err)
          })
        }
      }
    }

    // Add event listener to the container
    document.addEventListener('click', handleHeadingClick)

    return () => {
      document.removeEventListener('click', handleHeadingClick)
    }
  }, [renderedContent])

  if (isInitialLoad && !renderedContent) {
    return (
      <div className="markdown-content prose dark:prose-invert max-w-none">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive p-4 border border-destructive rounded-md">
        <p className="font-semibold">Markdown Rendering Error</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    )
  }

  return (
    <MarkdownEditContext.Provider value={{ content, onContentChange, markdownContext: context }}>
      {renderedContent}
    </MarkdownEditContext.Provider>
  )
}

// Custom comparison function for memo
function arePropsEqual(prevProps: MarkdownRendererProps, nextProps: MarkdownRendererProps): boolean {
  // Return true if props are equal (skip re-render)
  // Return false if props changed (re-render needed)

  // Always re-render if content changed
  if (prevProps.content !== nextProps.content) return false

  // Compare context by meaningful fields
  if (prevProps.context?.pageId !== nextProps.context?.pageId) return false
  if (prevProps.context?.domain !== nextProps.context?.domain) return false
  if (prevProps.context?.skriptId !== nextProps.context?.skriptId) return false

  // Compare fileList length (full array comparison too expensive)
  const prevFileCount = prevProps.context?.fileList?.length ?? 0
  const nextFileCount = nextProps.context?.fileList?.length ?? 0
  if (prevFileCount !== nextFileCount) return false

  // onContentChange is a callback - reference changes are ok, skip comparison

  return true // Props are equal, skip re-render
}

// Memoized export - only re-render when content or context actually changes
export const MarkdownRenderer = memo(MarkdownRendererInner, arePropsEqual)

// Add display name for debugging
MarkdownRenderer.displayName = 'MarkdownRenderer'
