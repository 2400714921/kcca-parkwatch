const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5175/'

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  p.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  p.on('console', (m) => console.log(m.type() + ':', m.text().slice(0, 180)))
  p.on('response', (r) => {
    if (/auth|detect|health/.test(r.url())) console.log('HTTP', r.status(), r.request().method(), r.url())
  })

  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)

  await p.evaluate(() => [...document.querySelectorAll('button,a')]
    .find((x) => x.textContent.trim().toLowerCase() === 'operator login')?.click())
  await p.waitForTimeout(800)
  console.log('form present:', await p.locator('#username').count())

  await p.fill('#username', 'operator')
  await p.fill('#password', 'parkwatch123')
  console.log('field values:', await p.inputValue('#username'), '/', (await p.inputValue('#password')).length + ' chars')

  await p.click('button[type=submit]')
  await p.waitForTimeout(4000)

  console.log('h1 now:', await p.locator('h1').first().textContent().catch(() => 'none'))
  console.log('alert:', await p.locator('[role=alert]').innerText().catch(() => 'no alert'))
  console.log('articles:', await p.locator('article').count())
  console.log('localStorage token:', await p.evaluate(() => (localStorage.getItem('parkwatch_token') || '').slice(0, 20)))
  await p.screenshot({ path: '_archive/after-login.png', fullPage: true })
  await b.close()
})()
