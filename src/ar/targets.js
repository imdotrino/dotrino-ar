// Los datos de reconocimiento de una obra. El compilador de MindAR produce un paquete
// (msgpack) con una entrada por imagen; aquí cada obra guarda el suyo, de una sola
// entrada, y al abrir la cámara se juntan los de la galería en un paquete.
// Así añadir una obra no obliga a volver a preparar las demás.
import { decode, encode } from '@msgpack/msgpack'

// Versión del formato que entiende mind-ar 1.2.x (CURRENT_VERSION en compiler-base.js).
export const TARGET_FORMAT = 2

function entriesOf (buffer) {
  const pack = decode(new Uint8Array(buffer))
  if (!pack || pack.v !== TARGET_FORMAT) {
    throw Object.assign(new Error(`unsupported target format: ${pack?.v}`), { code: 'bad-target' })
  }
  if (!Array.isArray(pack.dataList) || pack.dataList.length === 0) {
    throw Object.assign(new Error('target pack has no entries'), { code: 'bad-target' })
  }
  return pack.dataList
}

/**
 * Junta varios paquetes en uno. El orden de salida es el de entrada: la entrada i del
 * resultado es la obra i.
 * @param {ArrayBuffer[]} buffers un paquete por obra, cada uno con UNA entrada
 * @returns {Uint8Array}
 */
export function mergeTargets (buffers) {
  if (!buffers.length) throw Object.assign(new Error('no targets to merge'), { code: 'bad-target' })
  const dataList = []
  for (const buffer of buffers) {
    const entries = entriesOf(buffer)
    if (entries.length !== 1) {
      throw Object.assign(new Error(`expected one entry per work, got ${entries.length}`), { code: 'bad-target' })
    }
    dataList.push(entries[0])
  }
  return encode({ v: TARGET_FORMAT, dataList })
}

/** Ancho y alto con los que se preparó cada imagen del paquete. */
export function targetSizes (buffer) {
  return entriesOf(buffer).map(e => ({ width: e.targetImage.width, height: e.targetImage.height }))
}
