// Avisos y confirmaciones propios (§5: nada de alert/confirm del navegador).
import { getBackNav } from '@dotrino/nav'
import { $ } from '../dom.js'

/** @type {ReturnType<typeof setTimeout> | undefined} */
let toastTimer

/**
 * @param {string} text
 * @param {'info'|'error'} [kind]
 */
export function toast (text, kind = 'info') {
  const el = $('toast')
  el.textContent = text
  el.dataset.kind = kind
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), kind === 'error' ? 7000 : 3500)
}

/**
 * @param {{ title: string, text: string, ok: string, cancel: string }} opts
 * @returns {Promise<boolean>} true si confirmó
 */
export function confirmDialog ({ title, text, ok, cancel }) {
  const dialog = /** @type {HTMLDialogElement} */ ($('confirmDialog'))
  const nav = getBackNav()
  if (!nav) throw new Error('confirmDialog: no back controller installed')
  $('confirmTitle').textContent = title
  $('confirmText').textContent = text
  $('confirmOk').textContent = ok
  $('confirmCancel').textContent = cancel
  return new Promise(resolve => {
    // «Volver» (botón físico, gesto) cierra el diálogo en vez de salir de la app.
    /** @type {import('@dotrino/nav').BackLayerHandle | null} */
    let layer = nav.open(() => { layer = null; dialog.close('cancel') })
    dialog.addEventListener('close', () => {
      if (layer) { const l = layer; layer = null; l.close() }
      resolve(dialog.returnValue === 'ok')
    }, { once: true })
    dialog.returnValue = 'cancel'
    dialog.showModal()
  })
}
