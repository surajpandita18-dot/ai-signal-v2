// Visual regression check. Screenshots key pages in light + dark mode, at
// mobile (iPhone 13) and desktop widths. Outputs to output/screenshots/.
//
// Usage:
//   npx tsx src/scripts/visual-check.ts             # uses production URL
//   npx tsx src/scripts/visual-check.ts --local     # uses http://localhost:3000
//
// Catches: dark-mode text-color collisions (where text-paper sits on
// fixed-dark surfaces and disappears), missing list-level rendering for
// new content types, layout breaks at mobile widths.

import { chromium, type Page } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'output', 'screenshots')
mkdirSync(OUT_DIR, { recursive: true })

const BASE = process.argv.includes('--local')
  ? 'http://localhost:3000'
  : 'https://ai-signal-v2.vercel.app'

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'subscribe', path: '/subscribe' },
  { name: 'about', path: '/about' },
  // Pulled from current DB — these are the live test issues.
  { name: 'weekly', path: '/issue/38201c30-8db1-422e-a29e-34c70b07b988' },
  { name: 'deep-dive', path: '/issue/9eeaa09c-d680-4d0c-bd96-8ab930f687fb' },
  { name: 'review-dd', path: '/review/deep-dive' },
]

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 }, // iPhone 13
  { name: 'desktop', width: 1280, height: 800 },
]

const THEMES = ['light', 'dark'] as const

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: join(OUT_DIR, `${name}.png`),
    fullPage: true,
  })
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('aisignal_theme', t)
    } catch {}
  }, theme)
  await page.emulateMedia({
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  })
}

// Color-sample check: pull the first child of <header> and read its
// computed color. If color === background, text is invisible.
async function checkHeaderContrast(page: Page): Promise<{
  pass: boolean
  bg: string
  fg: string
  delta: number
}> {
  return await page.evaluate(() => {
    const header = document.querySelector('header')
    if (!header) return { pass: false, bg: '?', fg: '?', delta: 0 }
    const bg = getComputedStyle(header).backgroundColor
    // Find any visible <a> or <span> inside header that contains text
    const candidates = header.querySelectorAll('a, span')
    let fg = '?'
    for (const el of Array.from(candidates)) {
      if ((el as HTMLElement).innerText.trim().length > 0) {
        fg = getComputedStyle(el).color
        break
      }
    }
    const parse = (s: string) => {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0]
    }
    const a = parse(bg)
    const b = parse(fg)
    const delta = Math.sqrt(
      (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
    )
    return { pass: delta > 80, bg, fg, delta: Math.round(delta) }
  })
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const failures: string[] = []

  for (const route of PAGES) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await setTheme(page, theme)
        const url = `${BASE}${route.path}`
        const tag = `${route.name}_${vp.name}_${theme}`
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
          await page.waitForTimeout(400)
          await shot(page, tag)
          const contrast = await checkHeaderContrast(page)
          const status = contrast.pass ? '✓' : '✗'
          console.log(
            `${status} ${tag.padEnd(34)}  header bg=${contrast.bg} fg=${contrast.fg} Δ=${contrast.delta}`
          )
          if (!contrast.pass) {
            failures.push(`${tag} — header contrast Δ=${contrast.delta} (need >80)`)
          }
        } catch (err) {
          console.log(`✗ ${tag} — ${(err as Error).message.slice(0, 60)}`)
          failures.push(`${tag} — ${(err as Error).message.slice(0, 80)}`)
        }
      }
    }
  }

  await browser.close()

  console.log()
  if (failures.length === 0) {
    console.log(`✓ All ${PAGES.length * VIEWPORTS.length * THEMES.length} checks passed.`)
    console.log(`Screenshots → ${OUT_DIR}`)
  } else {
    console.log(`✗ ${failures.length} failure(s):`)
    for (const f of failures) console.log(`   ${f}`)
    console.log(`Screenshots → ${OUT_DIR}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
