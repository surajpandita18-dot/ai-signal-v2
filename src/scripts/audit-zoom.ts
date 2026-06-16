// Zoom into specific surfaces to verify body text actually renders ≥15px.
// Captures a viewport-sized screenshot of the first fold + reads computed font-size
// from key elements.

import { chromium, type Page } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'output', 'audit', 'zoom')
mkdirSync(OUT, { recursive: true })

const BASE = 'http://localhost:3000'

interface Spec {
  name: string
  path: string
  selectors: { label: string; selector: string }[]
}

const SPECS: Spec[] = [
  {
    name: 'home',
    path: '/',
    selectors: [
      { label: 'hero-dek', selector: 'section#subscribe p:has-text("single move reshaping")' },
      { label: 'featured-dek', selector: 'section#subscribe [class*="border-l-2"] p' },
      { label: 'manifesto-body', selector: 'section#about-strip p:has-text("AI Signal runs")' },
      { label: 'whatyouget-body', selector: 'section >> text=We pick the one thing that actually changes' },
      { label: 'archive-dek', selector: 'section#archive a p' },
    ],
  },
  {
    name: 'weekly',
    path: '/issue/38201c30-8db1-422e-a29e-34c70b07b988',
    selectors: [
      { label: 'editorial-p', selector: '.editorial p' },
      { label: 'glance-item', selector: 'ol li p' },
      { label: 'archetype-para', selector: '[class*="border-lime"] p' },
    ],
  },
  {
    name: 'subscribe',
    path: '/subscribe',
    selectors: [
      { label: 'hero-dek', selector: 'main p:has-text("1500 words")' },
      { label: 'aside-body', selector: 'aside li span:nth-of-type(2)' },
    ],
  },
]

async function probe(page: Page, spec: Spec) {
  await page.goto(`${BASE}${spec.path}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(400)
  const results: Array<{ label: string; px: string; color: string; lh: string; cpl: number }> = []
  for (const { label, selector } of spec.selectors) {
    try {
      const data = await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return null
        const cs = getComputedStyle(el)
        const text = el.innerText ?? ''
        // CPL approx: characters / lines visible
        const lineCount = Math.max(1, Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight)))
        return {
          px: cs.fontSize,
          color: cs.color,
          lh: cs.lineHeight,
          cpl: Math.round(text.length / lineCount),
        }
      }, selector)
      if (data) results.push({ label, ...data })
      else results.push({ label, px: 'NOT-FOUND', color: '?', lh: '?', cpl: 0 })
    } catch {
      results.push({ label, px: 'ERROR', color: '?', lh: '?', cpl: 0 })
    }
  }
  return results
}

async function main() {
  const browser = await chromium.launch()

  for (const width of [1200, 390]) {
    console.log(`\n=== ${width}px ===`)
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await ctx.newPage()
    for (const spec of SPECS) {
      console.log(`\n  ${spec.name} (${spec.path})`)
      const results = await probe(page, spec)
      for (const r of results) {
        const ok = parseFloat(r.px) >= 15 ? '✓' : '✗'
        console.log(`    ${ok} ${r.label.padEnd(20)} ${r.px.padEnd(8)} ${r.color.padEnd(25)} lh=${r.lh} cpl≈${r.cpl}`)
      }
      // Capture fold
      await page.screenshot({
        path: join(OUT, `${spec.name}_${width}_fold.png`),
        clip: { x: 0, y: 0, width, height: 900 },
      })
    }
    await ctx.close()
  }
  await browser.close()
  console.log(`\nZoom shots → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
