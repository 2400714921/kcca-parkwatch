/* Pixel audit of the monitor <canvas>: the only painted overlays should be the green/red
   bay boxes (plus whatever the user's own footage contains). */
const { chromium } = require('playwright')
const seed = require('./seed.cjs')

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 1200 } })
  p.on('pageerror', (e) => console.log('pageerror:', e.message))
  const res = await fetch('http://localhost:8001/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'parkwatch123' }),
  })
  const { token } = await res.json()
  await p.addInitScript((pair) => localStorage.setItem(pair[0], pair[1]), ['parkwatch_token', token])
  await p.addInitScript((v) => localStorage.setItem('parkwatch_user', v), 'operator')
  await p.addInitScript((v) => localStorage.setItem('parkingAreas', v), seed(1))
  await p.goto('http://localhost:5175/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)

  const click = (text) => p.evaluate((t) => {
    const el = [...document.querySelectorAll('button,a')].find((x) => x.textContent.trim().toLowerCase().includes(t))
    if (!el) throw new Error('no control matching ' + t)
    el.click()
  }, text)

  await click('dashboard')
  await p.waitForTimeout(600)
  await click('monitor')
  await p.waitForTimeout(900)
  console.log('canvas before upload:', await p.evaluate(() => Boolean(document.querySelector('canvas'))))

  // A grey-only clip, so any saturated pixel left on the stage came from our overlay.
  const webm = await p.evaluate(`(async () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360
    const x = c.getContext('2d'); const stream = c.captureStream(25)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start()
    for (let i = 0; i < 30; i++) {
      x.fillStyle = '#808080'; x.fillRect(0, 0, 640, 360)
      x.fillStyle = '#404040'; x.fillRect(0, 0, 640, 120)
      x.fillStyle = '#bfbfbf'; x.fillRect(0, 240, 640, 120)
      await new Promise((r) => requestAnimationFrame(r))
    }
    rec.stop(); await done
    const buf = await new Response(new Blob(chunks)).arrayBuffer()
    let s = ''; const u8 = new Uint8Array(buf)
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000))
    return btoa(s)
  })()`)
  require('fs').writeFileSync('_archive/clip.webm', Buffer.from(webm, 'base64'))

  await p.setInputFiles('input[type=file]', '_archive/clip.webm')
  await p.waitForTimeout(3000)
  console.log('canvas after upload:', await p.evaluate(() => {
    const cv = document.querySelector('canvas')
    return cv ? [cv.width, cv.height] : null
  }))

  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((x) => /Play|Pause/.test(x.title))
    btn?.click()
  })
  await p.waitForTimeout(5000)

  const px = await p.evaluate(() => {
    const cv = document.querySelector('canvas')
    if (!cv) return { error: 'no canvas' }
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height)
    const tally = { sampled: 0, grey: 0, green: 0, red: 0, other: [] }
    for (let i = 0; i < data.length; i += 4 * 17) {
      const r = data[i], g = data[i + 1], bl = data[i + 2]
      tally.sampled++
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl)
      const sat = mx === 0 ? 0 : (mx - mn) / mx
      if (sat < 0.2 || mx < 50) { tally.grey++; continue }
      if (g === mx && bl > r) { tally.green++; continue }
      if (r === mx && bl > g * 1.1) { tally.red++; continue }
      if (tally.other.length < 15) tally.other.push(`${r},${g},${bl}`)
    }
    return { size: [width, height], ...tally }
  })
  console.log('canvas pixels:', JSON.stringify(px, null, 2))
  await p.screenshot({ path: '_archive/mono-monitor-live.png' })
  await b.close()
})()
