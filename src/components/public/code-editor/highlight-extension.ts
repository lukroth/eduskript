/**
 * CodeMirror 6 extension for code highlighting
 *
 * Provides:
 * - StateField to track highlight decorations
 * - StateEffects to add/remove/set/clear highlights
 * - Automatic position updates when document changes
 * - Theme with highlight color styles
 *
 * ARCHITECTURE:
 * CodeMirror decorations (marks) can't store custom metadata like IDs.
 * We work around this by:
 * 1. Storing IDs in data-* attributes on the decoration
 * 2. Using a module-level Map to track metadata
 *
 * KNOWN LIMITATION (highlightMetaMap):
 * The metadata map is global to the module, not per-editor instance.
 * This is fine for single-editor pages but could cause issues if:
 * - Multiple editors share the same highlight IDs (unlikely with nanoid)
 * - An editor is created/destroyed rapidly (map not cleaned up)
 * TODO: Consider using StateField's facet system for per-editor storage.
 *
 * POSITION TRACKING:
 * When text is edited, highlights adjust automatically via decorations.map().
 * - Insertion BEFORE highlight: highlight shifts right
 * - Insertion INSIDE highlight: highlight expands
 * - Deletion: highlight shrinks or is removed if fully deleted
 * The mapPos() calls use assoc=1/-1 to control edge behavior.
 */

import { StateField, StateEffect, RangeSet, Prec } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { nanoid } from 'nanoid'
import type { HighlightColor, CodeHighlight } from '@/lib/userdata/types'

// StateEffects for modifying highlights
export const addHighlight = StateEffect.define<{
  from: number
  to: number
  color: HighlightColor
  id?: string
}>()
export const removeHighlight = StateEffect.define<string>()  // by id
export const removeHighlightsInRange = StateEffect.define<{ from: number; to: number }>()
export const setHighlights = StateEffect.define<Array<{ from: number; to: number; color: HighlightColor; id: string; isTeacher?: boolean }>>()
export const clearHighlights = StateEffect.define<void>()
// Replace all teacher highlights wholesale (removes old, adds new) - doesn't touch student highlights
export const replaceTeacherHighlights = StateEffect.define<Array<{ from: number; to: number; color: HighlightColor; id: string }>>()

// Color -> CSS class mapping
const colorClasses: Record<HighlightColor, string> = {
  red: 'cm-highlight-red',
  yellow: 'cm-highlight-yellow',
  green: 'cm-highlight-green',
  blue: 'cm-highlight-blue',
}

// Store highlight metadata alongside decorations
interface HighlightMeta {
  id: string
  color: HighlightColor
}

/**
 * Create a decoration mark for a highlight
 *
 * @param isTeacher - When true, adds cm-highlight-teacher class for visual distinction.
 *                    Teacher highlights render with dashed outline (see highlightTheme).
 *                    This is a display-only distinction - the highlight data structure
 *                    doesn't differentiate, only the rendering does.
 */
function createHighlightMark(color: HighlightColor, id: string, isTeacher: boolean = false) {
  const classes = [colorClasses[color]]
  if (isTeacher) {
    classes.push('cm-highlight-teacher')
  }
  return Decoration.mark({
    class: classes.join(' '),
    attributes: {
      'data-highlight-id': id,
      'data-highlight-color': color
    }
  })
}

// Track highlight metadata in a Map (id -> {from, to, color})
// This is needed because decorations don't store custom data
const highlightMetaMap = new Map<string, HighlightMeta & { from: number; to: number }>()

/**
 * StateField to track highlight decorations
 *
 * COMPLEXITY NOTE: This update function runs on EVERY transaction, even trivial ones.
 * For large documents with many highlights, the O(n) iteration over highlightMetaMap
 * could become noticeable. Current optimization: only iterate when changes exist.
 *
 * The field handles two concerns:
 * 1. Mapping decorations through document changes (automatic via decorations.map)
 * 2. Processing StateEffects to add/remove/set highlights
 */
export const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },

  update(decorations, tr) {
    // Map existing decorations through document changes
    // This automatically handles position updates on edits
    decorations = decorations.map(tr.changes)

    // Check if this transaction includes setHighlights (which replaces everything)
    // If so, skip metadata mapping since it will be cleared anyway
    const hasSetHighlights = tr.effects.some(e => e.is(setHighlights))

    // Also update the metadata map positions
    // SYNC ISSUE: If decorations and metaMap ever get out of sync (bug),
    // extractHighlights() reads from decorations (source of truth for rendering),
    // while metaMap is only used internally. This asymmetry is intentional.
    if (tr.changes.length > 0 && !hasSetHighlights) {
      const updatedMeta = new Map<string, HighlightMeta & { from: number; to: number }>()
      highlightMetaMap.forEach((meta, id) => {
        // Validate positions before mapping to avoid RangeError
        const docLen = tr.changes.length
        if (meta.from >= docLen || meta.to > docLen) {
          // Position out of range, skip this highlight
          return
        }
        const newFrom = tr.changes.mapPos(meta.from, 1)  // 1 = prefer after (sticky start)
        const newTo = tr.changes.mapPos(meta.to, -1)     // -1 = prefer before (sticky end)
        if (newTo > newFrom) {  // Only keep if still valid range
          updatedMeta.set(id, { ...meta, from: newFrom, to: newTo })
        }
      })
      highlightMetaMap.clear()
      updatedMeta.forEach((v, k) => highlightMetaMap.set(k, v))
    }

    for (const effect of tr.effects) {
      if (effect.is(setHighlights)) {
        // Replace all highlights
        highlightMetaMap.clear()
        const marks = effect.value
          .filter(h => h.from < tr.state.doc.length && h.to <= tr.state.doc.length && h.to > h.from)
          .map(h => {
            highlightMetaMap.set(h.id, { id: h.id, color: h.color, from: h.from, to: h.to })
            return createHighlightMark(h.color, h.id, h.isTeacher).range(h.from, h.to)
          })
        decorations = Decoration.set(marks, true)
      }

      if (effect.is(addHighlight)) {
        const { from, to, color, id: providedId } = effect.value
        if (from < tr.state.doc.length && to <= tr.state.doc.length && to > from) {
          const id = providedId || nanoid()
          highlightMetaMap.set(id, { id, color, from, to })
          decorations = decorations.update({
            add: [createHighlightMark(color, id).range(from, to)]
          })
        }
      }

      if (effect.is(removeHighlight)) {
        const idToRemove = effect.value
        highlightMetaMap.delete(idToRemove)
        // Filter out the decoration with this ID
        const ranges: { from: number; to: number; value: Decoration }[] = []
        decorations.between(0, tr.state.doc.length, (from, to, deco) => {
          const decoId = deco.spec.attributes?.['data-highlight-id']
          if (decoId !== idToRemove) {
            ranges.push({ from, to, value: deco })
          }
        })
        decorations = Decoration.set(ranges.map(r => r.value.range(r.from, r.to)), true)
      }

      if (effect.is(removeHighlightsInRange)) {
        const { from: rangeFrom, to: rangeTo } = effect.value
        // Remove highlights that overlap with the range
        const idsToRemove = new Set<string>()
        decorations.between(rangeFrom, rangeTo, (from, to, deco) => {
          const decoId = deco.spec.attributes?.['data-highlight-id']
          if (decoId) {
            idsToRemove.add(decoId)
          }
        })
        idsToRemove.forEach(id => highlightMetaMap.delete(id))

        const ranges: { from: number; to: number; value: Decoration }[] = []
        decorations.between(0, tr.state.doc.length, (from, to, deco) => {
          const decoId = deco.spec.attributes?.['data-highlight-id']
          if (!decoId || !idsToRemove.has(decoId)) {
            ranges.push({ from, to, value: deco })
          }
        })
        decorations = Decoration.set(ranges.map(r => r.value.range(r.from, r.to)), true)
      }

      if (effect.is(clearHighlights)) {
        highlightMetaMap.clear()
        decorations = Decoration.none
      }

      if (effect.is(replaceTeacherHighlights)) {
        // Keep only non-teacher highlights, then add new teacher highlights
        const studentRanges: { from: number; to: number; value: Decoration }[] = []
        decorations.between(0, tr.state.doc.length, (from, to, deco) => {
          // Check if this is a teacher highlight by looking for the class
          const classes = deco.spec.class || ''
          if (!classes.includes('cm-highlight-teacher')) {
            studentRanges.push({ from, to, value: deco })
          } else {
            // Remove from metadata map
            const id = deco.spec.attributes?.['data-highlight-id']
            if (id) highlightMetaMap.delete(id)
          }
        })

        // Add new teacher highlights
        const teacherMarks = effect.value
          .filter(h => h.from < tr.state.doc.length && h.to <= tr.state.doc.length && h.to > h.from)
          .map(h => {
            highlightMetaMap.set(h.id, { id: h.id, color: h.color, from: h.from, to: h.to })
            return createHighlightMark(h.color, h.id, true).range(h.from, h.to)
          })

        // Combine student highlights + new teacher highlights
        const allRanges = [
          ...studentRanges.map(r => r.value.range(r.from, r.to)),
          ...teacherMarks
        ]
        decorations = Decoration.set(allRanges, true)
      }
    }

    return decorations
  },
})

// Provide decorations to the view using compute()
const highlightDecorations = EditorView.decorations.compute([highlightField], state => {
  return state.field(highlightField)
})

/**
 * Extract current highlights from the editor state
 * Used for persistence to IndexedDB/server
 *
 * NOTE: This reads from decorations (the source of truth for what's rendered),
 * NOT from highlightMetaMap. The caller must merge with existing metadata
 * (authorId, comments) since those aren't stored in decorations.
 *
 * LIMITATION: createdAt is set to Date.now() on every extraction.
 * For new highlights this is correct, but for existing ones this overwrites
 * the original timestamp. The caller should preserve the original timestamp
 * when merging (see index.tsx handleApplyHighlight).
 */
export function extractHighlights(view: EditorView, fileIndex: number): CodeHighlight[] {
  const highlights: CodeHighlight[] = []
  const decorations = view.state.field(highlightField)

  decorations.between(0, view.state.doc.length, (from, to, deco) => {
    const id = deco.spec.attributes?.['data-highlight-id']
    const color = deco.spec.attributes?.['data-highlight-color'] as HighlightColor
    if (id && color) {
      highlights.push({
        id,
        fileIndex,
        from,
        to,
        color,
        createdAt: Date.now()
      })
    }
  })

  return highlights
}

/**
 * Check if there's a highlight at the given position
 */
export function getHighlightAtPosition(view: EditorView, pos: number): { id: string; color: HighlightColor } | null {
  const decorations = view.state.field(highlightField)
  let result: { id: string; color: HighlightColor } | null = null

  decorations.between(pos, pos, (from, to, deco) => {
    const id = deco.spec.attributes?.['data-highlight-id']
    const color = deco.spec.attributes?.['data-highlight-color'] as HighlightColor
    if (id && color) {
      result = { id, color }
    }
  })

  return result
}

/**
 * Check if selection overlaps with any highlights
 */
export function getHighlightsInRange(view: EditorView, from: number, to: number): Array<{ id: string; color: HighlightColor }> {
  const decorations = view.state.field(highlightField)
  const results: Array<{ id: string; color: HighlightColor }> = []

  decorations.between(from, to, (_, __, deco) => {
    const id = deco.spec.attributes?.['data-highlight-id']
    const color = deco.spec.attributes?.['data-highlight-color'] as HighlightColor
    if (id && color) {
      results.push({ id, color })
    }
  })

  return results
}

/**
 * Theme extension with highlight color styles
 * Using & to scope to the editor, then target highlight spans
 *
 * COLOR CHOICES: Using Tailwind palette colors at 40% opacity.
 * This works reasonably in both light and dark mode without separate dark variants.
 * If readability becomes an issue in dark mode, add :host-context(.dark) selectors.
 *
 * TEACHER DISTINCTION: Dashed outline uses currentColor (inherits text color)
 * to adapt to both themes automatically. The offset=-1px keeps the outline
 * inside the highlight bounds to avoid layout shift.
 */
export const highlightTheme = EditorView.theme({
  // & refers to the .cm-editor element, descendant selectors target marks
  '& .cm-highlight-red': {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: '2px',
  },
  '& .cm-highlight-yellow': {
    backgroundColor: 'rgba(234, 179, 8, 0.4)',
    borderRadius: '2px',
  },
  '& .cm-highlight-green': {
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: '2px',
  },
  '& .cm-highlight-blue': {
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: '2px',
  },
  // Teacher highlights have dashed outline to distinguish from student's own
  '& .cm-highlight-teacher': {
    outline: '1px dashed currentColor',
    outlineOffset: '-1px',
  },
})

/**
 * Combined extension for code highlighting
 * Uses Prec.high to ensure highlights render above syntax highlighting
 */
export function codeHighlighting() {
  return [
    highlightField,
    Prec.high(highlightDecorations),
    highlightTheme
  ]
}
