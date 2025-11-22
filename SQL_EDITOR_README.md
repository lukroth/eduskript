# SQL Editor Implementation

This document describes the interactive SQL editor implementation using SQL.js.

## Features

- **Client-side SQL execution**: Queries run entirely in the browser using SQL.js WebAssembly
- **Per-skript databases**: Upload SQLite databases to your skripts via the file browser
- **Excalidraw schema diagrams**: Create custom schema visualizations for your databases
- **SQL syntax highlighting**: Powered by CodeMirror
- **Automatic query limiting**: Default LIMIT 100 applied to prevent overwhelming results
- **Formatted table output**: Query results displayed in clean, responsive tables

## Files

- `src/lib/sql-executor.client.ts` - Client-only SQL execution service
- `src/components/public/code-editor/index.tsx` - Extended to support SQL language
- `src/app/dashboard/sql-test/page.tsx` - Test page for SQL editor
- `src/components/dashboard/file-browser.tsx` - File browser with database upload and schema creation
- `scripts/migrate-databases.mjs` - Migration script for moving databases to file storage

## Known Issues & Solutions

### ✅ RESOLVED: Next.js 16 + Turbopack Compatibility

**Problem:**
Next.js 16 + Turbopack cannot handle the sql.js npm package due to Node.js-specific code (`require('fs')`) in the library, causing compilation errors in development mode.

**Solution Implemented:**
Instead of installing sql.js as an npm package, we load it entirely from CDN at runtime:

1. **No npm package**: `sql.js` and `@types/sql.js` are NOT in package.json
2. **CDN loading**: sql.js is loaded via script tag from `https://sql.js.org/dist/sql-wasm.js`
3. **Runtime initialization**: The library is accessed from `window.initSqlJs` after the script loads
4. **Type definitions**: Inline TypeScript interfaces define the API (no imports needed)

**Why this works:**
- Turbopack never analyzes the sql.js code (it's not in node_modules)
- The library loads in the browser only, at runtime
- No module resolution or bundling issues
- Works perfectly with Next.js 16 + Turbopack

## Architecture

### Client-Only Execution

The SQL executor uses a CDN-based loading strategy:

1. **Separate client file**: `sql-executor.client.ts` with `'use client'` directive
2. **CDN script injection**: Dynamically loads sql.js from `https://sql.js.org/dist/sql-wasm.js`
3. **Runtime initialization**: Accesses `window.initSqlJs` after script loads
4. **Inline types**: TypeScript interfaces defined inline (no type imports)

### Key Implementation Details

```typescript
// Load script from CDN
const script = document.createElement('script')
script.src = 'https://sql.js.org/dist/sql-wasm.js'
document.head.appendChild(script)

// After load, initialize from window
const sqlInstance = await window.initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`
})
```

## Usage

### Basic Query

```sql
SELECT * FROM movie WHERE release_year > 2020 LIMIT 10;
```

### Multiple Statements

Execute multiple queries separated by semicolons. Each result set is displayed separately.

### Schema Exploration

```sql
-- List all tables
SELECT name FROM sqlite_master WHERE type='table';

-- View table schema
PRAGMA table_info(movie);
```

## Database Management

### Uploading Databases

1. Navigate to the page editor for your skript
2. In the file browser, drag and drop `.sqlite` or `.db` files
3. Database files are uploaded to the skript's file storage

### Creating Schema Diagrams

1. Hover over a database file in the file browser
2. Click the paintbrush icon to create/edit the schema
3. Draw your schema using Excalidraw
4. The schema is automatically saved as `[dbname]-schema.excalidraw`

### Using Databases in Markdown

Reference databases by their file ID in SQL code blocks:

\`\`\`sql
sqlDatabase="/api/files/[file-id]"
\`\`\`

Example:
\`\`\`sql
sqlDatabase="/api/files/cmiac73tj0002ubg3v2hcu6fo"

SELECT * FROM movie WHERE runtime > 120 LIMIT 10;
\`\`\`

### Migrating Existing Databases

If you have databases in `public/sql/`, use the migration script:

```bash
node scripts/migrate-databases.mjs <skriptId>
```

This uploads all databases to the specified skript's file storage.

## Future Enhancements

- Database name resolution (reference by name instead of file ID)
- Query history
- Export results to CSV
- Database switcher UI in SQL editor toolbar
