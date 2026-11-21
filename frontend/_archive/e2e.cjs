const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5175/'
const API = 'http://127.0.0.1:8001'

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  const errs = []
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)) })

  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  console.log('landing headline:', await p.locator('h1').first().textContent())

  await p.evaluate(() => [...document.querySelectorAll('button,a')]
    .find((x) => x.textContent.trim().toLowerCase() === 'operator login')?.click())
  await p.waitForTimeout(600)

  await p.fill('#username', 'operator')
  await p.fill('#password', 'parkwatch123')
  const nav = p.waitForURL(/./, { timeout: 15000 }).catch(() => {})
  await Promise.all([nav, p.click('button[type=submit]')])
  await p.waitForTimeout(2500)
  console.log('after login h1:', await p.locator('h1').first().textContent().catch(() => 'none'))
  console.log('facility cards:', await p.locator('article').count())

  // detection endpoint reachable from the page itself (proves API_URL + CORS work)
  const apiFromPage = await p.evaluate(async (api) => {
    try {
      const r = await fetch(api + '/health')
      return r.status + ' ' + JSON.stringify(await r.json())
    } catch (e) { return 'FETCH FAILED: ' + e.message }
  }, API)
  console.log('browser -> backend /health:', apiFromPage)

  await p.screenshot({ path: '_archive/rerun-dashboard.png', fullPage: true })
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no page/console errors')
  await b.close()
})()
