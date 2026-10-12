// De punta a punta: se da de alta una obra, se abre la cámara, la obra se reconoce y lo
// suyo se pinta encima.
import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { launch, openApp, FIXTURES } from './app.mjs'

test('a work is added, recognized by the camera and covered by its overlay', async () => {
  const browser = await launch()
  try {
    const { page, errors, log } = await openApp(browser)
    const fail = (what, e) => new Error(`${what}; console: ${JSON.stringify(log)}; errors: ${JSON.stringify(errors)}`, { cause: e })

    await page.click('[data-testid="tab-works"]')
    await page.setInputFiles('[data-testid="work-photo"]', join(FIXTURES, 'art.jpg'))
    await page.setInputFiles('[data-testid="work-overlay"]', join(FIXTURES, 'overlay.png'))
    await page.fill('[data-testid="work-title"]', 'Obra de prueba')
    try {
      await page.click('[data-testid="add-work"]:not([disabled])', { timeout: 30000 })
      await page.waitForSelector('[data-testid="works-list"] .work', { timeout: 120000 })
    } catch (e) {
      throw fail(`the work was not added: hint «${await page.textContent('[data-testid="work-hint"]')}», status «${await page.textContent('[data-testid="works-status"]')}»`, e)
    }

    await page.click('[data-testid="tab-view"]')
    try {
      await page.click('[data-testid="start-camera"]:not([disabled])', { timeout: 15000 })
      await page.waitForFunction(() => document.querySelector('[data-testid="stage"]').dataset.found, null, { timeout: 60000 })
    } catch (e) {
      throw fail(`the work was not recognized: «${await page.textContent('[data-testid="idle-text"]')}»`, e)
    }
    assert.equal(await page.textContent('[data-testid="hud-text"]'), 'Obra de prueba')

    // La superposición es magenta puro: en el centro de la obra tiene que verse eso.
    await page.waitForTimeout(800) // el fundido de entrada
    const shot = await page.screenshot({ path: process.env.AR_E2E_SHOT || undefined })
    const center = await page.evaluate(async b64 => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
      const c = new OffscreenCanvas(img.width, img.height)
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0)
      const stage = document.querySelector('[data-testid="stage"]').getBoundingClientRect()
      const k = img.width / innerWidth
      return [...g.getImageData(Math.round((stage.left + stage.width / 2) * k), Math.round((stage.top + stage.height / 2) * k), 1, 1).data]
    }, shot.toString('base64'))
    assert.ok(center[0] > 200 && center[1] < 80 && center[2] > 200, `the center of the stage is not the overlay: rgba(${center})`)

    await page.click('[data-testid="stop-camera"]')
    await page.waitForSelector('[data-testid="start-camera"]:not([disabled])')
    assert.equal(await page.locator('.ar-video').count(), 0)

    // Limpieza: la obra de prueba no se queda en el almacén.
    await page.click('[data-testid="tab-works"]')
    await page.click('[data-testid="remove-work"]')
    await page.click('[data-testid="dialog-ok"]')
    await page.waitForSelector('[data-testid="works-list"] .work', { state: 'detached' })
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
