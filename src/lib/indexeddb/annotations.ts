import Dexie, { Table } from 'dexie'

// Section annotation data structure
export interface SectionAnnotation {
  sectionId: string
  headingText: string
  canvasData: string // JSON stringified canvas data
  createdAt: number
  updatedAt: number
}

// Page annotation container
export interface PageAnnotation {
  pageId: string // Primary key
  pageVersion: string // Content hash for version tracking
  sections: SectionAnnotation[]
  createdAt: number
  updatedAt: number
}

// Dexie database class
class AnnotationDatabase extends Dexie {
  annotations!: Table<PageAnnotation, string>

  constructor() {
    super('EduskriptAnnotations')

    this.version(1).stores({
      annotations: 'pageId, pageVersion, updatedAt'
    })
  }
}

// Singleton instance
export const annotationDb = new AnnotationDatabase()

// Helper functions for annotation management

/**
 * Get annotations for a specific page
 */
export async function getPageAnnotations(pageId: string): Promise<PageAnnotation | undefined> {
  try {
    return await annotationDb.annotations.get(pageId)
  } catch (error) {
    console.error('Error getting page annotations:', error)
    return undefined
  }
}

/**
 * Save or update page annotations
 */
export async function savePageAnnotations(pageId: string, pageVersion: string, sections: SectionAnnotation[]): Promise<void> {
  try {
    const now = Date.now()
    const existing = await annotationDb.annotations.get(pageId)

    if (existing) {
      await annotationDb.annotations.update(pageId, {
        pageVersion,
        sections,
        updatedAt: now
      })
    } else {
      await annotationDb.annotations.add({
        pageId,
        pageVersion,
        sections,
        createdAt: now,
        updatedAt: now
      })
    }
  } catch (error) {
    console.error('Error saving page annotations:', error)
    throw error
  }
}

/**
 * Update a single section's annotation
 */
export async function updateSectionAnnotation(
  pageId: string,
  pageVersion: string,
  sectionId: string,
  headingText: string,
  canvasData: string
): Promise<void> {
  try {
    const existing = await annotationDb.annotations.get(pageId)
    const now = Date.now()

    if (existing) {
      // Update existing section or add new one
      const sectionIndex = existing.sections.findIndex(s => s.sectionId === sectionId)

      if (sectionIndex >= 0) {
        // Update existing section
        existing.sections[sectionIndex] = {
          sectionId,
          headingText,
          canvasData,
          createdAt: existing.sections[sectionIndex].createdAt,
          updatedAt: now
        }
      } else {
        // Add new section
        existing.sections.push({
          sectionId,
          headingText,
          canvasData,
          createdAt: now,
          updatedAt: now
        })
      }

      await annotationDb.annotations.update(pageId, {
        pageVersion,
        sections: existing.sections,
        updatedAt: now
      })
    } else {
      // Create new page annotation with first section
      await annotationDb.annotations.add({
        pageId,
        pageVersion,
        sections: [{
          sectionId,
          headingText,
          canvasData,
          createdAt: now,
          updatedAt: now
        }],
        createdAt: now,
        updatedAt: now
      })
    }
  } catch (error) {
    console.error('Error updating section annotation:', error)
    throw error
  }
}

/**
 * Delete a section's annotation
 */
export async function deleteSectionAnnotation(pageId: string, sectionId: string): Promise<void> {
  try {
    const existing = await annotationDb.annotations.get(pageId)
    if (existing) {
      existing.sections = existing.sections.filter(s => s.sectionId !== sectionId)

      if (existing.sections.length === 0) {
        // If no sections left, delete the entire page annotation
        await annotationDb.annotations.delete(pageId)
      } else {
        await annotationDb.annotations.update(pageId, {
          sections: existing.sections,
          updatedAt: Date.now()
        })
      }
    }
  } catch (error) {
    console.error('Error deleting section annotation:', error)
    throw error
  }
}

/**
 * Clear all annotations for a page
 */
export async function clearPageAnnotations(pageId: string): Promise<void> {
  try {
    await annotationDb.annotations.delete(pageId)
  } catch (error) {
    console.error('Error clearing page annotations:', error)
    throw error
  }
}

/**
 * Check if page version has changed
 */
export async function checkVersionMismatch(pageId: string, currentVersion: string): Promise<boolean> {
  try {
    const existing = await annotationDb.annotations.get(pageId)
    if (!existing) return false
    return existing.pageVersion !== currentVersion
  } catch (error) {
    console.error('Error checking version mismatch:', error)
    return false
  }
}

/**
 * Export all annotations as JSON
 */
export async function exportAnnotations(): Promise<string> {
  try {
    const allAnnotations = await annotationDb.annotations.toArray()
    return JSON.stringify(allAnnotations, null, 2)
  } catch (error) {
    console.error('Error exporting annotations:', error)
    throw error
  }
}

/**
 * Import annotations from JSON
 */
export async function importAnnotations(jsonData: string): Promise<void> {
  try {
    const annotations = JSON.parse(jsonData) as PageAnnotation[]
    await annotationDb.annotations.bulkPut(annotations)
  } catch (error) {
    console.error('Error importing annotations:', error)
    throw error
  }
}

/**
 * Generate content hash for versioning
 */
export async function generateContentHash(content: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side: use simple hash
    return Buffer.from(content).toString('base64').slice(0, 8)
  }

  // Client-side: use crypto.subtle for proper hash
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.slice(0, 16) // First 16 chars of SHA-256
}
