// Design-rubric verification screenshots.
// Widths: 1200 desktop, 390 mobile, 360 email-only.
//
// Usage: npx tsx src/scripts/audit-shots.ts

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'output', 'audit')
mkdirSync(OUT, { recursive: true })

const BASE = 'http://localhost:3000'

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'subscribe', path: '/subscribe' },
  { name: 'unsubscribe', path: '/unsubscribe' },
  { name: '404', path: '/this-page-does-not-exist' },
  { name: 'weekly', path: '/issue/38201c30-8db1-422e-a29e-34c70b07b988' },
  { name: 'deep-dive', path: '/issue/9eeaa09c-d680-4d0c-bd96-8ab930f687fb' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1200, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  for (const r of ROUTES) {
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.width, height: v.height })
      const tag = `${r.name}_${v.name}_${v.width}`
      try {
        await page.goto(`${BASE}${r.path}`, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(400)
        await page.screenshot({ path: join(OUT, `${tag}.png`), fullPage: true })
        console.log(`✓ ${tag}`)
      } catch (err) {
        console.log(`✗ ${tag} — ${(err as Error).message.slice(0, 80)}`)
      }
    }
  }

  await browser.close()
  console.log(`\n→ ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
