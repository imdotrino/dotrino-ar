// Arranque común de los E2E: abre la app servida desde el build (`dist/`) bajo
// https://ar.dotrino.com, así el store y la identidad (iframes de *.dotrino.com)
// contestan como en producción. Necesita red. La cámara es un video de mentira que
// enseña la obra de prueba (fixtures/art.jpg), hecho con ffmpeg.
import { readFile, mkdtemp } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

export const ORIGIN = 'https://ar.dotrino.com'
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url))
export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json'
}

// La obra, más pequeña que el cuadro y sobre gris, como se ve un cuadro en una pared.
async function fakeCameraFile () {
  const dir = await mkdtemp(join(tmpdir(), 'dotrino-ar-'))
  const file = join(dir, 'camera.y4m')
  execFileSync('ffmpeg', ['-loglevel', 'error', '-loop', '1', '-i', join(FIXTURES, 'art.jpg'),
    '-vf', 'scale=440:330,pad=640:480:100:75:gray', '-r', '10', '-t', '1', '-pix_fmt', 'yuv420p', file])
  return file
}

export async function launch () {
  return chromium.launch({
    args: [
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-video-capture=${await fakeCameraFile()}`,
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'
    ]
  })
}

export async function openApp (browser, { width = 412, height = 800 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'es-ES',
    permissions: ['camera']
  })
  await ctx.route(`${ORIGIN}/**`, async route => {
    let path = new URL(route.request().url()).pathname
    if (!extname(path)) path = '/index.html'
    let body
    try {
      body = await readFile(join(DIST, path))
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
      return route.fulfill({ status: 404, body: 'not found' })
    }
    return route.fulfill({ status: 200, contentType: TYPES[extname(path)] || 'application/octet-stream', body })
  })
  const page = await ctx.newPage()
  const errors = []
  const log = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push(`${m.type()}: ${m.text()}`) })
  await page.goto(`${ORIGIN}/`)
  return { ctx, page, errors, log }
}
