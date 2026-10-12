// La pantalla «Ver»: abre la cámara, reconoce las obras y les pone lo suyo encima.
import { $ } from '../dom.js'
import { t, reasonOf } from '../i18n.js'
import { listWorks } from '../works/repo.js'
import { getBlob } from '../works/blobs.js'
import { mergeTargets } from '../ar/targets.js'

/** idle | starting | running */
let state = 'idle'
let works = null // null = todavía no se leyeron
let loadError = null
let tracker = null
let overlays = []
let found = -1
let muted = true

function render () {
  const running = state === 'running'
  $('stageIdle').hidden = running
  $('stageHud').hidden = !running
  const start = $('btnStart')
  const idle = $('idleText')
  start.textContent = t(state === 'starting' ? 'starting' : 'start')
  if (loadError) {
    idle.textContent = t('storeFailed', { reason: reasonOf(loadError) })
    start.disabled = true
  } else if (works === null) {
    idle.textContent = t('idleLoading')
    start.disabled = true
  } else if (works.length === 0) {
    idle.textContent = t('idleNoWorks')
    start.disabled = true
  } else {
    idle.textContent = t('idleReady')
    start.disabled = state !== 'idle'
  }
  $('btnRetryView').hidden = !loadError
  $('hudText').textContent = found >= 0 ? works[found].title : t('scanning')
  $('stage').dataset.found = found >= 0 ? works[found].id : ''
  const sound = $('btnSound')
  const anySound = overlays.some(o => o.hasSound)
  sound.disabled = !anySound
  sound.textContent = t(muted ? 'soundOff' : 'soundOn')
  sound.title = anySound ? '' : t('soundNone')
  sound.setAttribute('aria-pressed', String(!muted))
}

export async function refresh () {
  loadError = null
  try {
    works = await listWorks()
  } catch (e) {
    console.error('[ar] could not list works:', e)
    works = null
    loadError = e
  }
  render()
}

async function start () {
  if (state !== 'idle') return
  state = 'starting'
  render()
  try {
    // Lo pesado (MindAR + three) se baja al abrir la cámara, no al abrir la app.
    const [{ startTracker }, { createOverlay }] = await Promise.all([import('../ar/tracker.js'), import('../ar/overlay.js')])
    const targets = mergeTargets(await Promise.all(works.map(w => getBlob(w.target.cid).then(b => b.arrayBuffer()))))
    tracker = await startTracker({
      container: $('stage'),
      targets,
      onFound: i => { found = i; overlays[i]?.show(); render() },
      onLost: i => { if (found === i) found = -1; overlays[i]?.hide(); render() },
      onFrame: dt => { for (const o of overlays) o.tick(dt) }
    })
    overlays = await Promise.all(works.map(async (w, i) => {
      const overlay = await createOverlay({ blob: await getBlob(w.overlay.cid), kind: w.overlay.kind, aspect: tracker.anchors[i].aspect })
      overlay.setMuted(muted)
      tracker.anchors[i].group.add(overlay.mesh)
      return overlay
    }))
    state = 'running'
    render()
  } catch (e) {
    console.error('[ar] could not start the viewer:', e)
    stop()
    $('idleText').textContent = t('viewFailed', { reason: reasonOf(e) })
  }
}

export function stop () {
  for (const o of overlays) o.dispose()
  overlays = []
  if (tracker) tracker.stop()
  tracker = null
  found = -1
  state = 'idle'
  render()
}

export function initViewer () {
  $('btnStart').addEventListener('click', start)
  $('btnStop').addEventListener('click', stop)
  $('btnRetryView').addEventListener('click', refresh)
  $('btnSound').addEventListener('click', () => {
    muted = !muted
    for (const o of overlays) o.setMuted(muted)
    render()
  })
  window.addEventListener('resize', () => {
    if (!tracker) return
    // Al girar el aparato cambia el tamaño del video: el seguimiento se rehace.
    if (tracker.inputChanged()) { stop(); start() } else tracker.resize()
  })
  // Con la página oculta la cámara se suelta: no se graba lo que nadie mira.
  document.addEventListener('visibilitychange', () => { if (document.hidden && state !== 'idle') stop() })
  render()
}

export const applyLang = render
