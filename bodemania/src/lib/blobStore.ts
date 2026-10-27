/** Guarda arquivos grandes (STL do cliente) no IndexedDB, para sobreviverem ao recarregar a página até o checkout. */
const DB = 'bodemania-files'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const putFile = (key: string, file: Blob) => tx('readwrite', (s) => s.put(file, key)).then(() => undefined)
export const getFile = (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key))
export const deleteFile = (key: string) => tx('readwrite', (s) => s.delete(key)).then(() => undefined)
