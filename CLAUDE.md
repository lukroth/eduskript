# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

We use pnpm.

### Database Operations
- `pnpm db:generate` - Generate Prisma client after schema changes
- `pnpm db:push` - Push schema changes to database (for development)
- `pnpm db:migrate` - Deploy migrations (for production)
- `pnpm db:studio` - Open Prisma Studio for database inspection
- `pnpm db:reset` - Reset database and run migrations
- `pnpm db:fresh` - Fresh start: removes SQLite files and pushes schema

### Development & Build
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production (includes Prisma generation)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking without building
- `pnpm validate` - Run type-check, lint, and tests (quick validation)
- `pnpm pre-push` - Run full validation including Docker build (strict validation)

### Docker Operations
- `pnpm docker:build` - Build Docker image with git metadata
- `pnpm docker:run` - Run application in Docker (dev compose)
- `pnpm docker:stop` - Stop Docker containers
- `pnpm docker:logs` - View Docker container logs

## Architecture Overview

### Application Structure
Eduskript is a multi-tenant education platform where teachers create educational content using markdown. The hierarchy is: **User → Collections → Skripts → Pages**.

**Core Concepts:**
- **Collections**: Bundles of skripts (formerly called "scripts", renamed to "skripts")
- **Skripts**: Individual educational modules containing multiple pages
- **Pages**: Individual content pieces with markdown, LaTeX math, and syntax highlighting
- **Collaboration**: Teachers can partner and share content with granular permissions

### Technology Stack
- **Framework**: Next.js 16 with App Router and TypeScript (ES2023, ES Modules)
- **Database**: PostgreSQL with Prisma ORM 7.x and PostgreSQL adapter (local dev uses Docker PostgreSQL)
- **Authentication**: NextAuth.js with JWT strategy, supporting credentials + OAuth (GitHub/Google/Azure AD)
- **Styling**: TailwindCSS with Radix UI components
- **Editor**: CodeMirror 6 with multiple language support
- **Markdown**: Unified/Remark/Rehype pipeline with KaTeX math and syntax highlighting
- **Quality Assurance**: Husky pre-push hooks with strict validation (type-check, lint, tests, Docker build)

### Database Schema Key Points
- **Multi-tenant**: Each user has a unique username for URL paths (e.g., `eduskript.org/teacher`)
- **Permission System**: Many-to-many relations between users and content (CollectionAuthor, SkriptAuthor, PageAuthor)
- **Permissions**: `author` (can edit/manage) and `viewer` (read-only access)
- **Versioning**: Page content versioning with rollback capabilities
- **File Storage**: Hierarchical file system for each skript with deduplication via hash
- **Collaboration**: Request-based partnership system between teachers
- **Local Development**: PostgreSQL via Docker Compose (see `docker-compose.local.yml`)

### Routing Architecture
- **Path-based routing**: All public teacher pages use `eduskript.org/[username]/...` URL structure
- **Dynamic routes**: `[domain]/[collectionSlug]/[skriptSlug]/[pageSlug]` for public content (where `[domain]` is the username)
- **Dashboard**: Protected routes under `/dashboard` for content management
- **API**: RESTful endpoints under `/api` with authentication middleware
- **No subdomain routing**: Simplified architecture with all routes on the main domain (removed 2025-11-22)

### Permission Model
**No-access-by-default**: Being a collaborator doesn't grant content access automatically. Content must be explicitly shared.

**Permission Structure:**
- Junction tables manage all permissions: `CollectionAuthor`, `SkriptAuthor`, `PageAuthor`
- `permission = "author"` means **edit rights** (can modify content)
- `permission = "viewer"` means **view rights** (read-only access)

**Inheritance Hierarchy:**
1. Collection authors can view all skripts in their collections
2. Skript authors can edit all pages in their skripts  
3. Page-level permissions override skript-level permissions

**Drag-and-Drop Permission Model:**
- **"Ownership Transfer" approach**: Moving requires edit permissions on BOTH source and target
- Users need `permission = "author"` on either the skript OR its current collection to move it
- Users need `permission = "author"` on target collection to drop into it
- When moving, users automatically get edit rights on the skript if they don't have them
- View-only content cannot be dragged (prevents "stealing" content)

**Current Implementation:**
- Collections, Skripts, and Pages each have their own author tables
- Authors can add/remove other authors (but can't remove themselves if they're the last author)
- Permissions are checked in `src/lib/permissions.ts`
- Move operations handled by `/api/skripts/move` with automatic permission granting

### Key Files & Directories

**Project planning:**
- `CLAUDE_ROADMAP.md` - The current planning and roadmap, keep this up to date!

**Configuration:**
- `prisma/schema.prisma` - Database schema definition
- `src/proxy.ts` - Simplified proxy (no subdomain routing)
- `src/lib/auth.ts` - NextAuth configuration with multiple providers
- `src/lib/permissions.ts` - Permission checking logic
- `src/lib/prisma.ts` - Prisma client setup
- `tailwind.config.ts` - TailwindCSS configuration with custom theme
- `next.config.ts` - Next.js configuration

**Entry Points:**
- `src/app/layout.tsx` - Root layout with providers
- `src/app/page.tsx` - Homepage
- `src/app/dashboard/layout.tsx` - Dashboard layout
- `src/app/dashboard/page.tsx` - Dashboard homepage
- `src/app/[domain]/page.tsx` - Public user pages (username-based routing)

**Core Components:**
- `src/components/dashboard/` - Dashboard UI components (editors, modals, settings)
  - `page-builder-interface.tsx` - Main drag-and-drop page builder with permission checks and state management
  - `page-builder.tsx` - Visual page builder with drop zones, permission indicators, and nested skript support
  - `content-library.tsx` - Draggable content browser with permission filtering
  - `draggable-content.tsx` - Draggable items with eye icon indicators for view-only content
  - `skript-editor.tsx` - Dedicated skript editing interface with page management
  - `collection-editor.tsx` - Collection management interface with skript organization
- `src/components/public/` - Public-facing components (markdown renderer, TOC)
- `src/components/permissions/` - Permission management UI components
- `src/components/ui/` - Reusable UI components (buttons, dialogs, etc.)

**API Routes:**
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth authentication
- `src/app/api/collections/route.ts` - Collections CRUD
- `src/app/api/skripts/route.ts` - Skripts CRUD  
- `src/app/api/skripts/move/route.ts` - Skript movement with permission enforcement
- `src/app/api/collections/[id]/reorder-skripts/route.ts` - Bulk skript reordering
- `src/app/api/pages/route.ts` - Pages CRUD
- `src/app/api/upload/route.ts` - File upload handling
- `src/app/api/collaboration-requests/route.ts` - Teacher collaboration system

**Types & Utils:**
- `src/types/index.ts` - TypeScript type definitions
- `src/types/next-auth.d.ts` - NextAuth type extensions
- `src/lib/utils.ts` - Utility functions

### Editor Features
- **Multiple Editors**: CodeMirror-based with language-specific highlighting (Python, JavaScript, SQL)
- **Multi-File Support**: All code editors support multiple files with language-appropriate extensions (.py, .js, .sql)
- **Markdown Pipeline**: Supports GFM, math (KaTeX), and custom remark plugins
- **File Handling**: Upload and reference files within skript content
- **Version Control**: Automatic page versioning with restore capability
- **Interactive SQL**: Client-side SQL execution using SQL.js with database file management
- **Schema Visualization**: Automatic Excalidraw schema detection with theme-aware rendering

### Deployment Configuration
- **Docker**: Clean multi-stage build with Prisma 7.x and PostgreSQL adapter
- **Next.js**: Configured for standalone output with ES Modules
- **Database**: PostgreSQL with pg adapter for production, Docker PostgreSQL for local dev
- **Prisma**: Version 7.x with driver adapters (no version conflicts!)
- **Environment**: Node.js 22.x, pnpm package manager, TypeScript ES2023
- **Local Development**: `docker-compose.local.yml` for PostgreSQL database

## Testing & Quality Assurance
- **Test Framework**: Vitest 4.x with React Testing Library
- **Coverage**: v8 coverage provider targeting 80%+ coverage
- **Test Types**: Unit tests, integration tests, API tests, component tests
- **Pre-Push Validation**: Automated via Husky hooks
  - TypeScript type checking (`pnpm type-check`)
  - ESLint validation (`pnpm lint`)
  - Full test suite (`pnpm test:run`)
  - Docker build verification (`pnpm docker:build`)
- **Manual Validation**: Run `pnpm validate` for quick check (skips Docker build)

## Current Development Focus
**COMPLETED**: Page builder and dashboard experience are fully implemented and production-ready:

### ✅ Page Builder & Dashboard Features:
- **Advanced Page Builder** (`/dashboard/page-builder`) - Full drag-and-drop interface with permission-aware constraints
- **Sidebar Navigation Control** - User-configurable contextual vs. full navigation modes
- **Settings Organization** - Username management in "Page Settings", streamlined UX
- **Dashboard Flow** - Direct redirect to page-builder as primary dashboard view
- **Permission-Aware UI** - Visual indicators (eye icons) for view-only content, drag constraints
- **Home Button** - Smart navigation button for returning to root level in contextual mode
- **Public Page Routing** - Fixed routing with sidebarBehavior support

### 🎯 Ready for Next Phase:
**Phase 1: Enhanced Permission UX & Collaboration Dashboard**
- Access management dashboard for existing collaborators
- Bulk permission assignment tools
- Visual permission matrix showing users vs. content permissions
- "Share with Collaborators" quick actions and workflows
- Don't mark tasks as complete unless I say so

## SQL Database Management

### Overview
Eduskript supports interactive SQL learning through client-side database execution using SQL.js (SQLite compiled to WebAssembly). Students can run SQL queries directly in the browser against real database files uploaded by teachers.

### Architecture

**Client-Side Execution:**
- **SQL.js**: Loaded from CDN via script tag (avoids Next.js 16 + Turbopack build issues)
- **Database Caching**: Map-based cache allows multiple databases on the same page
- **No Server Execution**: All SQL runs in the browser - secure and scalable
- **File Storage**: Databases stored as regular skript files with content-addressed deduplication

**Key Files:**
- `src/lib/sql-executor.client.ts` - SQL.js integration and query execution
- `src/components/public/code-editor/index.tsx` - Interactive SQL editor with multi-file support
- `src/components/markdown/markdown-renderer.tsx` - SQL editor rendering in markdown
- `src/lib/remark-plugins/code-editor.ts` - Transforms code blocks to interactive editors
- `src/lib/file-storage.ts` - Database file upload and retrieval with public access support

### Usage in Markdown

**Basic SQL Editor:**
````markdown
```sql editor db="netflix.db"
SELECT * FROM tv_show LIMIT 10;
```
````

**With Explicit Schema Image:**
````markdown
```sql editor db="world_bank_indicators.db" schema-image="world_bank-schema"
SELECT country_code, indicator_value
FROM indicators
WHERE indicator_code = 'NY.GDP.MKTP.CD';
```
````

### Database File Management

**Uploading Database Files:**
1. In page editor, drag database file (.db, .sqlite) over CodeMirror editor
2. Select "Insert SQL editor" from popup menu
3. File is uploaded to skript storage with content-addressed hashing
4. Markdown references database by human-readable filename (e.g., `db="netflix.db"`)

**File Resolution:**
- Markdown uses `db="filename"` syntax
- System resolves filename to file URL via fileList lookup
- Supports both `.db` and `.sqlite` extensions (tries both if file renamed)
- Public access automatically granted for files in published skripts

### Schema Visualization

**Excalidraw Integration:**
- Create database schema diagrams in Excalidraw
- Export both light and dark theme SVGs
- Naming convention: `{database-name}-schema.excalidraw.{light|dark}.svg`
- Auto-detection: System automatically finds matching schema for database
- Theme-aware: Displays light schema in light mode, dark schema in dark mode

**Example:**
For database `netflix.db`, create:
- `netflix-schema.excalidraw.light.svg`
- `netflix-schema.excalidraw.dark.svg`

System will automatically display the appropriate schema next to the SQL editor.

**Manual Schema Specification:**
````markdown
```sql editor db="netflix.db" schema-image="custom-schema"
SELECT * FROM tv_show;
```
````

### Query Features

**Default Limits:**
- SELECT queries automatically get `LIMIT 100` if no LIMIT specified
- Prevents overwhelming results for large datasets
- Users can override by specifying their own LIMIT

**Result Display:**
- Tables rendered in canvas panel
- Multiple result sets supported
- Execution time displayed
- "No rows returned" warning for empty results
- Error messages shown in output panel

**Multiple Databases:**
- Each editor independently loads its specified database
- Map-based caching prevents conflicts between editors
- Students can compare queries across different databases on same page

### Multi-File SQL Support

**Feature:**
All code editors (Python, JavaScript, SQL) support multiple files with language-appropriate extensions.

**SQL Specific:**
- Default filename: `main.sql`
- New files: `file2.sql`, `file3.sql`, etc.
- Students can organize multiple queries in separate files
- Each file executes independently
- Useful for storing different solutions or query variations

**File Operations:**
- Add new file: `+` button in file tabs
- Rename file: Double-click filename
- Remove file: `X` button (can't remove last file)
- Switch files: Click filename tab

### Persistent User Data

**IndexedDB Storage:**
- Each editor's state persisted per page/editor ID
- Stores: code content, active file, font size, editor width, canvas transform
- Auto-save on changes (debounced)
- Version history with manual snapshots

**Reset Behavior:**
- Reset button restores original markdown content
- Detects when markdown changed vs cached data
- Preserves user settings (font size, layout) when markdown unchanged
- Always resets to current page content (not stale cache)

**Version Control:**
- Manual version creation with labels
- Auto-version every 500 keystrokes
- Restore previous versions
- Delete unwanted versions
- Filter autosaves in history view

### Security & Permissions

**Public Access:**
- Database files in published skripts are publicly accessible
- No authentication required for students viewing published content
- Authors maintain full control over their skript files

**File Serving:**
- Content-addressed storage (SHA256 hash)
- Automatic deduplication (same file uploaded multiple times uses same storage)
- Extension mismatch handling (renamed files from .db to .sqlite still work)
- Immutable caching (1 year max-age with ETag based on hash)

### Implementation Details

**SQL.js Loading:**
```typescript
// Loaded from CDN to avoid Next.js build issues
script.src = 'https://sql.js.org/dist/sql-wasm.js'
// WASM files also from CDN
locateFile: (file) => `https://sql.js.org/dist/${file}`
```

**Database Caching:**
```typescript
// Multiple databases supported simultaneously
const databaseCache = new Map<string, SqlJsDatabase>()

// Load and cache
export async function loadDatabase(dbPath: string): Promise<SqlJsDatabase> {
  const cached = databaseCache.get(dbPath)
  if (cached) return cached
  // ... fetch and cache new database
}
```

**Query Execution:**
```typescript
// Execute against specific database
export async function executeSqlQuery(
  query: string,
  dbPath: string
): Promise<SqlExecutionResult> {
  const database = databaseCache.get(dbPath)
  if (!database) throw new Error('No database loaded')

  const queryWithLimit = applyDefaultLimit(query)
  const results = database.exec(queryWithLimit)
  return { success: true, results, executionTime }
}
```

**Markdown Pipeline:**
```typescript
// In markdown: ```sql editor db="netflix.db"```
// Remark plugin converts to: <code-editor data-db="netflix.db" />
// React component resolves filename to URL via fileList
const dbFile = markdownContext.fileList.find(f =>
  f.name === db || f.name.replace(/\.(sqlite|db)$/i, '') === db
)
const dbUrl = dbFile?.url // e.g., /api/files/abc123
```

## Recent Upgrades

### ✅ Interactive SQL Database Management (2025-11-22)
Complete implementation of client-side SQL execution with database file management:

**Changes Made:**
- Integrated SQL.js (SQLite WASM) loaded from CDN for client-side execution
- Implemented Map-based database caching for multiple simultaneous databases
- Added database file upload with drag-drop insertion into markdown
- Created automatic Excalidraw schema detection with theme-aware rendering
- Enabled multi-file support for all languages (Python, JavaScript, SQL)
- Implemented query result display with execution time and empty result warnings
- Added default LIMIT 100 to prevent overwhelming query results
- Fixed file extension mismatch handling (.db ↔ .sqlite)
- Updated public file access permissions for published skripts
- Integrated with existing user data persistence and version control

**Features:**
- Students run SQL queries directly in browser (no server execution needed)
- Teachers upload database files (.db, .sqlite) as skript resources
- Automatic schema diagram display synced with theme (light/dark)
- Multiple SQL editors on same page with different databases
- Language-aware file extensions (main.py, main.sql, main.js)
- Persistent user state (code, settings, layout) across sessions
- Reset always restores to current markdown content (not cached version)

**Benefits:**
- Scalable SQL education (no server load for query execution)
- Secure (students can't access server or other databases)
- Visual learning (schema diagrams integrated with query editor)
- Organized code (multiple files per editor for different solutions)
- Seamless UX (drag-drop file insertion, auto-detection of schemas)

### ✅ Subdomain Routing Removal (2025-11-22)
Complete migration from subdomain-based to username-based path routing:

**Changes Made:**
- Removed all subdomain routing logic from `src/proxy.ts`
- Database migration: Renamed `User.subdomain` → `User.username`
- Removed `CustomDomain` model and all custom domain functionality
- Updated all API routes to use `username` instead of `subdomain`
- Updated public routes to query by username
- Removed 7 files/directories related to custom domains
- Updated 9 test files and all seed files
- Fixed navigation URL utilities to always use path-based routing
- Simplified authentication (removed cross-subdomain cookie logic)
- All 256 tests passing after migration

**Benefits:**
- Simpler architecture without complex subdomain handling
- Works reliably on all hosting platforms (especially Koyeb)
- Easier to understand and maintain
- Cleaner URL structure: `eduskript.org/username/...`
- No DNS configuration needed for new users

### ✅ Enhanced Seed Data (2025-11-22)
Improved example data seeding for better user experience:

**Changes Made:**
- Removed dummy user creation (no more teacher1, teacher2 accounts)
- Seed endpoint now only creates content for the current user
- Auto-refresh feature: Content library updates automatically after seeding
- Removed collaboration creation and physics collection
- Simplified to 1 collection (algebra), 2 skripts, 4 pages
- Updated confirm dialog text for clarity

**Implementation:**
- Added `refreshTrigger` prop to `ContentLibrary` component
- Added `onRefresh` callback to `PageBuilder` component
- Increment trigger after successful seeding triggers automatic data fetch
- No manual page refresh needed

### ✅ Prisma 7.x Migration (2025-11-20)
The project has been successfully upgraded from Prisma 6.11.0 to Prisma 7.x with PostgreSQL adapter:

**Changes Made:**
- Upgraded `@prisma/client` and `prisma` to 7.0.0
- Installed `@prisma/adapter-pg` and `pg` for PostgreSQL driver
- Created `prisma.config.ts` for Prisma 7.x configuration
- Updated `schema.prisma` generator to `prisma-client` with explicit output path
- Migrated project to ES Modules (`"type": "module"` in package.json)
- Updated TypeScript target from ES2017 to ES2023
- Refactored all Prisma client instantiations (40+ files) to use PostgreSQL adapter:
  - `src/lib/prisma.ts` - Main application client with `@prisma/adapter-pg`
  - `tests/helpers/test-db.ts` - Test database utilities
  - All utility scripts (*.mjs files)
  - Seed files (`prisma/seed.ts`, `prisma/seed-admin.js`)
- Created `docker-compose.local.yml` for local PostgreSQL development

**Docker Improvements:**
- **Removed version hack**: No longer copying entire `.pnpm` store to force Prisma version
- **Clean solution**: Project uses Prisma 7.x, Docker uses Prisma 7.x - no conflicts!
- **Simplified Dockerfile**: Only copy necessary packages (@prisma, @libsql, dotenv)
- **Updated start.sh**: Use `pnpm prisma migrate deploy` (standard approach)

**Benefits:**
- Modern Prisma architecture with driver adapters
- No more Prisma version conflicts in Docker
- Better performance with PostgreSQL adapter
- Clean, maintainable deployment setup
- Future-proof for Prisma ecosystem
- Production-ready PostgreSQL support

### ✅ Strict Pre-Push Workflow
Implemented comprehensive quality gates to ensure code quality before pushing:

**Setup:**
- Installed Husky 9.x for git hooks management
- Created `.husky/pre-push` hook with strict validation
- Added validation scripts to package.json:
  - `type-check`: TypeScript validation without building
  - `validate`: Quick check (types + lint + tests)
  - `pre-push`: Full validation (types + lint + tests + Docker build)

**Pre-Push Checks:**
1. **Type Checking**: `tsc --noEmit` - Ensures TypeScript types are valid
2. **Linting**: `eslint . --max-warnings=-1` - No lint warnings allowed
3. **Tests**: `vitest run` - All tests must pass
4. **Docker Build**: Full Docker image build - Ensures deployment readiness

**Usage:**
- Automatic: Runs before every `git push`
- Manual: Run `pnpm pre-push` to test before committing
- Quick check: Run `pnpm validate` (skips Docker build for speed)

**Benefits:**
- Catch issues before they reach the repository
- Ensure Docker builds work before deployment
- Maintain high code quality standards
- Reduce CI/CD failures and deployment issues