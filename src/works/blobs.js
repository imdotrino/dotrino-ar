// Los BYTES de las obras (la foto, sus datos de reconocimiento y lo que se pone encima).
// Son del content (dotrino-content): esta app ES el node por defecto, así que siempre se
// guardan en el aparato (`@dotrino/content-client/local`), y si el usuario tiene un node
// encendido, además van a él, cifrados. La lista de obras —lo que debe estar siempre a
// mano— es del store (./repo.js), y allí queda la referencia de cada copia.
//
// Sin node no se pierde nada: la app sigue con lo del aparato. Lo que no cabe por el plano
// de control del content (256 KB hoy) se queda solo en el aparato hasta que el content
// acepte archivos grandes.
import { nodeSession } from '@dotrino/content-client/session'
import { putLocal, getLocal, removeLocal } from '@dotrino/content-client/local'
import { getIdentity } from '../services/identity.js'

// El node de esta sesión: se intenta una vez; sin node se sigue con lo del aparato.
const session = nodeSession(getIdentity, { onError: (e) => console.warn('[ar] content node unreachable:', e?.message || e) })
const userNode = () => session.node()

/**
 * Guarda un archivo de una obra.
 * @returns {Promise<{ cid: string, mime: string, size: number, remote?: { owner: string, cid: string, key: string|null } }>}
 */
export async function putBlob (blob) {
  const local = await putLocal(blob)
  const n = await userNode()
  if (!n) return local
  try {
    const ref = await n.put(new Uint8Array(await blob.arrayBuffer()), { mime: local.mime })
    return { ...local, remote: { owner: ref.owner, cid: ref.cid, key: ref.key } }
  } catch (e) {
    if (e?.code !== 'too-large') console.warn('[ar] could not copy to the content node:', e?.message || e)
    return local
  }
}

/** Los bytes de un archivo: del aparato y, si aquí no están, del node del usuario. */
export async function getBlob (entry) {
  try {
    return await getLocal(entry.cid)
  } catch (e) {
    if (e?.code !== 'local-missing' || !entry.remote) throw e
    const n = await userNode()
    if (!n) throw Object.assign(new Error(`blob ${entry.cid} is not on this device and no content node answered`), { code: 'blob-missing' })
    const bytes = await n.get(entry.remote)
    const blob = new Blob([bytes], { type: entry.mime })
    await putLocal(blob)
    return blob
  }
}

export async function removeBlob (entry) {
  await removeLocal(entry.cid)
  if (!entry.remote) return
  const n = await userNode()
  if (n) await n.remove(entry.remote.cid)
}
