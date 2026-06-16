// Email surface screenshots.
// Usage: npx tsx src/scripts/iter-email-shot.ts <iter>

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'output', 'audit', 'iter')
mkdirSync(OUT, { recursive: true })

const ITER = Number(process.argv[2] ?? 0)
const BASE = 'http://localhost:3000'
const ISSUES = [
  { name: 'weekly', id: '38201c30-8db1-422e-a29e-34c70b07b988' },
  { name: 'deepdive', id: '9eeaa09c-d680-4d0c-bd96-8ab930f687fb' },
]

async function main() {
  const browser = await chromium.launch()
  for (const issue of ISSUES) {
    for (const w of [600, 360]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
      const page = await ctx.newPage()
      await page.goto(`${BASE}/preview/email/${issue.id}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      await page.waitForTimeout(500)
      await page.screenshot({
        path: join(OUT, `email_${issue.name}_${ITER}_${w}.png`),
        fullPage: true,
      })
      console.log(`✓ email ${issue.name} ${w}`)
      await ctx.close()
    }
  }
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
