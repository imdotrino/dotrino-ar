// Textos es/en (§9). La fuente de verdad del idioma es <dotrino-topbar>: lo resuelve al
// registrarse, lo deja en <html lang> y avisa de cada cambio con 'dotrino-lang'.
const DICT = {
  en: {
    tabsAria: 'Sections', tabView: 'View', tabWorks: 'My works',
    start: 'Open the camera', starting: 'Opening the camera…', stop: 'Close the camera',
    idleReady: 'Point the camera at one of your works.',
    idleNoWorks: 'There are no works yet. Add one in “My works”.',
    idleLoading: 'Reading your works…',
    scanning: 'Point at a work', soundOn: 'Sound on', soundOff: 'Sound off',
    soundNone: 'None of your works has a video',
    err_camera_denied: 'The camera is blocked for this page. Allow it in the browser settings and try again.',
    err_no_camera: 'This device has no camera.',
    err_no_camera_api: 'This browser cannot use the camera here.',
    err_blob_missing: 'The files of one of your works are not on this device.',
    viewFailed: 'Could not open the camera: {reason}',
    storeFailed: 'Could not open your storage: {reason}', retry: 'Try again',
    worksEmpty: 'No works yet.', remove: 'Remove', kind_image: 'Image', kind_video: 'Video',
    addH: 'Add a work', title: 'Name', titlePh: 'Name of the work',
    photo: 'Photo of the work', overlay: 'What shows on top (image or video)',
    add: 'Add', needPhoto: 'Choose the photo of the work.', needOverlay: 'Choose what shows on top.',
    preparing: 'Preparing the work… {percent} %', saving: 'Saving…',
    added: '“{title}” added.', addFailed: 'Could not add the work: {reason}',
    err_bad_image: 'That photo cannot be read. Try a JPG or PNG.',
    err_bad_overlay: 'Only an image or a video can go on top.',
    removeTitle: 'Remove “{title}”?', removeText: 'Its photo and what shows on top are deleted from this device.',
    cancel: 'Cancel', removed: '“{title}” removed.', removeFailed: 'Could not remove the work: {reason}',
    unexpectedError: 'Something went wrong: {reason}'
  },
  es: {
    tabsAria: 'Secciones', tabView: 'Ver', tabWorks: 'Mis obras',
    start: 'Abrir la cámara', starting: 'Abriendo la cámara…', stop: 'Cerrar la cámara',
    idleReady: 'Apunta la cámara a una de tus obras.',
    idleNoWorks: 'Todavía no hay obras. Añade una en «Mis obras».',
    idleLoading: 'Leyendo tus obras…',
    scanning: 'Apunta a una obra', soundOn: 'Con sonido', soundOff: 'Sin sonido',
    soundNone: 'Ninguna de tus obras tiene video',
    err_camera_denied: 'La cámara está bloqueada para esta página. Permítela en los ajustes del navegador e inténtalo de nuevo.',
    err_no_camera: 'Este aparato no tiene cámara.',
    err_no_camera_api: 'Este navegador no puede usar la cámara aquí.',
    err_blob_missing: 'Los archivos de una de tus obras no están en este aparato.',
    viewFailed: 'No se pudo abrir la cámara: {reason}',
    storeFailed: 'No se pudo abrir tu almacén: {reason}', retry: 'Reintentar',
    worksEmpty: 'Todavía no hay obras.', remove: 'Quitar', kind_image: 'Imagen', kind_video: 'Video',
    addH: 'Añadir una obra', title: 'Nombre', titlePh: 'Nombre de la obra',
    photo: 'Foto de la obra', overlay: 'Lo que se ve encima (imagen o video)',
    add: 'Añadir', needPhoto: 'Elige la foto de la obra.', needOverlay: 'Elige lo que se ve encima.',
    preparing: 'Preparando la obra… {percent} %', saving: 'Guardando…',
    added: '«{title}» añadida.', addFailed: 'No se pudo añadir la obra: {reason}',
    err_bad_image: 'Esa foto no se puede leer. Prueba con un JPG o un PNG.',
    err_bad_overlay: 'Encima solo puede ir una imagen o un video.',
    removeTitle: '¿Quitar «{title}»?', removeText: 'Su foto y lo que se ve encima se borran de este aparato.',
    cancel: 'Cancelar', removed: '«{title}» quitada.', removeFailed: 'No se pudo quitar la obra: {reason}',
    unexpectedError: 'Algo salió mal: {reason}'
  }
}

let lang = 'en'

export function initLang () {
  lang = document.documentElement.lang === 'es' ? 'es' : 'en'
}
export const getLang = () => lang
export function setLang (l) {
  if (!DICT[l]) throw new Error(`unknown language: ${l}`)
  lang = l
}

export function t (key, vars = {}) {
  const s = DICT[lang][key]
  if (s === undefined) throw new Error(`missing text: ${key}`)
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    if (vars[k] === undefined) throw new Error(`missing value {${k}} for text ${key}`)
    return String(vars[k])
  })
}

/** El texto de un error conocido (por su `code`), o su mensaje si no lo es. */
export function reasonOf (e) {
  const key = 'err_' + String(e?.code || '').replace(/-/g, '_')
  return DICT[lang][key] || e?.message || String(e)
}

/** Aplica los textos fijos del HTML (data-i18n, -aria, -title, -ph). */
export function applyStatic () {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria))
  for (const el of document.querySelectorAll('[data-i18n-ph]')) el.setAttribute('placeholder', t(el.dataset.i18nPh))
}
