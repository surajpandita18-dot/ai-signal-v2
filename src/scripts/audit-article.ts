// Article-page deep audit. Captures the issue page at multiple
// scroll positions on 1200 + 390 to catch anything below the fold
// that previous full-page shots squashed visually.

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'output', 'audit', 'article')
mkdirSync(OUT, { recursive: true })

const BASE = 'https://ai-signal-v2.vercel.app'
const ISSUES = [
  { name: 'weekly', id: '38201c30-8db1-422e-a29e-34c70b07b988' },
  { name: 'deep-dive', id: '9eeaa09c-d680-4d0c-bd96-8ab930f687fb' },
]

async function main() {
  const browser = await chromium.launch()
  for (const issue of ISSUES) {
    for (const w of [1200, 390]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      const page = await ctx.newPage()
      await page.goto(`${BASE}/issue/${issue.id}`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(800)
      const totalH = await page.evaluate(() => document.documentElement.scrollHeight)
      const steps = Math.min(8, Math.ceil(totalH / 800))
      for (let i = 0; i < steps; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), i * 800)
        await page.waitForTimeout(200)
        await page.screenshot({
          path: join(OUT, `${issue.name}_${w}_fold${i + 1}.png`),
          clip: { x: 0, y: 0, width: w, height: 900 },
        })
      }
      console.log(`✓ ${issue.name} ${w} — ${steps} folds`)
      await ctx.close()
    }
  }
  await browser.close()
  console.log(`\n→ ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
