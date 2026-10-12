// Avisos y confirmaciones propios (§5: nada de alert/confirm del navegador).
import { getBackNav } from '@dotrino/nav'
import { $ } from '../dom.js'

let toastTimer = null

export function toast (text, kind = 'info') {
  const el = $('toast')
  el.textContent = text
  el.dataset.kind = kind
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), kind === 'error' ? 7000 : 3500)
}

/** @returns {Promise<boolean>} true si confirmó */
export function confirmDialog ({ title, text, ok, cancel }) {
  const dialog = $('confirmDialog')
  $('confirmTitle').textContent = title
  $('confirmText').textContent = text
  $('confirmOk').textContent = ok
  $('confirmCancel').textContent = cancel
  return new Promise(resolve => {
    // «Volver» (botón físico, gesto) cierra el diálogo en vez de salir de la app.
    let layer = getBackNav().open(() => { layer = null; dialog.close('cancel') })
    dialog.addEventListener('close', () => {
      if (layer) { const l = layer; layer = null; l.close() }
      resolve(dialog.returnValue === 'ok')
    }, { once: true })
    dialog.returnValue = 'cancel'
    dialog.showModal()
  })
}
