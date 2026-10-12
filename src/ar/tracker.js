// Cámara + seguimiento + escena. MindAR dice dónde está cada obra (una matriz por obra
// y por cuadro) y three.js pinta encima. No se usa el envoltorio de three que trae
// MindAR: está hecho contra un three antiguo y no empaqueta con el actual.
import { Controller } from 'mind-ar/dist/mindar-image.prod.js'
import { Group, Matrix4, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'

const err = (code, msg) => Object.assign(new Error(msg), { code })

async function openCamera () {
  if (!navigator.mediaDevices?.getUserMedia) throw err('no-camera-api', 'this browser has no camera access here')
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } })
  } catch (e) {
    const code = e.name === 'NotAllowedError' ? 'camera-denied' : e.name === 'NotFoundError' ? 'no-camera' : 'camera-failed'
    throw err(code, e.message || e.name)
  }
  const video = document.createElement('video')
  video.setAttribute('playsinline', '')
  video.muted = true
  video.srcObject = stream
  await new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', resolve, { once: true })
    video.addEventListener('error', () => reject(err('camera-failed', 'the camera stream could not be read')), { once: true })
  })
  await video.play()
  // MindAR lee el tamaño del cuadro de los ATRIBUTOS width/height del <video>, no de
  // videoWidth: sin ellos procesa un cuadro vacío y no reconoce nada, sin ningún error.
  video.width = video.videoWidth
  video.height = video.videoHeight
  return { video, stream }
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container donde van la imagen de la cámara y la escena
 * @param {Uint8Array} opts.targets paquete con todas las obras (mergeTargets)
 * @param {(index: number) => void} opts.onFound
 * @param {(index: number) => void} opts.onLost
 * @param {(dt: number) => void} [opts.onFrame] antes de pintar cada cuadro
 */
export async function startTracker ({ container, targets, onFound, onLost, onFrame }) {
  const { video, stream } = await openCamera()
  video.className = 'ar-video'
  container.appendChild(video)

  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.className = 'ar-canvas'
  container.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera()
  const inputWidth = video.videoWidth
  const inputHeight = video.videoHeight

  /** @type {{ group: Group, visible: boolean }[]} */
  const anchors = []
  let postMatrices = []

  const controller = new Controller({
    inputWidth,
    inputHeight,
    maxTrack: 1,
    onUpdate: data => {
      if (data.type !== 'updateMatrix') return
      const anchor = anchors[data.targetIndex]
      if (!anchor) return
      const seen = data.worldMatrix !== null
      if (seen) {
        const m = new Matrix4()
        m.elements = [...data.worldMatrix]
        m.multiply(postMatrices[data.targetIndex])
        anchor.group.matrix = m
      }
      anchor.group.visible = seen
      if (seen !== anchor.visible) {
        anchor.visible = seen
        if (seen) onFound(data.targetIndex)
        else onLost(data.targetIndex)
      }
    }
  })

  // La cámara de la escena copia la de MindAR, corregida por lo que el recorte «cubrir»
  // deja fuera de la pantalla.
  function resize () {
    const cw = container.clientWidth
    const ch = container.clientHeight
    const videoRatio = inputWidth / inputHeight
    let vw, vh
    if (videoRatio > cw / ch) { vh = ch; vw = vh * videoRatio } else { vw = cw; vh = vw / videoRatio }
    video.style.width = vw + 'px'
    video.style.height = vh + 'px'
    video.style.left = (cw - vw) / 2 + 'px'
    video.style.top = (ch - vh) / 2 + 'px'

    const proj = controller.getProjectionMatrix()
    camera.fov = 2 * Math.atan(1 / proj[5] * (ch / vh)) * 180 / Math.PI
    camera.near = proj[14] / (proj[10] - 1)
    camera.far = proj[14] / (proj[10] + 1)
    camera.aspect = cw / ch
    camera.updateProjectionMatrix()
    renderer.setSize(cw, ch)
  }
  resize()

  const { dimensions } = controller.addImageTargetsFromBuffer(targets.buffer.slice(targets.byteOffset, targets.byteOffset + targets.byteLength))
  // En el espacio de cada obra la unidad es su ANCHO y el origen su centro: un plano de
  // 1 × (alto/ancho) la tapa justo.
  postMatrices = dimensions.map(([w, h]) =>
    new Matrix4().compose(new Vector3(w / 2, h / 2, 0), new Quaternion(), new Vector3(w, w, w)))
  for (const [w, h] of dimensions) {
    const group = new Group()
    group.matrixAutoUpdate = false
    group.visible = false
    scene.add(group)
    anchors.push({ group, visible: false, aspect: h / w })
  }

  // Compila los programas de la GPU antes del primer cuadro de verdad.
  controller.dummyRun(video)
  controller.processVideo(video)

  let last = performance.now()
  renderer.setAnimationLoop(now => {
    if (onFrame) onFrame((now - last) / 1000)
    last = now
    renderer.render(scene, camera)
  })

  return {
    anchors,
    resize,
    /** Si el aparato giró, el tamaño del video cambió y hay que volver a empezar. */
    inputChanged: () => video.videoWidth !== inputWidth || video.videoHeight !== inputHeight,
    stop () {
      renderer.setAnimationLoop(null)
      controller.dispose()
      controller.worker.terminate()
      for (const track of stream.getTracks()) track.stop()
      renderer.dispose()
      video.remove()
      renderer.domElement.remove()
    }
  }
}
