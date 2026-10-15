import '@dotrino/theme/theme.css'
import './style.css'
// Barra superior estándar (§5): marca + volver + idioma + perfil + moneda. Va antes de
// leer el idioma: al registrarse lo resuelve y lo deja en <html lang>.
import '@dotrino/topbar'
// Botón «Instalar» PWA unificado (§3).
import '@dotrino/install'
import { createBackNav, getBackNav } from '@dotrino/nav'
import { $ } from './dom.js'
import { initLang, getLang, setLang, t, applyStatic } from './i18n.js'
import { toast } from './ui/dialog.js'
import * as viewer from './ui/viewer.js'
import * as worksView from './ui/works.js'
import { openStore } from './works/repo.js'
import { getIdentity } from './services/identity.js'
import { getReputation } from './services/reputation.js'

initLang()

// Un fallo que nadie ve se convierte en un «no funciona» sin pista: se enseña.
window.addEventListener('error', e => toast(t('unexpectedError', { reason: e.message }), 'error'))
window.addEventListener('unhandledrejection', e =>
  toast(t('unexpectedError', { reason: e.reason?.message || String(e.reason) }), 'error'))

const topbar = document.querySelector('dotrino-topbar')
const install = topbar.querySelector('dotrino-install')
// El controlador de «volver» ya lo instaló el topbar: se reusa ese.
if (!getBackNav()) createBackNav()

// ---------- pestañas ----------

const TABS = ['view', 'works']
// La pestaña sobrevive a un refresco, pero abrir la app de cero vuelve a «Ver» (§4).
const TAB_KEY = 'ar.tab'

function readTab () {
  try {
    const v = sessionStorage.getItem(TAB_KEY)
    return TABS.includes(v) ? v : 'view'
  } catch {
    return 'view' // sin sessionStorage (modo privado): la pestaña por defecto
  }
}

function setTab (name) {
  if (!TABS.includes(name)) throw new Error(`unknown tab: ${name}`)
  for (const tab of TABS) {
    $('tab-' + tab).setAttribute('aria-selected', String(tab === name))
    $('view-' + tab).hidden = tab !== name
  }
  try { sessionStorage.setItem(TAB_KEY, name) } catch { /* modo privado */ }
  // La cámara solo está abierta mientras se mira.
  if (name !== 'view') viewer.stop()
}

for (const tab of TABS) $('tab-' + tab).addEventListener('click', () => setTab(tab))

// ---------- arranque ----------

applyStatic()
install.setAttribute('lang', getLang())
viewer.initViewer()
worksView.initWorks({ changed: viewer.refresh })
setTab(readTab())
viewer.refresh()
worksView.refresh()

topbar.addEventListener('dotrino-lang', e => {
  setLang(e.detail.lang)
  applyStatic()
  install.setAttribute('lang', e.detail.lang)
  viewer.applyLang()
  worksView.applyLang()
})

// Identidad (§6.1) y el estado del respaldo en el botón de perfil (topbar ≥ 0.13).
getIdentity().then(async id => {
  if (!id) return
  topbar.identity = id
  openStore().then(s => { topbar.store = s }).catch(e => console.error('[ar] store:', e))
  topbar.reputation = await getReputation()
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(e => console.error('[ar] service worker:', e))
  })
}
