// Los BYTES de las obras (la foto, sus datos de reconocimiento y lo que se pone encima)
// viven en este aparato, direccionados por su hash (`cid`), igual que en dotrino-content.
// La lista de obras —lo que debe estar siempre a mano— es del store (./repo.js); cuando
// el content admita estos tamaños, estos bytes pasan allí con el mismo cid.
const DB_NAME = 'dotrino-ar-blobs'
const STORE = 'blobs'

let opening = null

function db () {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'cid' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => { opening = null; reject(req.error) }
    })
  }
  return opening
}

function run (mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export async function cidOf (bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return 'sha256-' + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** @returns {Promise<{ cid: string, mime: string, size: number }>} */
export async function putBlob (blob) {
  const bytes = await blob.arrayBuffer()
  const cid = await cidOf(bytes)
  const mime = blob.type || 'application/octet-stream'
  await run('readwrite', s => s.put({ cid, mime, bytes }))
  return { cid, mime, size: bytes.byteLength }
}

export async function getBlob (cid) {
  const row = await run('readonly', s => s.get(cid))
  if (!row) throw Object.assign(new Error(`blob ${cid} is not on this device`), { code: 'blob-missing' })
  return new Blob([row.bytes], { type: row.mime })
}

export function removeBlob (cid) {
  return run('readwrite', s => s.delete(cid))
}
