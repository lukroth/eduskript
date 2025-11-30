# MDX Pipeline Architecture

## Overview

Eduskript uses a unified MDX pipeline for both server-side rendering (SSR) and client-side rendering (CSR). The key principle: **remark plugins are pure syntax transformers**, file resolution happens in components.

## File Structure

```
src/lib/
  mdx-compiler.ts           # compileMDX() - single function for SSR + CSR
  mdx-components-factory.ts # createMDXComponents() - binds files to components
  skript-files.ts           # Types + utility functions (shared)
  skript-files.server.ts    # getSkriptFiles() - Prisma queries (server-only)

src/components/markdown/
  markdown-renderer.server.tsx  # SSR entry point (async server component)
  markdown-renderer.client.tsx  # CSR entry point (client component with hooks)
```

## Data Flow

### Server-Side Rendering (Public Pages)

```
Page Component
    │
    ▼
getSkriptFiles(skriptId)     ─── Prisma query, returns SkriptFilesData
    │
    ▼
compileMDX(content)          ─── compile() + run() from @mdx-js/mdx
    │
    ▼
createMDXComponents(files)   ─── Binds files prop to all components
    │
    ▼
<MDXContent components={...} />
```

### Client-Side Rendering (Dashboard Preview)

```
MarkdownRenderer component
    │
    ▼
createSkriptFiles(fileList)  ─── Transform prop arrays to SkriptFilesData
    │
    ▼
compileMDX(content, { baseUrl })  ─── Same function, different baseUrl
    │
    ▼
createMDXComponents(files)   ─── Same factory
    │
    ▼
<MDXContent components={...} />
```

## Key Abstractions

### SkriptFilesData

Serializable data structure that can pass from Server to Client Components:

```typescript
interface SkriptFilesData {
  env: 'ssr' | 'csr'
  files: Record<string, SkriptFile>    // filename → { id, name, url }
  videos: Record<string, VideoInfo>    // filename → { provider, metadata }
}
```

**Why Records, not Maps?** Maps can't be serialized as React props.

### Utility Functions

```typescript
resolveFile(files, filename)      // → SkriptFile | undefined
resolveUrl(files, filename)       // → string | undefined
resolveExcalidraw(files, filename) // → { lightUrl, darkUrl } | undefined
resolveVideo(files, filename)     // → VideoInfo | undefined
```

### compileMDX()

Single compilation function for both environments:

```typescript
const { default: MDXContent } = await compileMDX(content, {
  baseUrl: window.location.href  // Client needs explicit baseUrl
})
```

- Selects JSX runtime based on `NODE_ENV` (dev vs prod)
- Applies all remark/rehype plugins
- Returns executable React component

### createMDXComponents()

Factory that binds `files` to all file-aware components:

```typescript
const components = createMDXComponents(files, { pageId, onContentChange })
// Returns: { img, muxvideo, 'excalidraw-image', pre, ... }
```

## Plugin Philosophy

**Remark plugins are PURE syntax transformers.** They:
- Transform markdown syntax to custom elements
- Set `data-*` attributes for component props
- Do NOT query databases or resolve file URLs

File resolution happens in components via the `files` prop:

```typescript
// In ExcalidrawImage component:
const urls = resolveExcalidraw(files, src)
if (!urls) return <MissingFile filename={src} />
```

## Remark Plugins

| Plugin | Input | Output |
|--------|-------|--------|
| `remarkImageResolver` | `![](image.png)` | `<img data-original-src="image.png">` |
| `remarkExcalidraw` | `![](drawing.excalidraw)` | `<excalidraw-image src="drawing.excalidraw">` |
| `remarkMuxVideo` | `![](video.mp4)` | `<muxvideo src="video.mp4">` |
| `remarkCodeEditor` | ` ```python editor``` ` | `<code-editor lang="python">` |
| `remarkCallouts` | `> [!note]` | `<blockquote class="callout callout-note">` |
| `remarkTabs` | `:::tabs` | `<tabs-container>` |
| `remarkQuiz` | `:::quiz` | `<quiz-container>` |

## Rehype Plugins

| Plugin | Purpose |
|--------|---------|
| `rehypeSlug` | Add IDs to headings |
| `rehypeKatex` | Render LaTeX math |
| `rehypeColorTitle` | Parse `{color}` in headings |
| `rehypeSourceLine` | Add `data-source-line` for editor sync |

## Why This Architecture?

| Concern | Solution |
|---------|----------|
| SSR/CSR code duplication | Single `compileMDX()` function |
| Prisma in client bundles | Separate `skript-files.server.ts` |
| Plugin complexity | Pure transformers, resolution in components |
| Testability | Easy to mock `SkriptFilesData` |
| Serialization | Records instead of Maps |
