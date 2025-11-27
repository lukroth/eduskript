/**
 * User Data Module
 *
 * Provides local-first data persistence with optional cloud sync.
 *
 * Usage:
 *
 * 1. Wrap your app with UserDataProvider:
 *    ```tsx
 *    <UserDataProvider>
 *      <App />
 *    </UserDataProvider>
 *    ```
 *
 * 2. Use the hooks in your components:
 *    ```tsx
 *    const { data, updateData, isLoading } = useSyncedUserData<CodeEditorData>(
 *      pageId,
 *      'code',
 *      initialData
 *    )
 *    ```
 *
 * 3. (Optional) Show sync status:
 *    ```tsx
 *    <SyncStatusIndicator />
 *    ```
 */

// Core types
export type {
  UserDataRecord,
  UserDataKey,
  AnnotationData,
  CodeEditorData,
  PythonFile,
  SaveOptions,
  UseUserDataResult,
  UserDataVersion,
  VersionBlob,
  CreateVersionOptions,
  VersionSummary,
} from './types'

// Adapters
export type { DataAdapter, EditorSettings, UserPreferences } from './adapters'
export {
  codeAdapter,
  annotationsAdapter,
  settingsAdapter,
  preferencesAdapter,
  adapterRegistry,
  getAdapter,
} from './adapters'

// Service (singleton)
export { userDataService, UserDataService } from './userDataService'

// Sync engine
export type { SyncStatus, SyncItem, ManifestItem } from './sync-engine'
export { syncEngine, SyncEngine } from './sync-engine'

// React hooks (basic, local-only)
export {
  useUserData,
  useUserDataExists,
  useVersionHistory,
  useCreateVersion,
  useRestoreVersion,
  useDeleteVersion,
  useUpdateVersionLabel,
} from './hooks'

// React provider and synced hooks
export {
  UserDataProvider,
  useUserDataContext,
  useSyncStatus,
  useSyncedUserData,
} from './provider'

// Database (for advanced use)
export { db, UserDataDatabase } from './schema'

// Compression utilities
export {
  generateSHA256,
  gzipCompress,
  gzipDecompress,
  calculateSize,
} from './compression'
