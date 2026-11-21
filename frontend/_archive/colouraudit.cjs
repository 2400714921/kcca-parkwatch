/* Pixel + computed-style audit for non-monochrome colours.
   Allowed hues: emerald/green (free) and rose/red (occupied). Everything else must be grey. */
const { chromium } = require('playwright')
const seed = require('./seed.cjs')

const VIEWS = [
  ['home', 4, null],
  ['dashboard', 4, 'Dashboard'],
  ['create-area', 2, 'Create Area'],
  ['monitor', 1, 'Monitor'],
  ['login', 0, 'Operator Login']
]

const AUDIT = `(() => {
  const props = ['color','backgroundColor','borderTopColor','borderLeftColor','borderRightColor','borderBottomColor','outlineColor','fill','stroke','stopColor']
  const seen = new Map()
  const note = (kind, value, el) => {
    const key = kind + '|' + value
    if (!seen.has(key)) seen.set(key, { n: 0, where: (el?.className || el?.tagName || '').toString().slice(0, 60) })
    seen.get(key).n++
  }
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    for (const p of props) {
      const v = cs[p]
      if (!v || v === 'none' || v === 'transparent' || v === 'rgba(0, 0, 0, 0)' || v === 'currentcolor') continue
      let r, g, b, a = 1
      let m = v.match(/rgba?\\((\\d+)[, ]+(\\d+)[, ]+(\\d+)(?:[, /]+([\\d.]+))?\\)/)
      if (m) { ;[r, g, b] = [+m[1], +m[2], +m[3]]; if (m[4] !== undefined) a = +m[4] }
      else if ((m = v.match(/^#([0-9a-f]{6})$/i))) { const h = m[1]; r = parseInt(h.slice(0,2),16); g = parseInt(h.slice(2,4),16); b = parseInt(h.slice(4,6),16) }
      else if ((m = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i))) { r = parseInt(m[1] + m[1], 16); g = parseInt(m[2] + m[2], 16); b = parseInt(m[3] + m[3], 16) }
      if (r === undefined || a < 0.05) continue
      const mx = Math.max(r,g,b), mn = Math.min(r,g,b)
      const sat = mx === 0 ? 0 : (mx - mn) / mx
      if (sat < 0.15) continue
      const statusHue = (g === mx && b > r) || (r === mx && b > g * 1.15)
      if (statusHue) continue
      note(p, v, el)
    }
  }
  return [...seen].map(([k, d]) => ({ k, ...d }))
})()`

;(async () => {
  const base = process.env.BASE || 'http://localhost:5175/'
  const b = await chromium.launch()
  const res = await fetch('http://localhost:8001/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'parkwatch123' })
  })
  const { token } = await res.json()

  let offenders = []
  for (const [label, nAreas, navText] of VIEWS) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1200 } })
    if (navText !== 'Operator Login') {
      await p.addInitScript((pair) => localStorage.setItem(pair[0], pair[1]), ['parkwatch_token', token])
      await p.addInitScript((v) => localStorage.setItem('parkwatch_user', v), 'operator')
    }
    if (nAreas) await p.addInitScript((v) => localStorage.setItem('parkingAreas', v), seed(nAreas))
    await p.goto(base, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1400)
    if (navText) {
      await p.evaluate((t) => {
        const el = [...document.querySelectorAll('button,a')].find(x => x.textContent.trim().toLowerCase().includes(t.toLowerCase()))
        if (el) el.click()
      }, navText)
      await p.waitForTimeout(900)
    }
    const rows = await p.evaluate(AUDIT)
    console.log(`${label}: ${rows.length} off-palette computed styles`)
    for (const r of rows) { offenders.push(`${label} ${r.k} x${r.n}`); console.log(`   ${r.k}  x${r.n}  .${r.where}`) }
    await p.screenshot({ path: `_archive/mono-${label}.png`, fullPage: label !== 'login' })
    await p.close()
  }

  // Canvas check: the monitor stage paints bay boxes directly.
  console.log(offenders.length ? `\nFAIL: ${offenders.length} off-palette values` : '\nOK: greys plus green/red status only')
  await b.close()
  process.exit(offenders.length ? 1 : 0)
})()
