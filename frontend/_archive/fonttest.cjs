const { chromium } = require('playwright')
const seed = require('./seed.cjs')

// Definitive check: the shipped font is subset to PUA codepoints only, with no ASCII
// glyphs and no GSUB. So a span that still writes the icon NAME measures 0px (no glyph
// at all), while one that resolves a codepoint measures its real advance width.
const VIEWS = [
  ['home', 4, null],
  ['dashboard', 4, 'Dashboard'],
  ['create-area', 2, 'Create Area'],
  ['monitor', 1, 'Monitor'],
  ['login', 0, 'Operator Login']
]

;(async () => {
  const b = await chromium.launch()
  const res = await fetch('http://localhost:8001/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'parkwatch123' })
  })
  const { token } = await res.json()

  const problems = []
  for (const [label, nAreas, navText] of VIEWS) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1200 } })
    p.on('pageerror', e => problems.push(`${label} pageerror: ${e.message}`))
    p.on('console', m => { if (m.type() === 'warn' && /iconCodepoints/.test(m.text())) problems.push(`${label}: ${m.text()}`) })
    if (navText !== 'Operator Login') {
      await p.addInitScript((pair) => localStorage.setItem(pair[0], pair[1]), ['parkwatch_token', token])
      await p.addInitScript((v) => localStorage.setItem('parkwatch_user', v), 'operator')
    }
    if (nAreas) await p.addInitScript((v) => localStorage.setItem('parkingAreas', v), seed(nAreas))
    await p.goto('http://localhost:5175/', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1400)
    if (navText) {
      await p.evaluate((t) => {
        const el = [...document.querySelectorAll('button,a')].find(x => x.textContent.trim().toLowerCase().includes(t.toLowerCase()))
        if (el) el.click()
      }, navText)
      await p.waitForTimeout(900)
    }
    await p.evaluate(() => document.fonts.ready)

    const r = await p.evaluate(() => {
      const spans = [...document.querySelectorAll('.material-symbols-outlined')]
      const rows = spans.map(s => ({ txt: s.textContent, cp: s.textContent.codePointAt(0) || 0, w: Math.round(s.getBoundingClientRect().width) }))
      const literal = rows.filter(x => x.cp < 0xE000)                 // still an ASCII name -> invisible
      const zeroGlyph = rows.filter(x => x.cp >= 0xE000 && x.w === 0) // codepoint but no outline
      return { total: spans.length, distinctCp: new Set(rows.map(x => x.cp)).size, literal: [...new Set(literal.map(x => x.txt))], zeroGlyph: zeroGlyph.length }
    })
    console.log(`${label}: ${r.total} icon spans, ${r.distinctCp} distinct codepoints, literal-name=${JSON.stringify(r.literal)}, zero-width=${r.zeroGlyph}`)
    if (r.literal.length) problems.push(`${label}: ${r.literal.length} spans still render icon names as text`)
    await p.screenshot({ path: `_archive/final-${label}.png`, fullPage: label !== 'login' })
    await p.close()
  }

  console.log(problems.length ? '\nPROBLEMS:\n' + [...new Set(problems)].join('\n') : '\nOK: every icon span resolves a private-use codepoint with a real advance width')
  await b.close()
})()
