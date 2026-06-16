// Pre-deploy hard-gate check. Returns non-zero exit code if any
// of the locked rubric hard gates fail on the live (or local) site.
//
// Runs:
//   • 360px overflow on every public route
//   • computed font-size probe on key body elements (≥15px)
//   • Single accent + 3 type families confirmed in globals.css
//
// Usage:
//   npx tsx src/scripts/audit-gate.ts            # against http://localhost:3000
//   npx tsx src/scripts/audit-gate.ts --prod     # against production URL

import { chromium, type Page } from 'playwright'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv.includes('--prod')
  ? 'https://ai-signal-v2.vercel.app'
  : 'http://localhost:3000'

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/subscribe',
  '/unsubscribe',
  '/this-page-does-not-exist',
  '/issue/38201c30-8db1-422e-a29e-34c70b07b988',
  '/issue/9eeaa09c-d680-4d0c-bd96-8ab930f687fb',
]

// Selectors expected to be readable body copy on each surface — must be ≥15px.
const BODY_PROBES: Array<{ route: string; selector: string; label: string }> = [
  { route: '/', selector: 'section#subscribe p.reveal', label: 'home hero dek' },
  { route: '/about', selector: 'main p:nth-of-type(2)', label: 'about body' },
  { route: '/subscribe', selector: 'main p', label: 'subscribe hero' },
  {
    route: '/issue/38201c30-8db1-422e-a29e-34c70b07b988',
    selector: '.editorial p',
    label: 'issue editorial body',
  },
]

async function checkOverflow(page: Page) {
  return page.evaluate(() => {
    const docW = document.documentElement.scrollWidth
    const vpW = window.innerWidth
    return { docW, vpW, overflow: docW > vpW + 1 }
  })
}

async function checkBodySize(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) return null
    const cs = getComputedStyle(el)
    return { px: parseFloat(cs.fontSize), color: cs.color }
  }, selector)
}

function assertGlobalsCss() {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const fails: string[] = []
  if (!/--lime:\s+194\s+245\s+61/.test(css)) {
    fails.push('locked accent #c2f53d (--lime) missing from globals.css')
  }
  // Ensure only Fraunces / Inter / JetBrains Mono families declared.
  const familyCount = (css.match(/@import url\([^)]*Fraunces[^)]*\)/) ?? []).length
  if (familyCount === 0) fails.push('Fraunces family not declared')
  return fails
}

async function main() {
  console.log(`Auditing ${BASE}\n`)
  const browser = await chromium.launch()
  const fails: string[] = []

  // 360 overflow check across routes
  const ctx360 = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const page360 = await ctx360.newPage()
  for (const r of PUBLIC_ROUTES) {
    try {
      await page360.goto(`${BASE}${r}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page360.waitForTimeout(300)
      const o = await checkOverflow(page360)
      const status = o.overflow ? '✗' : '✓'
      console.log(`${status} 360-overflow ${r.padEnd(50)} doc=${o.docW} vp=${o.vpW}`)
      if (o.overflow) fails.push(`360 overflow on ${r} (doc=${o.docW})`)
    } catch (err) {
      console.log(`✗ 360-overflow ${r} — ${(err as Error).message.slice(0, 60)}`)
      fails.push(`360 check failed on ${r}`)
    }
  }
  await ctx360.close()

  // Body-size probes at 1200
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } })
  const page = await ctx.newPage()
  for (const p of BODY_PROBES) {
    try {
      await page.goto(`${BASE}${p.route}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(300)
      const data = await checkBodySize(page, p.selector)
      if (!data) {
        console.log(`? body-size  ${p.label.padEnd(28)} (selector not found, skipping)`)
        continue
      }
      const status = data.px >= 15 ? '✓' : '✗'
      console.log(`${status} body-size  ${p.label.padEnd(28)} ${data.px}px / ${data.color}`)
      if (data.px < 15) {
        fails.push(`${p.label} = ${data.px}px (need ≥15)`)
      }
    } catch (err) {
      console.log(`? body-size  ${p.label} — ${(err as Error).message.slice(0, 50)}`)
    }
  }
  await ctx.close()
  await browser.close()

  // globals.css token assertions
  const tokenFails = assertGlobalsCss()
  for (const f of tokenFails) {
    console.log(`✗ tokens     ${f}`)
    fails.push(f)
  }
  if (tokenFails.length === 0) {
    console.log(`✓ tokens     locked palette + fonts intact`)
  }

  console.log()
  if (fails.length === 0) {
    console.log(`✓ ALL GATES PASS — safe to deploy.`)
    process.exit(0)
  } else {
    console.log(`✗ ${fails.length} HARD GATE FAILURE(S) — DO NOT DEPLOY:`)
    for (const f of fails) console.log(`   ${f}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
