// Quick screenshot tool for the iter loop. Captures the weekly issue page
// at a target scroll position so I can compare folds across iterations.
//
// Usage: npx tsx src/scripts/iter-shot.ts <iter> <scrollY>

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'output', 'audit', 'iter')
mkdirSync(OUT, { recursive: true })

const ITER = Number(process.argv[2] ?? 0)
const BASE = 'http://localhost:3000'
const URL = `${BASE}/issue/38201c30-8db1-422e-a29e-34c70b07b988`

async function main() {
  const browser = await chromium.launch()
  // Capture full-page mobile + desktop folds
  for (const w of [1200, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(500)
    const totalH = await page.evaluate(() => document.documentElement.scrollHeight)
    const steps = Math.min(10, Math.ceil(totalH / 900))
    for (let i = 0; i < steps; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * 900)
      await page.waitForTimeout(150)
      await page.screenshot({
        path: join(OUT, `iter${ITER}_${w}_${i + 1}.png`),
        clip: { x: 0, y: 0, width: w, height: 900 },
      })
    }
    console.log(`✓ iter${ITER} ${w}: ${steps} folds`)
    await ctx.close()
  }
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
