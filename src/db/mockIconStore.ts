const STORE = 'icons'
const DB_NAME = 'remontti-mock-db'
const DB_VERSION = 5

export interface StoredIcon {
  login: string
  blob: Blob
  /** "Публичный" URL в формате реального API (/uploads/mock-<uuid>.png). */
  icon_url: string
  mime: string
}

/** Карта icon_url → blob URL (живёт в памяти, восстанавливается на старте). */
const blobUrls = new Map<string, string>()

function newUuid(): string {
  const c = (crypto as { randomUUID?: () => string }).randomUUID
  if (c) return c()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Возвращает расширение под mime-тип для icon_url. */
function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  return 'png'
}

function openIconsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'login' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  return openIconsDB().then(
    db =>
      new Promise<T | void>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const req = fn(store)
        t.oncomplete = () => {
          if (req && 'result' in req) resolve(req.result as T)
          else resolve()
        }
        t.onerror = () => reject(t.error)
      })
  )
}

/**
 * Восстанавливает blob URL для всех иконок из IndexedDB. Вызывается на старте
 * приложения — иначе после F5 живые ссылки на blob потеряются и иконка пропадёт.
 */
export async function initMockIconStore(): Promise<void> {
  const items = await tx<StoredIcon[]>(
    'readonly',
    store => store.getAll() as IDBRequest<StoredIcon[]>
  )
  if (!items) return
  for (const item of items) {
    if (!blobUrls.has(item.icon_url)) {
      blobUrls.set(item.icon_url, URL.createObjectURL(item.blob))
    }
  }
}

/** Возвращает blob-URL, который реально отрисуется в <img>. null если неизвестно. */
export function resolveMockIconUrl(icon_url: string | undefined | null): string | null {
  if (!icon_url) return null
  return blobUrls.get(icon_url) ?? null
}

/** Возвращает сохранённую иконку пользователя (или undefined, если её нет). */
export async function getIcon(login: string): Promise<StoredIcon | undefined> {
  const result = await tx<StoredIcon | undefined>(
    'readonly',
    store => store.get(login) as IDBRequest<StoredIcon | undefined>
  )
  return result ?? undefined
}

/**
 * Сохраняет blob как иконку пользователя. Возвращает публичный icon_url.
 * Если у пользователя уже была иконка — старый blob URL отзывается.
 */
export async function setIcon(login: string, blob: Blob): Promise<string> {
  const mime = blob.type || 'image/png'
  const existing = await getIcon(login)
  if (existing && blobUrls.has(existing.icon_url)) {
    URL.revokeObjectURL(blobUrls.get(existing.icon_url)!)
    blobUrls.delete(existing.icon_url)
  }
  const icon_url = `/uploads/mock-${newUuid()}.${extForMime(mime)}`
  const record: StoredIcon = { login, blob, icon_url, mime }
  await tx('readwrite', store => store.put(record))
  blobUrls.set(icon_url, URL.createObjectURL(blob))
  return icon_url
}

/** Снимает иконку пользователя. Идемпотентно: отсутствие — не ошибка. */
export async function deleteIcon(login: string): Promise<void> {
  const existing = await getIcon(login)
  if (existing && blobUrls.has(existing.icon_url)) {
    URL.revokeObjectURL(blobUrls.get(existing.icon_url)!)
    blobUrls.delete(existing.icon_url)
  }
  await tx('readwrite', store => store.delete(login))
}

/** Список всех сохранённых иконок (login → icon_url). Нужен getUsers. */
export async function listIcons(): Promise<Map<string, string>> {
  const items = await tx<StoredIcon[]>(
    'readonly',
    store => store.getAll() as IDBRequest<StoredIcon[]>
  )
  const map = new Map<string, string>()
  if (!items) return map
  for (const item of items) map.set(item.login, item.icon_url)
  return map
}
