// Las obras del usuario. La lista vive en @dotrino/store (§4), atada al perfil; los bytes,
// en ./blobs.js. Sin repliegue: si el store no abre, se dice.
import { Store } from '@dotrino/store'
import { getIdentity } from '../services/identity.js'
import { putBlob, removeBlob } from './blobs.js'

const THREAD = 'ar.works'

let connecting = null

export function openStore () {
  if (!connecting) {
    connecting = getIdentity().then(identity => {
      if (!identity) throw Object.assign(new Error('identity not available'), { code: 'no-identity' })
      return Store.connect({ identity, adoptCommon: ['ar.'] })
    }).catch(e => {
      connecting = null
      throw e
    })
  }
  return connecting
}

/** @returns {Promise<object[]>} las obras, de la más antigua a la más nueva */
export async function listWorks () {
  const store = await openStore()
  const entries = await store.listThread(THREAD)
  return entries.map(e => {
    if (!e.doc) throw new Error(`entry ${e.id} in ${THREAD} has no document`)
    return e.doc
  }).sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * @param {{ title: string, photo: Blob, target: { data: Uint8Array, width: number, height: number }, overlay: Blob }} input
 */
export async function addWork ({ title, photo, target, overlay }) {
  const kind = overlay.type.startsWith('video/') ? 'video' : overlay.type.startsWith('image/') ? 'image' : null
  if (!kind) throw Object.assign(new Error(`unsupported overlay type: ${overlay.type || 'unknown'}`), { code: 'bad-overlay' })
  const store = await openStore()
  const work = {
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
    photo: await putBlob(photo),
    target: { ...await putBlob(new Blob([target.data], { type: 'application/x-mind' })), width: target.width, height: target.height },
    overlay: { ...await putBlob(overlay), kind }
  }
  await store.appendMessage(THREAD, { id: work.id, ts: work.createdAt, doc: work })
  return work
}

export async function removeWork (work) {
  const store = await openStore()
  await store.removeMessage(THREAD, work.id)
  // Un mismo archivo puede estar en dos obras: sus bytes se quedan mientras alguna los use.
  const inUse = new Set((await listWorks()).flatMap(w => [w.photo.cid, w.target.cid, w.overlay.cid]))
  for (const cid of [work.photo.cid, work.target.cid, work.overlay.cid]) {
    if (!inUse.has(cid)) await removeBlob(cid)
  }
}
