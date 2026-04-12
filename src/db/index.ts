const DB_NAME = 'remontti-mock-db'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('navigation')) {
        db.createObjectStore('navigation', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// === CRUD ===

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getById<T>(storeName: string, id: number): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function add<T>(storeName: string, data: T): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const request = tx.objectStore(storeName).add(data)
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function update<T extends { id: number }>(storeName: string, data: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const request = tx.objectStore(storeName).put(data)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function remove(storeName: string, id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const request = tx.objectStore(storeName).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// === Key-Value store (для auth и других одиночных данных) ===

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auth', 'readonly')
    const request = tx.objectStore('auth').get(key)
    request.onsuccess = () => resolve(request.result?.value)
    request.onerror = () => reject(request.error)
  })
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auth', 'readwrite')
    const request = tx.objectStore('auth').put({ key, value })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function kvDelete(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auth', 'readwrite')
    const request = tx.objectStore('auth').delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// === Seeding ===

/**
 * Add-only seeding: добавляет только те записи, которых ещё нет.
 * Существующие записи НЕ модифицирует.
 * @param keyField — поле для проверки уникальности (по умолчанию 'id')
 */
export async function seedStore<T>(
  storeName: string,
  initialData: T[],
  keyField: keyof T = 'id' as keyof T
): Promise<void> {
  const existing = await getAll<T>(storeName)
  const existingKeys = new Set(existing.map(item => (item as any)[keyField]))

  const toAdd = initialData.filter(item => {
    const key = (item as any)[keyField]
    return key === undefined || !existingKeys.has(key)
  })

  if (toAdd.length === 0) return

  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  toAdd.forEach(item => store.add(item))
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Sync seeding: обновляет существующие записи (по id) и добавляет новые.
 * Используется для данных, которые должны синхронизироваться с кодом (навигация, конфиги).
 */
export async function syncStore<T extends { id: number }>(storeName: string, data: T[]): Promise<void> {
  const existing = await getAll<T>(storeName)
  const existingMap = new Map(existing.map(item => [item.id, item]))

  const db = await openDB()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)

  for (const item of data) {
    if (existingMap.has(item.id)) {
      // Обновляем существующую запись
      store.put(item)
    } else {
      // Добавляем новую
      store.add(item)
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function resetDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
