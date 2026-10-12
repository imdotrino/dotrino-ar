// Lo que se ve encima de una obra: un plano con una imagen o un video.
import { LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture, VideoTexture } from 'three'

const FADE_SECONDS = 0.35

/**
 * @param {{ blob: Blob, kind: 'image'|'video', aspect: number }} opts aspect = alto/ancho de la obra
 */
export async function createOverlay ({ blob, kind, aspect }) {
  const url = URL.createObjectURL(blob)
  let texture
  let video = null
  if (kind === 'video') {
    video = document.createElement('video')
    video.setAttribute('playsinline', '')
    video.loop = true
    video.muted = true
    video.src = url
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true })
      video.addEventListener('error', () =>
        reject(Object.assign(new Error('this video format cannot be played here'), { code: 'bad-video' })), { once: true })
    })
    texture = new VideoTexture(video)
  } else if (kind === 'image') {
    texture = new Texture(await createImageBitmap(blob, { imageOrientation: 'flipY' }))
    texture.needsUpdate = true
  } else {
    throw Object.assign(new Error(`unknown overlay kind: ${kind}`), { code: 'bad-overlay' })
  }
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false

  const material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 })
  const mesh = new Mesh(new PlaneGeometry(1, aspect), material)
  let shown = false

  return {
    mesh,
    hasSound: kind === 'video',
    show () {
      shown = true
      if (video) video.play().catch(e => console.warn('[ar] overlay video did not start:', e.message))
    },
    hide () {
      shown = false
      material.opacity = 0
      if (video) video.pause()
    },
    setMuted (muted) { if (video) video.muted = muted },
    tick (dt) {
      if (shown && material.opacity < 1) material.opacity = Math.min(1, material.opacity + dt / FADE_SECONDS)
    },
    dispose () {
      if (video) { video.pause(); video.removeAttribute('src'); video.load() }
      texture.dispose()
      material.dispose()
      mesh.geometry.dispose()
      URL.revokeObjectURL(url)
    }
  }
}
