// Identidad = vault id.dotrino.com (@dotrino/identity), única fuente de identidad del
// ecosistema. Solo se cachea la conexión para no abrir dos iframes. La cámara y la
// lista de obras necesitan el almacén, que se abre con ella.
import { Identity } from '@dotrino/identity'

/** @type {Identity | null} */
let identity = null

/** @returns {Promise<Identity | null>} la conexión con la bóveda, o null si no responde */
export async function getIdentity () {
  if (identity) return identity
  try {
    identity = await Identity.connect()
  } catch (e) {
    console.warn('[ar] vault unreachable:', /** @type {{ message?: string } | null | undefined} */ (e)?.message || e)
    identity = null
  }
  return identity
}
