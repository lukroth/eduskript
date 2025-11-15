# Completed Features

This file tracks features that have been fully implemented and deployed.

*Last updated: 2025-01-15*

---

## ✅ Admin User System (Phase 0)

**Completed: 2025-01-08**

**Goal**: The first user to be created should be an administrator that can create, delete and alter existing users, including resetting their password.

**All tasks completed:**
- ✅ Added `isAdmin` and `requirePasswordReset` fields to User schema
- ✅ Created admin seed script (`prisma/seed-admin.js`) that runs on container startup
- ✅ Default admin user: eduadmin@eduskript.org / letseducate (password reset required on first login)
- ✅ Implemented forced password reset flow
  - Password reset page at `/auth/reset-password` with validation
  - API endpoint for password updates with session refresh
  - Dashboard redirect enforcement via middleware
- ✅ Admin-only APIs with proper authentication (`/lib/admin-auth.ts`):
  - User CRUD operations (create, read, update, delete)
  - Admin password reset for users
  - Example data seeder with math and physics content
- ✅ Admin panel UI at `/dashboard/admin`:
  - User management interface with search/filter
  - Create/edit/delete users with proper Radix UI dialogs
  - Reset user passwords with optional force-reset flag
  - Example data seeder accessible from empty page builder state
- ✅ Admin panel link in dashboard sidebar (visible to admins only, with Shield icon)
- ✅ Fixed NextAuth compatibility issue (PrismaAdapter conflicting with CredentialsProvider)
- ✅ Fixed Next.js 15+ async params in API routes (await params Promise)
- ✅ Created `pnpm dev:reset` script for quick database reset + admin seed
- ✅ Example data includes published collections, skripts, and pages with markdown content

**Key Files:**
- `/src/app/dashboard/admin/page.tsx` - Admin panel UI
- `/src/app/api/admin/**` - Admin API endpoints
- `/src/lib/admin-auth.ts` - Admin authentication helper
- `/src/app/auth/reset-password/page.tsx` - Password reset flow
- `/prisma/seed-admin.js` - Admin user seeding
- `/src/app/api/admin/seed-example-data/route.ts` - Example data seeder

---

## ✅ Excalidraw Integration (Phase 1.1)

**Completed: 2025-01-08**

**Goal**: Enable teachers to create and embed drawings as themed SVGs

**All tasks completed:**
- ✅ Research Excalidraw integration approaches
  - ✅ Evaluate `@excalidraw/excalidraw` React component
  - ✅ Test theming capabilities (light/dark mode support)
  - ✅ SVG export functionality
- ✅ Design storage strategy
  - ✅ Store Excalidraw JSON alongside SVG export with naming: `drawingname.excalidraw`, `drawingname.excalidraw.light.svg`, `drawingname.excalidraw.dark.svg`
  - ✅ Use existing file storage system with deduplication
  - ✅ Automatic overwrite support for editing
- ✅ Implement Excalidraw editor modal
  - ✅ Create new component: `src/components/dashboard/excalidraw-editor.tsx`
  - ✅ Add toolbar button to markdown editor (Pencil icon)
  - ✅ Handle drawing creation/editing workflow
- ✅ Implement SVG embedding in markdown
  - ✅ Create custom remark plugin for `![[drawingname.excalidraw]]` syntax (`src/lib/remark-plugins/excalidraw-resolver.ts`)
  - ✅ Support automatic theme switching (light/dark SVG variants)
  - ✅ Integrated into markdown processing pipeline
- ✅ Add drawing management UI
  - ✅ List drawings in skript file browser with special icon
  - ✅ Hide auto-generated SVG files from file list
  - ✅ Edit button for existing drawings (orange Pencil icon)
  - ✅ Delete/rename functionality through standard file operations
- ✅ **Privacy consideration**: Drawings stored on server, no client-side data
- ✅ API endpoint: `/api/excalidraw` for saving/loading drawings

**Key Files:**
- `/src/components/dashboard/excalidraw-editor.tsx` - Excalidraw editor component
- `/src/lib/remark-plugins/excalidraw-resolver.ts` - Markdown integration plugin
- `/src/app/api/excalidraw/route.ts` - API endpoint for saving/loading drawings

---

## ✅ Access Management Dashboard (Phase 3 - Partial)

**Completed: 2025-01-08**

**Tasks completed:**
- ✅ **Collection-level permission overview** showing who has access to what
- ✅ **Clean up the old permission matrix** we no longer use it and went for a simpler UI
- ✅ **Individual skript permission settings** use the same interface as collections
- ✅ **Edge case fix**: when removing access to a skript or collection, the removed user will still see them in their page builder but without title. We now display a placeholder that says "Your access was revoked. This content can no longer be displayed on your page." and no longer display that script or collection on the user's page.

**Key Files:**
- `/src/components/permissions/*` - Permission management UI components
- `/src/lib/permissions.ts` - Permission checking logic

---

## ✅ Python Code Editor with Turtle Graphics (Phase 1.1)

**Completed: 2025-01-12**

**Goal**: Interactive Python code editor for students to learn programming with turtle graphics

**All tasks completed:**

**Phase 1.1.1: Setup Skulpt and Core Infrastructure** ✅
- ✅ Copied Skulpt files to public directory (`skulpt.min.js`, `skulpt-stdlib.js`)
- ✅ Created basic component structure at `src/components/public/code-editor/`
- ✅ Set up TypeScript types for Skulpt and editor config

**Phase 1.1.2: CodeMirror Integration** ✅
- ✅ Implemented CodeMirror 6 with Python language support
- ✅ Configured theme switching (light/dark mode with VSCode themes)
- ✅ Added line numbers and basic editing features
- ✅ Configured Python syntax highlighting
- ✅ Added editor controls (Run, Stop, Reset, Clear output)

**Phase 1.1.3: Skulpt Python Execution** ✅
- ✅ Configured Skulpt runtime with output capture
- ✅ Set up turtle graphics canvas with pan/zoom
- ✅ Error handling and display
- ✅ Execution limits for safety
- ✅ Canvas features: hideable, fullscreen mode, pan and zoom with mouse

**Phase 1.1.4: Terminal Output** ✅
- ✅ Terminal output area for print() statements
- ✅ Error messages with proper formatting
- ✅ Color-coded output types (stdout, stderr, warnings)
- ✅ Scrollable output with clear button

**Phase 1.1.5: Multi-File Support** ✅
- ✅ File tabs UI for multiple Python files
- ✅ Add/remove/rename file functionality (double-click to rename)
- ✅ Switch between files in editor
- ✅ Python import system with Skulpt custom modules
- ✅ Cross-file imports (with/without .py extension)

**Phase 1.1.6: Markdown Integration** ✅
- ✅ Custom remark plugin for code editor blocks (` ```python editor` syntax)
- ✅ Support initial code in markdown
- ✅ Render editor in public pages via hydration
- ✅ Editor toolbar button for inserting code blocks

**Phase 1.1.7: Advanced Features** ✅
- ✅ Client-side Python autocomplete:
  - Keyword and builtin function completion
  - Turtle graphics method completion
  - Module member completion (math, random, turtle)
  - Auto-trigger on dot notation
  - User-defined function/class/variable extraction and completion

**Phase 1.1.8: Unified VSCode Theme** ✅
- ✅ Replaced Shiki with CodeMirror for static code blocks
- ✅ All editors now use identical VSCode Light/Dark themes
- ✅ Support for code annotations: `[!code ++]`, `[!code --]`, `[!code highlight]`, `[!code focus]`
- ✅ Consistent syntax highlighting across interactive and static code

**Implementation Architecture:**
- **Editor**: CodeMirror 6 with Python language support
- **Python Runtime**: Skulpt.js (browser-based Python interpreter)
- **UI Layout**: Left = code editor with file tabs, Right = turtle canvas (pan/zoom, hideable), Bottom = terminal output
- **Multi-file**: Tab-based interface with add/remove/rename
- **Autocomplete**: Client-side language server with keyword, builtin, module, and user-defined symbol completion
- **Storage**: Component state (no persistence - resets on page reload)

**Key Files:**
- `/src/components/public/code-editor/index.tsx` - Main editor component
- `/src/components/public/code-editor/types.ts` - TypeScript definitions
- `/src/components/public/code-editor/python-completions.ts` - Client-side language intelligence
- `/src/lib/remark-plugins/code-editor.ts` - Markdown integration plugin
- `/src/components/markdown/codemirror-code-block.tsx` - Static code block renderer
- `/src/lib/rehype-plugins/codemirror-highlight.ts` - Syntax highlighting plugin
- `/src/components/dashboard/codemirror-editor.tsx` - Toolbar integration (~line 542)
- `/public/js/skulpt.min.js`, `/public/js/skulpt-stdlib.js` - Python runtime

**Future Enhancements:**
- Context-aware cross-file completion
- Auto-save to localStorage
- Code history/undo for sessions
- Share code snippets
- Keyboard shortcuts (Ctrl+Enter to run)

---

## ✅ Infrastructure & Build System (2025-01-15)

**Completed: 2025-01-15**

**Goal**: Migrate to Next.js 16 and fix critical infrastructure issues

**All tasks completed:**

**Next.js 16 Migration** ✅
- ✅ Migrated from `next lint` to `eslint .` (Next.js 16 removed built-in lint)
- ✅ Converted ESLint config to flat config format (eslint.config.mjs)
- ✅ Fixed pnpm version mismatch in GitHub Actions workflow
- ✅ Updated TypeScript config to exclude test directories from builds
- ✅ Resolved all 19 ESLint errors (React hooks, variable declarations)
- ✅ Build passes successfully with zero errors

**Subdomain Routing** ✅
- ✅ Fixed preview button URL generation in page builder
- ✅ Added native subdomain detection for `.eduskript.org` and `.localhost`
- ✅ Automatic path rewriting for subdomain URLs
- ✅ Users can access pages via `username.eduskript.org`

**UI Cleanup** ✅
- ✅ Removed duplicate VersionFooter component
- ✅ Kept GitInfo component in bottom right

**Key Files:**
- `.github/workflows/ci.yml` - Removed hardcoded pnpm version
- `package.json` - Updated lint script
- `eslint.config.mjs` - Flat config format
- `tsconfig.json` - Excluded test/review directories
- `src/components/CustomDomainHandler.tsx` - Subdomain detection
- `src/components/dashboard/page-builder-interface.tsx` - Preview URL logic
