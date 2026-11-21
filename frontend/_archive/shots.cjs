const { chromium } = require('playwright')
const seed = require('./seed.cjs')
;(async () => {
  const b = await chromium.launch()
  const r = await fetch('http://localhost:8001/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'parkwatch123' }) })
  const { token } = await r.json()

  const open = async (auth) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 1100 } })
    if (auth) {
      await p.addInitScript((pair) => localStorage.setItem(pair[0], pair[1]), ['parkwatch_token', token])
      await p.addInitScript((v) => localStorage.setItem('parkwatch_user', v), 'operator')
      await p.addInitScript((v) => localStorage.setItem('parkingAreas', v), seed(4))
    } else {
      await p.addInitScript(() => { for (const k of ['parkwatch_token','parkwatch_user','parkingAreas']) localStorage.removeItem(k) })
    }
    await p.goto('http://localhost:5175/', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1600)
    return p
  }
  const byText = (p, text) => p.evaluate((t) => {
    const el = [...document.querySelectorAll('button,a')].find((x) => x.textContent.trim().toLowerCase() === t)
    if (!el) throw new Error('missing control: ' + t)
    el.click()
  }, text)

  // public landing page (logged out)
  let p = await open(false)
  await p.screenshot({ path: '_archive/shot-home.png', fullPage: true }); console.log('home'); await p.close()

  // operator login screen
  p = await open(false); await byText(p, 'operator login')
  await p.waitForTimeout(500)
  await p.screenshot({ path: '_archive/shot-login.png' }); console.log('login')
  await p.fill('#username', 'operator'); await p.fill('#password', 'wrong')
  await p.click('button[type=submit]'); await p.waitForTimeout(1200)
  await p.screenshot({ path: '_archive/shot-login-error.png' }); console.log('login-error'); await p.close()

  // authenticated views
  p = await open(true)
  await byText(p, 'availability'); await p.waitForTimeout(900)
  await p.screenshot({ path: '_archive/shot-availability.png', fullPage: true }); console.log('availability'); await p.close()

  p = await open(true)
  await byText(p, 'dashboard'); await p.waitForTimeout(900)
  await p.screenshot({ path: '_archive/shot-dashboard.png', fullPage: true }); console.log('dashboard')
  await byText(p, 'create area'); await p.waitForTimeout(700)
  await p.screenshot({ path: '_archive/shot-create-area.png' }); console.log('create-area')
  await byText(p, 'dashboard'); await p.waitForTimeout(700)
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Monitor'))?.click())
  await p.waitForTimeout(1000)
  await p.screenshot({ path: '_archive/shot-monitor.png', fullPage: true }); console.log('monitor')

  // marking-mode overlay + play controls on a real clip
  const webm = await p.evaluate(`(async () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360
    const x = c.getContext('2d'); const st = c.captureStream(25)
    const rec = new MediaRecorder(st, { mimeType: 'video/webm' }); const ch = []
    rec.ondataavailable = (e) => e.data.size && ch.push(e.data)
    const done = new Promise((r2) => (rec.onstop = r2)); rec.start()
    for (let i = 0; i < 25; i++) { x.fillStyle = '#808080'; x.fillRect(0, 0, 640, 360); await new Promise((r2) => requestAnimationFrame(r2)) }
    rec.stop(); await done
    const buf = await new Response(new Blob(ch)).arrayBuffer(); let s = ''
    const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000))
    return btoa(s)
  })()`)
  require('fs').writeFileSync('_archive/clip.webm', Buffer.from(webm, 'base64'))
  await p.setInputFiles('input[type=file]', '_archive/clip.webm')
  await p.waitForTimeout(2500)
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Mark Spots'))?.click())
  await p.mouse.move(300, 300); await p.mouse.down(); await p.mouse.move(420, 380); await p.waitForTimeout(300)
  await p.screenshot({ path: '_archive/shot-marking.png' }); console.log('marking')
  await p.mouse.up()
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Play|Pause/.test(x.title))?.click())
  await p.waitForTimeout(4000)
  await p.screenshot({ path: '_archive/shot-monitor-live.png' }); console.log('monitor-live')
  await p.close()
  await b.close()
})()
