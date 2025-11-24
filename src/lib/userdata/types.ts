/**
 * User Data Service Types
 *
 * Defines the data structures for local user data persistence
 * with future support for remote sync.
 */

/**
 * Primary key for user data records
 */
export interface UserDataKey {
  pageId: string      // Database ID of the page
  componentId: string // Component identifier (e.g., "code-editor-0", "annotations")
}

/**
 * User data record stored in IndexedDB
 */
export interface UserDataRecord<T = any> {
  pageId: string          // Database ID of the page
  componentId: string     // Component identifier
  userId?: string         // Optional: user ID for future remote sync
  data: T                 // Component-specific data
  createdAt: string       // ISO timestamp of creation
  updatedAt: number       // Unix timestamp of last update
  savedToRemote: boolean  // Whether synced to remote (future use)
  version: number         // Version for optimistic concurrency control
}

/**
 * Annotation-specific data structure
 */
export interface AnnotationData {
  canvasData: string                      // JSON stringified stroke data
  headingOffsets: Record<string, number>  // Section positioning
  pageVersion: string                     // Content hash for version tracking
  paddingLeft?: number                    // Paper left padding when saved (for horizontal repositioning)
}

/**
 * Code editor-specific data structure
 */
export interface CodeEditorData {
  files: PythonFile[]       // Array of Python files
  activeFileIndex: number   // Currently active file
  fontSize?: number         // Editor font size
  editorWidth?: number      // Split percentage
  canvasTransform?: {       // Turtle canvas transform
    x: number
    y: number
    scale: number
  }
}

export interface PythonFile {
  name: string
  content: string
}

/**
 * Options for saving user data
 */
export interface SaveOptions {
  debounce?: number  // Milliseconds to debounce saves (default: 1000)
  immediate?: boolean // Skip debounce and save immediately
}

/**
 * Hook return value
 */
export interface UseUserDataResult<T> {
  data: T | null
  updateData: (data: T, options?: SaveOptions) => Promise<void>
  deleteData: () => Promise<void>
  isLoading: boolean
  isSynced: boolean
  lastUpdated: number | null
}

/**
 * Version history record
 */
export interface UserDataVersion {
  id?: number                    // Auto-increment primary key
  pageId: string                 // Foreign key to main record
  componentId: string            // Foreign key to main record
  versionNumber: number          // Sequential version number
  dataHash: string               // SHA-256 hash of data for deduplication
  blobId: string                 // Reference to versionBlobs table
  createdAt: number              // Unix timestamp
  label?: string                 // Optional user label ("checkpoint", "before clear")
  sizeBytes: number              // Uncompressed size for metrics
  isManualSave?: boolean         // True if manually saved by user, false for autosaves
}

/**
 * Deduplicated version blob storage
 */
export interface VersionBlob {
  blobId: string                 // SHA-256 hash (primary key)
  data: Blob                     // gzip compressed data
  refCount: number               // How many versions reference this
  createdAt: number              // For cleanup
}

/**
 * Options for creating a version
 */
export interface CreateVersionOptions extends SaveOptions {
  label?: string                 // Optional label for this version
  isManualSave?: boolean         // True if manually saved by user
}

/**
 * Version history summary for UI
 */
export interface VersionSummary {
  versionNumber: number
  createdAt: number
  label?: string
  sizeBytes: number
  canRestore: boolean
  isManualSave?: boolean
}
