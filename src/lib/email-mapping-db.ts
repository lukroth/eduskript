/**
 * IndexedDB storage for teacher's email mappings
 * Stores real email -> pseudonym mappings locally (never sent to server)
 */

const DB_NAME = 'eduskript_teacher_data'
const STORE_NAME = 'email_mappings'
const DB_VERSION = 1

interface EmailMapping {
  classId: string
  realEmail: string
  pseudonymEmail: string
  addedAt: number
}

let dbInstance: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { autoIncrement: true })
        // Create indexes for efficient querying
        store.createIndex('classId', 'classId', { unique: false })
        store.createIndex('realEmail', 'realEmail', { unique: false })
        store.createIndex('pseudonymEmail', 'pseudonymEmail', { unique: false })
        store.createIndex('classEmail', ['classId', 'realEmail'], { unique: true })
      }
    }
  })
}

export async function saveEmailMapping(
  classId: string,
  realEmail: string,
  pseudonymEmail: string
): Promise<void> {
  const db = await getDB()
  const transaction = db.transaction([STORE_NAME], 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('classEmail')

  // Check if mapping already exists
  const existing = await new Promise<EmailMapping | undefined>((resolve, reject) => {
    const request = index.get([classId, realEmail])
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  if (existing) {
    // Update existing mapping
    const cursorRequest = index.openCursor([classId, realEmail])
    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (cursor) {
          cursor.update({
            classId,
            realEmail,
            pseudonymEmail,
            addedAt: Date.now(),
          })
          resolve()
        }
      }
      cursorRequest.onerror = () => reject(cursorRequest.error)
    })
  } else {
    // Add new mapping
    await new Promise<void>((resolve, reject) => {
      const request = store.add({
        classId,
        realEmail,
        pseudonymEmail,
        addedAt: Date.now(),
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export async function saveEmailMappings(
  classId: string,
  mappings: Record<string, string>
): Promise<void> {
  for (const [realEmail, pseudonymEmail] of Object.entries(mappings)) {
    await saveEmailMapping(classId, realEmail, pseudonymEmail)
  }
}

export async function getEmailMappingsForClass(
  classId: string
): Promise<Record<string, string>> {
  const db = await getDB()
  const transaction = db.transaction([STORE_NAME], 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('classId')

  return new Promise((resolve, reject) => {
    const request = index.getAll(classId)
    request.onsuccess = () => {
      const mappings: Record<string, string> = {}
      const results = request.result as EmailMapping[]
      for (const mapping of results) {
        mappings[mapping.realEmail] = mapping.pseudonymEmail
      }
      resolve(mappings)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getRealEmail(
  classId: string,
  pseudonymEmail: string
): Promise<string | null> {
  const db = await getDB()
  const transaction = db.transaction([STORE_NAME], 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('pseudonymEmail')

  return new Promise((resolve, reject) => {
    const request = index.getAll(pseudonymEmail)
    request.onsuccess = () => {
      const results = request.result as EmailMapping[]
      // Find the mapping for this specific class
      const mapping = results.find((m) => m.classId === classId)
      resolve(mapping ? mapping.realEmail : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getAllEmailMappings(): Promise<EmailMapping[]> {
  const db = await getDB()
  const transaction = db.transaction([STORE_NAME], 'readonly')
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
