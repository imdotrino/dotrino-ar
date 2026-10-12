// Identidad = vault id.dotrino.com (@dotrino/identity), única fuente de identidad del
// ecosistema. Solo se cachea la conexión para no abrir dos iframes. La cámara y la
// lista de obras necesitan el almacén, que se abre con ella.
import { Identity } from '@dotrino/identity'

let identity = null

export async function getIdentity () {
  if (identity) return identity
  try {
    identity = await Identity.connect()
  } catch (e) {
    console.warn('[ar] vault unreachable:', e?.message || e)
    identity = null
  }
  return identity
}
