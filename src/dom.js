/**
 * The element with this id. It must exist: a missing one is a bug in index.html.
 *
 * @param {string} id
 * @returns {HTMLElement}
 */
export const $ = id => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing element #${id}`)
  return el
}

/** @param {string} s */
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * @param {unknown} s
 * @returns {string}
 */
export function escapeHtml (s) {
  return String(s).replace(/[&<>"']/g, c => /** @type {Record<string, string>} */ ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}
