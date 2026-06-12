// Smoke test: run Stage 1 against real feeds and print results.
// Usage:  pnpm smoke:source
// Requires .env.local with Supabase service-role key.
//
// Does NOT trigger Inngest. Calls runStageSource() directly so you can verify
// feeds are pulling and rows are landing in `raw_items` before we build the rest.

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { runStageSource } from '../inngest/stages/source'
import { SOURCES } from '../config/sources'

// dotenv/config loads .env; explicitly load .env.local on top.
loadDotenv({ path: '.env.local', override: true })

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

async function main() {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (k) => !process.env[k]
  )
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    console.error('Copy .env.local.example to .env.local and fill them in.')
    process.exit(1)
  }

  // --track=news (default) or --track=long-form. Passes through to the stage.
  const trackIdx = process.argv.indexOf('--track')
  const track =
    trackIdx !== -1 && process.argv[trackIdx + 1] === 'long-form'
      ? ('long-form' as const)
      : ('news' as const)

  const filtered = SOURCES.filter((s) => (s.tracks ?? ['news']).includes(track))
  console.log(`Pulling ${filtered.length} feeds (track=${track})...\n`)
  const t0 = Date.now()
  const results = await runStageSource({ track })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  const head = `${pad('SOURCE', 22)} ${pad('TIER', 5)} ${pad('W', 3)} ${pad('FETCHED', 8)} ${pad('INSERTED', 9)} ${pad('SKIPPED', 8)} NOTES`
  console.log(head)
  console.log('-'.repeat(head.length))

  let totFetched = 0
  let totInserted = 0
  let totSkipped = 0
  const failed: string[] = []

  for (const r of results) {
    totFetched += r.fetched
    totInserted += r.inserted
    totSkipped += r.skipped
    const notes = r.error ? `ERROR: ${r.error.slice(0, 60)}` : ''
    if (r.error) failed.push(r.source)
    console.log(
      `${pad(r.source, 22)} ${pad(r.tier, 5)} ${pad(String(r.weight), 3)} ${pad(String(r.fetched), 8)} ${pad(String(r.inserted), 9)} ${pad(String(r.skipped), 8)} ${notes}`
    )
  }

  console.log('-'.repeat(head.length))
  console.log(
    `${pad('TOTAL', 22)} ${pad('', 5)} ${pad('', 3)} ${pad(String(totFetched), 8)} ${pad(String(totInserted), 9)} ${pad(String(totSkipped), 8)}`
  )
  console.log(`\nDone in ${elapsed}s. ${failed.length} feed(s) failed: ${failed.join(', ') || '(none)'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
