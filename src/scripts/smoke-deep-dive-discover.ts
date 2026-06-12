// Smoke test: run the deep-dive topic discovery agent.
// Persists 5 candidates to deep_dive_candidates; owner picks at /review/deep-dive.
//
// Usage: npx tsx src/scripts/smoke-deep-dive-discover.ts

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { runStageDeepDiveDiscover } from '../inngest/stages/deep-dive-discover'

loadDotenv({ path: '.env.local', override: true })

const AUDIENCE_LABEL: Record<string, string> = {
  builder: '🔧 BUILDER',
  pm: '📋 PM',
  founder: '🚀 FOUNDER',
  'cross-cutting': '↔ CROSS-CUTTING',
}

async function main() {
  const missing = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
  ].filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  console.log('Running deep-dive topic discovery...\n')

  const t0 = Date.now()
  const result = await runStageDeepDiveDiscover()
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`Wrote ${result.candidatesWritten} candidates.\n`)

  // Pull the candidates we just wrote (last N by discovered_at)
  const supabase = createAdminSupabaseClient()
  const { data: candidates } = await supabase
    .from('deep_dive_candidates')
    .select('*')
    .order('discovered_at', { ascending: false })
    .limit(result.candidatesWritten)

  for (const c of candidates ?? []) {
    console.log('━'.repeat(80))
    console.log(
      `${AUDIENCE_LABEL[c.primary_audience] ?? c.primary_audience}  score:${c.score}/10`
    )
    console.log(`ASSUMPTION: ${c.assumption_challenged}`)
    console.log(`HOOK: ${c.one_paragraph_hook}`)
    const urls = c.evidence_anchor_urls as string[]
    console.log(`ANCHORS: ${urls.slice(0, 3).join(', ')}...`)
    console.log('')
  }

  console.log('━'.repeat(80))
  console.log(`Elapsed: ${elapsed}s`)
  console.log(
    `Usage: input=${result.cacheUsage.inputTokens}  cache_write=${result.cacheUsage.cacheCreationInputTokens}  cache_read=${result.cacheUsage.cacheReadInputTokens}  output=${result.cacheUsage.outputTokens}`
  )
  console.log(
    `Review at: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003'}/review/deep-dive`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
