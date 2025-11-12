# Single-Canvas Annotation Architecture Migration Plan

## Overview
Migrate from multiple section-based canvases to a single canvas overlay with intelligent stroke repositioning when content changes.

## User Requirements
- **Canvas Layout**: Absolute positioned overlay covering entire content wrapper
- **Multi-section Strokes**: Assign to section with majority of points (move entire stroke with that section)
- **Deleted Sections**: Mark as orphaned and show warning

## Current State Analysis

### ✅ Complete
- IndexedDB schema v2 with single-canvas format
- Data migration from multi-canvas to single-canvas
- `StrokeData` includes `sectionId` and `sectionOffsetY` fields
- Heading position tracking implemented

### ⚠️ Broken/Incomplete
- UI components reference removed multi-canvas variables (`sections`, `sectionData`, `canvasRefs`)
- Save function signature mismatch
- No single canvas rendering implementation
- No coordinate transformation logic
- No orphaned stroke handling

## Phase 1: Fix Broken Code & Implement Single Canvas Rendering

### 1.1 Update annotation-layer.tsx

**Remove:**
- All references to `sections` state (currently undefined)
- All references to `sectionData` Map (currently undefined)
- All references to `canvasRefs` Map (currently undefined)
- Portal-based rendering code (lines ~790-800)

**Keep:**
- `canvasData` state (string)
- `headingPositions` state (HeadingPosition[])
- Single `canvasRef` (React.MutableRefObject)

**Add:**
- `pageHeight` state to track total content height
- `orphanedStrokesCount` state for warning display
- Effect to measure content height after markdown renders
- Single canvas rendering with absolute positioning

**Update:**
- Save function to use new signature: `savePageAnnotations(pageId, pageVersion, canvasData, headingOffsets)`
- Load function to apply coordinate transformation if needed

### 1.2 Update SimpleCanvas Component

**Add:**
- Helper function: `determineSectionFromY(y: number, headingPositions: HeadingPosition[]): string | null`
  - Binary search through sorted heading positions
  - Returns sectionId for the section containing Y coordinate
  - Returns null if before first heading

**Update stopDrawing():**
```typescript
const stopDrawing = useCallback(() => {
  if (currentPathRef.current.length === 0) return

  // Determine section for this stroke
  const firstPoint = currentPathRef.current[0]
  const sectionId = determineSectionFromY(firstPoint.y, headingPositions)
  const sectionOffsetY = headingPositions.find(h => h.sectionId === sectionId)?.offsetY || 0

  pathsRef.current.push({
    points: currentPathRef.current,
    mode: mode as DrawMode,
    color: strokeColor,
    width: strokeWidth,
    sectionId: sectionId || 'unknown',
    sectionOffsetY
  })

  const data = JSON.stringify(pathsRef.current)
  onUpdate(data)
}, [mode, strokeColor, strokeWidth, headingPositions])
```

**Add Props:**
- `headingPositions: HeadingPosition[]` - needed for section determination

## Phase 2: Implement Coordinate Transformation Logic

### 2.1 Create Stroke Repositioning Utility

**New File**: `src/lib/annotations/reposition-strokes.ts`

```typescript
export interface StrokeData {
  points: Array<{ x: number; y: number; pressure: number }>
  mode: 'draw' | 'erase'
  color: string
  width: number
  sectionId: string
  sectionOffsetY: number
}

export interface HeadingPosition {
  sectionId: string
  offsetY: number
  headingText: string
}

export interface RepositionResult {
  strokes: StrokeData[]
  orphanedCount: number
}

/**
 * Determines which section a stroke belongs to based on majority of points
 */
function findStrokeMajoritySection(
  stroke: StrokeData,
  headingPositions: HeadingPosition[]
): string | null {
  const sectionCounts = new Map<string, number>()

  // Sort headings by offsetY for binary search
  const sorted = [...headingPositions].sort((a, b) => a.offsetY - b.offsetY)

  // Count points in each section
  stroke.points.forEach(point => {
    const absoluteY = point.y + stroke.sectionOffsetY

    // Find section containing this point
    let sectionId: string | null = null
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (absoluteY >= sorted[i].offsetY) {
        sectionId = sorted[i].sectionId
        break
      }
    }

    if (sectionId) {
      sectionCounts.set(sectionId, (sectionCounts.get(sectionId) || 0) + 1)
    }
  })

  // Find section with most points
  let maxCount = 0
  let majoritySection: string | null = null

  sectionCounts.forEach((count, sectionId) => {
    if (count > maxCount) {
      maxCount = count
      majoritySection = sectionId
    }
  })

  return majoritySection
}

/**
 * Repositions strokes based on new heading positions
 */
export function repositionStrokes(
  strokes: StrokeData[],
  currentHeadingPositions: HeadingPosition[]
): RepositionResult {
  const repositioned: StrokeData[] = []
  let orphanedCount = 0

  strokes.forEach(stroke => {
    // First, determine which section this stroke belongs to
    const majoritySection = findStrokeMajoritySection(stroke, currentHeadingPositions)

    if (!majoritySection) {
      // Stroke is before any headings or couldn't be determined
      // Keep at absolute position
      repositioned.push(stroke)
      return
    }

    // Find current position of this section
    const currentHeading = currentHeadingPositions.find(h => h.sectionId === majoritySection)

    if (!currentHeading) {
      // Section was deleted - mark as orphaned
      orphanedCount++
      repositioned.push({
        ...stroke,
        sectionId: majoritySection + '-ORPHANED'
      })
      return
    }

    // Calculate offset delta
    const delta = currentHeading.offsetY - stroke.sectionOffsetY

    // Transform all points
    const transformedPoints = stroke.points.map(point => ({
      ...point,
      y: point.y + delta
    }))

    // Update stroke with new data
    repositioned.push({
      ...stroke,
      points: transformedPoints,
      sectionId: majoritySection,
      sectionOffsetY: currentHeading.offsetY
    })
  })

  return { strokes: repositioned, orphanedCount }
}
```

### 2.2 Integrate Repositioning in annotation-layer.tsx

**Add to load effect:**
```typescript
useEffect(() => {
  if (!pageId || !pageVersion) return

  getPageAnnotations(pageId).then(pageAnnotation => {
    if (pageAnnotation && pageAnnotation.canvasData) {
      let strokes: StrokeData[] = JSON.parse(pageAnnotation.canvasData)

      // Check if repositioning is needed
      const storedOffsets = pageAnnotation.headingOffsets || {}
      const currentOffsets = Object.fromEntries(
        headingPositions.map(h => [h.sectionId, h.offsetY])
      )

      const needsReposition = Object.keys(storedOffsets).some(
        key => storedOffsets[key] !== currentOffsets[key]
      )

      if (needsReposition && headingPositions.length > 0) {
        const result = repositionStrokes(strokes, headingPositions)
        strokes = result.strokes
        setOrphanedStrokesCount(result.orphanedCount)
      }

      setCanvasData(JSON.stringify(strokes))
    }
  })
}, [pageId, pageVersion, headingPositions])
```

**Update save function:**
```typescript
const performSave = useCallback(async () => {
  if (!canvasData || !pageId || !pageVersion) return

  const strokes = JSON.parse(canvasData)
  if (strokes.length === 0) return

  // Build heading offsets map
  const headingOffsets = Object.fromEntries(
    headingPositions.map(h => [h.sectionId, h.offsetY])
  )

  await savePageAnnotations(pageId, pageVersion, canvasData, headingOffsets)
}, [canvasData, pageId, pageVersion, headingPositions])
```

## Phase 3: Orphaned Stroke Handling

### 3.1 Add State
```typescript
const [orphanedStrokesCount, setOrphanedStrokesCount] = useState(0)
```

### 3.2 Add Warning Banner Component
```typescript
{orphanedStrokesCount > 0 && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5" />
      <span>
        {orphanedStrokesCount} annotation{orphanedStrokesCount > 1 ? 's are' : ' is'} orphaned (original section{orphanedStrokesCount > 1 ? 's' : ''} deleted)
      </span>
      <button
        onClick={handleRemoveOrphans}
        className="ml-4 px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-sm"
      >
        Remove Orphaned
      </button>
    </div>
  </div>
)}
```

### 3.3 Add Orphan Removal Handler
```typescript
const handleRemoveOrphans = useCallback(() => {
  if (!canvasData) return

  const strokes: StrokeData[] = JSON.parse(canvasData)
  const filtered = strokes.filter(stroke => !stroke.sectionId.endsWith('-ORPHANED'))

  setCanvasData(JSON.stringify(filtered))
  setOrphanedStrokesCount(0)

  // Trigger save
  debouncedSaveRef.current?.()
}, [canvasData])
```

## Phase 4: Single Canvas Rendering

### 4.1 Replace Portal Rendering

**Remove:**
```typescript
{sections.map(section => createPortal(...))}
```

**Add:**
```typescript
{pageHeight > 0 && (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: pageHeight,
      pointerEvents: canPan ? 'none' : 'auto',
      zIndex: 10
    }}
  >
    <SimpleCanvas
      ref={canvasRef}
      width={CANVAS_WIDTH_PX}
      height={pageHeight}
      mode={mode}
      color={color}
      strokeWidth={strokeWidth}
      onUpdate={handleCanvasUpdate}
      initialData={canvasData}
      headingPositions={headingPositions}
    />
  </div>
)}
```

### 4.2 Add Page Height Measurement

```typescript
const [pageHeight, setPageHeight] = useState(0)

useEffect(() => {
  if (!contentRef.current) return

  const timer = setTimeout(() => {
    const height = contentRef.current!.scrollHeight
    setPageHeight(height)
  }, 500)

  return () => clearTimeout(timer)
}, [children])
```

## Phase 5: Remove Obsolete Code

### Files to Review
1. **src/lib/rehype-plugins/wrap-sections.ts**
   - Check if `<section>` wrappers still needed for semantic structure
   - If only used for canvas portals, can be removed
   - Keep if sections serve other purposes (styling, navigation, etc.)

2. **Section-related CSS**
   - Review styles for `.annotation-section`
   - Keep if sections provide visual structure
   - Remove if purely for canvas positioning

### Clean Up annotation-layer.tsx
- Remove commented-out multi-canvas code
- Clean up unused imports
- Remove debug console.logs
- Update comments to reflect new architecture

## Phase 6: Testing & Validation

### 6.1 Manual Test Cases
1. **Fresh Page Drawing**
   - Draw annotations on a fresh page
   - Save and reload - verify annotations appear correctly

2. **Content Addition Above**
   - Draw annotations
   - Add new content above the annotations
   - Verify annotations move down with their sections

3. **Section Movement**
   - Draw in multiple sections
   - Reorder/edit content to move sections
   - Verify each annotation moves with its section

4. **Section Deletion**
   - Draw in a section
   - Delete that heading/section
   - Verify orphan warning appears
   - Test "Remove Orphaned" button

5. **Multi-Section Strokes**
   - Draw a stroke that spans multiple sections
   - Edit content to move sections
   - Verify stroke moves with majority section

6. **Zoom/Pan**
   - Test annotation drawing at various zoom levels
   - Verify coordinates are correctly scaled
   - Test panning while drawing

### 6.2 Performance Testing
- Test with long pages (50+ sections)
- Measure canvas redraw time
- Check for visual artifacts or borders
- Verify smooth drawing experience

### 6.3 Migration Testing
- Create annotations with old multi-canvas system
- Verify migration loads and displays correctly
- Check that old data is transformed properly

## Expected Outcomes

### Benefits
1. **Seamless Paper Experience**: No vertical borders between canvases
2. **Intelligent Repositioning**: Annotations follow their content when page changes
3. **Data Preservation**: Orphaned annotations are tracked, not silently lost
4. **Cleaner Architecture**: Single canvas simplifies rendering and state management

### Potential Issues & Mitigations
1. **Large Canvas Performance**:
   - Mitigation: Canvas size limited to page height, rendered once
   - High-DPI scaling already optimized

2. **Complex Repositioning Logic**:
   - Mitigation: Binary search for section lookup (O(log n))
   - Majority-point algorithm is O(n*m) but runs only on load

3. **Orphaned Stroke Edge Cases**:
   - Mitigation: Clear warning UI with explicit user action required

## Implementation Order
1. Phase 1 - Fix broken code, get system functional again
2. Phase 4 - Implement single canvas rendering
3. Phase 2 - Add coordinate transformation
4. Phase 3 - Handle orphaned strokes
5. Phase 5 - Clean up obsolete code
6. Phase 6 - Test thoroughly

## Files Modified
- `src/components/annotations/annotation-layer.tsx` - Main changes
- `src/components/annotations/simple-canvas.tsx` - Add section tracking
- `src/lib/annotations/reposition-strokes.ts` - New utility file (create)
- `src/lib/indexeddb/annotations.ts` - No changes needed (already complete)

## Estimated Complexity
- **Phase 1-2**: Medium complexity (refactoring + new logic)
- **Phase 3**: Low complexity (UI + simple filtering)
- **Phase 4**: Medium complexity (canvas positioning)
- **Phase 5**: Low complexity (cleanup)
- **Phase 6**: Variable (depends on issues found)

Total: ~2-3 hours of focused development work
