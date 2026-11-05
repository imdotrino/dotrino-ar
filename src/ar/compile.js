// Prepara una obra para reconocerla: saca de la foto los puntos que la cámara buscará.
// Todo ocurre en el aparato; la foto no sale de aquí.
import { Compiler } from 'mind-ar/dist/mindar-image.prod.js'

// Lado mayor con el que se prepara. Más grande no reconoce mejor y tarda mucho más.
const MAX_SIDE = 1024

/**
 * @param {Blob} blob
 * @returns {Promise<ImageBitmap>}
 */
async function decodeImage (blob) {
  try {
    return await createImageBitmap(blob)
  } catch (e) {
    throw Object.assign(new Error(`could not decode the image: ${/** @type {{ message?: string }} */ (e).message}`), { code: 'bad-image' })
  }
}

/**
 * @param {Blob} blob la foto de la obra
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<{ data: Uint8Array<ArrayBuffer>, width: number, height: number }>}
 */
export async function compileTarget (blob, onProgress) {
  const bitmap = await decodeImage(blob)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('could not get a 2d canvas context')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const compiler = new Compiler()
  await compiler.compileImageTargets([canvas], onProgress)
  return { data: compiler.exportData(), width: canvas.width, height: canvas.height }
}
