# Import Fixes Log

i'm all out. now go through @IMPORT_FIXES.md and see if there's things we can use to improve our import
  logic. then verify our export logic would produce the same kind of zip. finally, less importantly, see if the
  informatikgarten export can benefit from our insights.

This document tracks all post-import changes made to the data, so we can potentially adapt the import functions.

## Date: 2025-11-28

### Task 1: Publish Teacher Content Pages (Exclude Examprep)

**Goal:** Publish all pages that appear to be teacher content, excluding exam preparation pages.

**Criteria for exclusion:**
- Pages with "prüfungsvorbereitung" in title/slug
- Pages with "examprep" in title/slug

**Changes made:**

```sql
-- Published 134 pages (excluded 17 examprep pages)
UPDATE pages SET "isPublished" = true
WHERE NOT (
    LOWER(title) LIKE '%prüfungsvorbereitung%'
    OR LOWER(title) LIKE '%pruefungsvorbereitung%'
    OR LOWER(slug) LIKE '%pruefungsvorbereitung%'
    OR LOWER(title) LIKE '%examprep%'
    OR LOWER(slug) LIKE '%examprep%'
);

-- Published all 15 skripts
UPDATE skripts SET "isPublished" = true;

-- Published all 2 collections
UPDATE collections SET "isPublished" = true;
```

**Summary:**
- Pages published: 134
- Pages excluded (examprep): 17
- Skripts published: 15
- Collections published: 2

---

### Task 2: Verify Files in Markdown Exist in Database and S3

**Goal:** Check that all file references in markdown content actually exist in the database and S3.

**Issues found:**

Total file references: 504
Missing references: 134
Files in database: 482

### Categories of Missing Files:

#### 1. Video Files (.mp4, .mov) - ~60 files
These are intentionally not imported because videos are hosted on Mux.
The markdown still references the `.mp4` files, but the actual content uses Mux.

**Examples:**
- `aufbau-binary-count.mp4`
- `for-basic.mp4`
- `sql-joins.mp4`

**Potential fix:** The convert script should transform video references to Mux player syntax.

#### 2. Excalidraw Files - ~15 files
Some Excalidraw diagrams weren't found during conversion (noted as warnings).

**Examples:**
- `hw-04-fde-start.excalidraw`
- `crypto-01-klassisch-caesarshift.excalidraw`

**Root cause:** Files may have been renamed or moved in the source.

#### 3. Path Prefix Issues - ~15 files
Some markdown references include `./attachments/` prefix that wasn't cleaned.

**Examples:**
- `./attachments/Pasted-image-20230818101343.png`
- `./attachments/sagan.jpg`

**Fix needed:** Convert script should strip `./attachments/` prefix from references.

#### 4. Pasted Images - ~10 files
`Pasted-image-*.png` files are missing - may not have been in source attachments.

#### 5. `.excalidraw.md` Files - ~2 files
Some references use `.excalidraw.md` extension instead of `.excalidraw`.

**Examples:**
- `eva-prinzip.excalidraw.md`
- `logicboard-top-eva.excalidraw.md`

**Fix needed:** Convert script should transform `.excalidraw.md` → `.excalidraw`.

---

### Recommendations for Import Function Updates:

1. **Strip path prefixes**: Remove `./attachments/`, `attachments/`, etc. from markdown references
2. **Transform `.excalidraw.md`**: Convert to `.excalidraw` extension
3. **Video handling**: Either:
   - Transform video syntax to Mux player component
   - Or log warnings for manual review
4. **Validate file existence**: Add post-import validation step

### S3 Verification

Verified random sample of 5 files - all exist in S3 with HTTP 200:
- `2149252ae94eea08802490dcf69472414002497dd8d900d7608fd45f6f7669f4.png` ✓
- `69a8bdb7f847bbb63d96d76719f9cb5535f17c8f13798035a685c6043eaefddd.json` ✓
- `728c5dcfeefc4fc6226cbef2ca0bf0c0a047e3c9f42d925521cb67e8825288a0.png` ✓
- `c33ca7c146b51b2d24863d3e008b139c02def90f50ddd1c090a37d7e4b9844ee.svg` ✓
- `0f3c2ac131d778b2aa879b40d09088e809051d31c2c11e40d63ba8d33dc99485.svg` ✓

**Conclusion:** Files that are in the database are correctly stored in S3. The 134 "missing" references are for files that were never imported (videos, missing source files, or path issues in markdown).

---

### Task 3: Post-Import Fixes Applied

**SQL fixes run on database:**

```sql
-- Fix .excalidraw.md → .excalidraw (2 pages)
UPDATE pages
SET content = REPLACE(content, '.excalidraw.md)', '.excalidraw)')
WHERE content LIKE '%.excalidraw.md%';

-- Fix ./attachments/ prefix (7 pages)
UPDATE pages
SET content = REPLACE(content, './attachments/', '')
WHERE content LIKE '%./attachments/%';

-- Fix Excalidraw/ prefix (1 page)
UPDATE pages
SET content = REPLACE(content, 'Excalidraw/', '')
WHERE content LIKE '%Excalidraw/%';
```

**These fixes should be added to the convert script:**
1. In `transformWikiLinks()`: Strip `./attachments/`, `attachments/`, `Excalidraw/` from filenames
2. When outputting markdown: Use `.excalidraw` not `.excalidraw.md`

### Task 4: Import Missing Excalidraw SVG Variants

**Problem:** The import stored `.excalidraw.md` files as `.excalidraw` (JSON), but didn't import the corresponding `.light.svg` and `.dark.svg` variants that the renderer needs.

**Files imported manually:**
- `eva-prinzip.excalidraw.light.svg`
- `eva-prinzip.excalidraw.dark.svg`
- `logicboard-top-eva.excalidraw.light.svg`
- `logicboard-top-eva.excalidraw.dark.svg`

**Bug in import function:**
The import only renames `.excalidraw.md` to `.excalidraw` but doesn't look for/import the SVG variants alongside them.

**Fix needed:** When importing an `.excalidraw` or `.excalidraw.md` file, also check for and import:
- `{basename}.excalidraw.light.svg`
- `{basename}.excalidraw.dark.svg`

**Fix applied to `scripts/convert-informatikgarten.mjs`:**
1. `transformWikiLinks()`: Now checks for both `.excalidraw` and `.excalidraw.md` extensions
2. `findAsset()`: Now handles both extensions and correctly builds paths for SVG variants

---

### Task 5: Fix Mux Video Rendering

**Problem:** Videos weren't rendering on public pages. The markdown references `.mp4` files (e.g., `![](aufbau-binary-count.mp4)`), and the `remarkMuxVideo` plugin looks up the corresponding `.mp4.json` metadata file to get the Mux playback ID.

**Root cause:** CORS issue when fetching video metadata.

The plugin workflow was:
1. Find the `.mp4.json` file in the fileList
2. Fetch the JSON from `/api/files/{id}`
3. Parse the Mux playback ID and render the Mux player

However, the `/api/files/{id}` endpoint returns a 302 redirect to S3. When the browser fetch follows this redirect to a different origin (S3), CORS blocks the request.

**Fix applied:**

1. Added `?proxy=true` query parameter support to `/api/files/[id]/route.ts`:
   - When `proxy=true`, the API fetches the file content from S3 server-side and returns it directly
   - This avoids CORS issues since the response comes from the same origin

2. Updated `src/lib/remark-plugins/mux-video.ts`:
   - Added `?proxy=true` to the fetch URL for JSON metadata files
   - This ensures the metadata is fetched through our API without CORS issues

**Note:** This is not an import issue - it's a runtime rendering fix. The import correctly stored the `.mp4.json` files; the issue was in how they were being fetched by the client.

---

### Task 6: Handle Missing Files Gracefully

**Problem:** Pages with missing Excalidraw or image files were crashing with a Next.js Image error because the `/missing-file/...` URL wasn't a valid image path.

**Example files missing (never existed in source):**
- `hw-04-fde-start.excalidraw`
- `crypto-01-klassisch-caesarshift.excalidraw`

**Fix applied:**

Updated `src/components/markdown/image-with-resize.tsx`:
- Check if `src` starts with `/missing-file/`
- If missing, render a styled placeholder showing the missing filename
- Otherwise, render the normal Image component

**Note:** This is a UI resilience fix. The missing files were never in the source data - they may have been deleted, renamed, or were placeholder references that were never completed.

---

### Task 7: Import Excalidraw Files from Subdirectories

**Problem:** Some Excalidraw files referenced in markdown are located in subdirectories of `attachments/` (e.g., `attachments/fde-demo/`). The convert script only looks in the root `attachments/` folder.

**Root cause:** The `findAsset()` function in `convert-informatikgarten.mjs` only searches:
- `{topic}/attachments/`
- `attachments/` (global)
- `videos/`

It doesn't recursively search subdirectories.

**Affected files (in `aufbau/attachments/fde-demo/`):**
- `hw-04-fde-start.excalidraw`
- `hw-04-fde-fetch.excalidraw`
- `hw-04-fde-decode.excalidraw`
- `hw-04-fde-execute.excalidraw`
- `hw-04-fde-fetch2.excalidraw`
- `hw-04-fde-decode2.excalidraw`
- `hw-04-fde-execute2.excalidraw`

**These were referenced inside `<Tabs>` components**, which the wiki-link extractor still correctly found.

**Fix applied:**
Created `scripts/import-missing-fde-svgs.mjs` to import all 14 SVG files from the fde-demo subdirectory.

**Recommendation for convert script:**
Update `findAsset()` to recursively search subdirectories of attachments:
```javascript
// Also search subdirectories of attachments
const subdirs = readdirSync(topicAttachmentsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)

for (const subdir of subdirs) {
  const subPath = join(topicAttachmentsDir, subdir, filename)
  if (existsSync(subPath)) return subPath
}
```

---

### Task 8: Fix JSX-Style Inline Spans

**Problem:** Some pages had `<span>` elements with JSX-style inline styles that displayed as raw text instead of styled HTML.

**Example of broken syntax:**
```html
<span style={{backgroundColor: "#12C2FF", color: "black", padding:"2px", borderRadius:"3px"}}>Namen</span>
```

**Root cause:** The original content was written in MDX or a React-aware context. Standard HTML processors don't understand JSX `style={{...}}` syntax.

**Fix applied (2025-11-29):**

```sql
-- Fix complex JSX-style spans (background + color)
UPDATE pages
SET content = REPLACE(
  REPLACE(
    content,
    'style={{backgroundColor: "#12C2FF", color: "black", padding:"2px", borderRadius:"3px"}}',
    'style="background-color: #12C2FF; color: black; padding: 2px; border-radius: 3px"'
  ),
  'style={{backgroundColor: "#15FF74", color: "black", padding:"2px", borderRadius:"3px"}}',
  'style="background-color: #15FF74; color: black; padding: 2px; border-radius: 3px"'
)
WHERE content LIKE '%style={{%';

-- Fix simple color spans
UPDATE pages
SET content = REPLACE(
  REPLACE(
    REPLACE(
      content,
      'style={{color:"blue"}}',
      'style="color: blue"'
    ),
    'style={{color:"green"}}',
    'style="color: green"'
  ),
  'style={{color:"red"}}',
    'style="color: red"'
)
WHERE content LIKE '%style={{%';
```

**Pages affected:** 3 (funktionen-in-python, farben, and one other)

**Recommendation for convert script:** Add JSX-to-HTML style transformer for span elements.

---

### Task 9: Import Missing Pasted Images

**Problem:** Multiple pages referenced `Pasted-image-*.png` files that weren't imported because they were in different topic's attachments folders (e.g., images referenced by `programmieren-1` pages were in `code/attachments/`).

**Root cause:** The convert script only looks in the same topic's attachments folder, not cross-topic.

**Fix applied (2025-11-29):**

Created `scripts/import-missing-pasted-images.mjs` that:
1. Finds all `Pasted-image-*.png` references in page content
2. Identifies which ones don't have matching file records
3. Searches multiple source directories for the files
4. Uploads to S3 and creates file records

**Files imported:** 14 Pasted images across 2 skripts

**Recommendation for convert script:**
1. For most cases: assume images are in the same topic's attachments folder
2. Handle relative paths like `../other-topic/attachments/sample.jpg`
3. Don't try to auto-resolve cross-topic references (that's a special case)

---

### Task 10: Convert Script Improvements (2025-11-29)

**Problem:** The convert script had two limitations:
1. Didn't handle relative paths like `../other-topic/attachments/sample.jpg`
2. Didn't search subdirectories of attachments folders

**Analysis of alt text handling:**
- Wiki-link transformation correctly uses empty alt: `![${alt || ''}](${filename})`
- `![[image.jpg]]` → `![](image.jpg)` (correct)
- `![[image.jpg|caption]]` → `![caption](image.jpg)` (correct)
- Standard markdown images already in content pass through unchanged (intentional)

**Fix applied to `scripts/convert-informatikgarten.mjs`:**

Updated `findAsset()` function to:
1. Handle relative paths by resolving from topic root (not attachments folder)
2. Search subdirectories of attachments folder (e.g., `attachments/fde-demo/`)
3. Apply same logic to Excalidraw SVG variant detection

```javascript
function findAsset(filename, topicAttachmentsDir, topicPath) {
  // Handle relative paths like ../other-topic/attachments/sample.jpg
  if (filename.startsWith('../')) {
    const resolvedPath = join(topicPath, filename)
    if (existsSync(resolvedPath)) return resolvedPath
  }

  // Also search subdirectories of attachments
  if (existsSync(topicAttachmentsDir)) {
    const subdirs = readdirSync(topicAttachmentsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    for (const subdir of subdirs) {
      const subPath = join(topicAttachmentsDir, subdir, filename)
      if (existsSync(subPath)) return subPath
    }
  }
  // ... rest of function
}
```

---

### Task 11: Port Quiz Component (2025-11-29)

**Problem:** The imported markdown content contains MDX-style Quiz components that weren't rendering:
```jsx
import { Question } from 'shared/components/Quiz'

<Question id="datentypen-2Aspw4rg">
    <Option is="true" feedback="Correct!">Answer A</Option>
    <Option feedback="Wrong">Answer B</Option>
</Question>
```

**Solution implemented:**

1. **Added QuizData type** (`src/lib/userdata/types.ts`):
   ```typescript
   export interface QuizData {
     selected?: number[]    // Selected option indices
     textAnswer?: string    // Free text answer
     numberAnswer?: number  // Numeric answer
     isSubmitted: boolean   // Whether submitted
   }
   ```

2. **Created Quiz component** (`src/components/markdown/quiz.tsx`):
   - Supports `single`, `multiple`, `text`, `number` question types
   - Integrates with existing `useUserData` hook for persistence
   - Shows feedback after submission
   - Styled with Tailwind/shadcn

3. **Created remark plugin** (`src/lib/remark-plugins/quiz.ts`):
   - Strips `import { Question }` statements
   - Transforms `<Question>` to `<quiz-question>` custom element
   - Transforms `<Option>` to `<quiz-option>` with data attributes

4. **Integrated into markdown renderer** (`src/components/markdown/markdown-renderer.tsx`):
   - Added `remarkQuiz` to processing pipeline
   - Added `QuizQuestionComponent` and `QuizOptionComponent` to rehype-react components

**Features:**
- Answers saved to IndexedDB via existing user data service
- Multiple choice with feedback per option
- Radio buttons for single-choice, checkboxes for multiple-choice
- Submit button with saved indicator

**Implementation Notes:**
- Remark plugin (`src/lib/remark-plugins/quiz.ts`) handles parsing similar to Tabs plugin
- Needed because indented `<Option>` tags inside `<Question>` get treated as code blocks by markdown
- Plugin collects multi-line content and extracts Question/Option structure
- `<Question>` blocks require blank lines above and below (standard markdown HTML block behavior)
- Import statements (`import { Question } from '...'`) should be removed from content

---
