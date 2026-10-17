// La pantalla «Mis obras»: la lista y el alta. Administrativa (§5.1): sin explicaciones.
import { $, escapeHtml } from '../dom.js'
import { t, reasonOf } from '../i18n.js'
import { toast, confirmDialog } from './dialog.js'
import { listWorks, addWork, removeWork } from '../works/repo.js'
import { getBlob } from '../works/blobs.js'

let works = null
let loadError = null
let busy = null // texto de lo que se está haciendo, o null
let thumbUrls = []
let onChange = () => {}

function renderForm () {
  const photo = $('workPhoto').files[0]
  const overlay = $('workOverlay').files[0]
  const hint = $('workHint')
  const ready = Boolean(photo && overlay)
  $('btnAddWork').disabled = !ready || Boolean(busy) || works === null
  for (const id of ['workTitle', 'workPhoto', 'workOverlay']) $(id).disabled = Boolean(busy)
  hint.textContent = busy || (!photo ? t('needPhoto') : !overlay ? t('needOverlay') : '')
}

async function renderList () {
  const list = $('worksList')
  const status = $('worksStatus')
  for (const url of thumbUrls) URL.revokeObjectURL(url)
  thumbUrls = []
  $('btnRetryWorks').hidden = !loadError
  if (loadError) {
    status.textContent = t('storeFailed', { reason: reasonOf(loadError) })
    list.innerHTML = ''
    return
  }
  if (works === null) { status.textContent = t('idleLoading'); list.innerHTML = ''; return }
  status.textContent = works.length ? '' : t('worksEmpty')
  const thumbs = await Promise.all(works.map(w => getBlob(w.photo).then(b => URL.createObjectURL(b), e => {
    console.error('[ar] missing photo for work', w.id, e)
    return ''
  })))
  thumbUrls = thumbs.filter(Boolean)
  list.innerHTML = works.map((w, i) => `
    <li class="work" data-work-id="${escapeHtml(w.id)}">
      <img class="work-thumb" src="${thumbs[i]}" alt="">
      <div class="work-info">
        <div class="work-title">${escapeHtml(w.title)}</div>
        <div class="work-kind">${escapeHtml(t('kind_' + w.overlay.kind))}</div>
      </div>
      <button type="button" class="btn" data-remove="${escapeHtml(w.id)}" data-testid="remove-work">${escapeHtml(t('remove'))}</button>
    </li>`).join('')
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
  await renderList()
  renderForm()
}

async function submit (ev) {
  ev.preventDefault()
  const photo = $('workPhoto').files[0]
  const overlay = $('workOverlay').files[0]
  if (!photo || !overlay || busy) return
  const title = $('workTitle').value.trim() || photo.name.replace(/\.[^.]+$/, '')
  try {
    busy = t('preparing', { percent: 0 })
    renderForm()
    const { compileTarget } = await import('../ar/compile.js')
    const target = await compileTarget(photo, percent => {
      busy = t('preparing', { percent: Math.round(percent) })
      renderForm()
    })
    busy = t('saving')
    renderForm()
    await addWork({ title, photo, target, overlay })
    $('workForm').reset()
    toast(t('added', { title }))
  } catch (e) {
    console.error('[ar] could not add the work:', e)
    toast(t('addFailed', { reason: reasonOf(e) }), 'error')
  } finally {
    busy = null
  }
  await refresh()
  onChange()
}

async function remove (id) {
  const work = works.find(w => w.id === id)
  if (!work) throw new Error(`unknown work: ${id}`)
  const ok = await confirmDialog({
    title: t('removeTitle', { title: work.title }), text: t('removeText'), ok: t('remove'), cancel: t('cancel')
  })
  if (!ok) return
  try {
    await removeWork(work)
    toast(t('removed', { title: work.title }))
  } catch (e) {
    console.error('[ar] could not remove the work:', e)
    toast(t('removeFailed', { reason: reasonOf(e) }), 'error')
  }
  await refresh()
  onChange()
}

export function initWorks ({ changed }) {
  onChange = changed
  $('workForm').addEventListener('submit', submit)
  $('workPhoto').addEventListener('change', renderForm)
  $('workOverlay').addEventListener('change', renderForm)
  $('btnRetryWorks').addEventListener('click', refresh)
  $('worksList').addEventListener('click', ev => {
    const id = ev.target.closest('[data-remove]')?.dataset.remove
    if (id) remove(id)
  })
  renderForm()
}

export function applyLang () { renderList(); renderForm() }
