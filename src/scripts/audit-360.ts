// 360px overflow check — narrowest mobile target.
// Captures full pages and tests for horizontal overflow.

import { chromium, type Page } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'output', 'audit', '360')
mkdirSync(OUT, { recursive: true })

const BASE = 'http://localhost:3000'

const ROUTES = [
  '/',
  '/about',
  '/subscribe',
  '/unsubscribe',
  '/this-does-not-exist',
  '/issue/38201c30-8db1-422e-a29e-34c70b07b988',
  '/issue/9eeaa09c-d680-4d0c-bd96-8ab930f687fb',
]

async function checkOverflow(page: Page): Promise<{ docW: number; vpW: number; overflow: boolean }> {
  return await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth
    const vpW = window.innerWidth
    return { docW, vpW, overflow: docW > vpW + 1 }
  })
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const page = await ctx.newPage()

  const fails: string[] = []
  for (const r of ROUTES) {
    try {
      await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(400)
      const o = await checkOverflow(page)
      const tag = r.replace(/[\/?#:&]/g, '_') || '_root'
      await page.screenshot({ path: join(OUT, `${tag}.png`), fullPage: true })
      const status = o.overflow ? '✗' : '✓'
      console.log(`${status} ${r.padEnd(60)} doc=${o.docW} vp=${o.vpW}`)
      if (o.overflow) fails.push(r)
    } catch (err) {
      console.log(`✗ ${r} — ${(err as Error).message.slice(0, 80)}`)
      fails.push(r)
    }
  }

  await browser.close()
  console.log()
  if (fails.length === 0) {
    console.log('✓ Zero overflow at 360px on all routes.')
  } else {
    console.log(`✗ ${fails.length} route(s) overflow at 360px`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
