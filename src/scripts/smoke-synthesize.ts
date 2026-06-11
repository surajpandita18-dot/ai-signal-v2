// Smoke test: run Stage 3 (synthesizer) against an existing issue's clusters.
// Usage:
//   pnpm smoke:synthesize <issueId>
//   pnpm smoke:synthesize          # uses the most-recent issue in 'synthesizing' status

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { runStageSynthesize } from '../inngest/stages/synthesize'

loadDotenv({ path: '.env.local', override: true })

async function resolveIssueId(): Promise<string> {
  const arg = process.argv[2]
  if (arg) return arg

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('issues')
    .select('id, status, created_at')
    .in('status', ['synthesizing', 'awaiting_human'])
    .order('created_at', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) {
    throw new Error(
      'No issue in synthesizing/awaiting_human status. Pass an issueId: pnpm smoke:synthesize <id>'
    )
  }
  return data[0].id
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

  const issueId = await resolveIssueId()
  console.log(`Synthesizing for issue ${issueId}...\n`)

  const t0 = Date.now()
  const result = await runStageSynthesize({ issueId })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  // Re-read the issue to print the full payload.
  const supabase = createAdminSupabaseClient()
  const { data: issue } = await supabase
    .from('issues')
    .select('payload, status')
    .eq('id', issueId)
    .single()
  const payload = issue?.payload

  if (result.noSignal || !payload) {
    console.log('═══ NO SIGNAL ═══')
    console.log(`Status: ${issue?.status}`)
    return
  }

  console.log('═══ THROUGHLINE ═══')
  console.log(payload.throughline)
  console.log()
  console.log(payload.throughline_lead)
  console.log()

  console.log('═══ 6-LAYER DIFF ═══')
  for (const d of payload.six_layer_diff ?? []) {
    console.log(`\n— ${d.beat} —`)
    console.log(d.bullet)
  }
  console.log()

  console.log('═══ PERSONA ═══')
  console.log(`Archetype: ${payload.persona?.archetype}`)
  console.log()
  console.log(payload.persona?.translation)
  console.log()
  console.log('INR math:')
  console.log(payload.persona?.inr_math)
  console.log()

  console.log('═══ SHIP / HOLD / KILL CANDIDATES (human will pick ONE per kind at /review) ═══')
  for (const kind of ['ship', 'hold', 'kill'] as const) {
    console.log(`\n— ${kind.toUpperCase()} (${payload.shk_candidates?.[kind]?.length ?? 0} candidates) —`)
    for (const [i, c] of (payload.shk_candidates?.[kind] ?? []).entries()) {
      console.log(`  ${i + 1}. ${c.label}`)
      console.log(`     ${c.rationale}`)
    }
  }
  console.log()

  console.log('═══ KEEP / SKIP ═══')
  console.log('Keep:')
  for (const k of payload.keep_skip?.keep ?? []) console.log(`  - ${k}`)
  console.log('Skip:')
  for (const s of payload.keep_skip?.skip ?? []) console.log(`  - ${s}`)
  console.log()

  if (payload.set_aside_observation) {
    console.log('Set-aside observation:')
    console.log(`  ${payload.set_aside_observation}`)
    console.log()
  }

  console.log('─'.repeat(80))
  console.log(`Elapsed: ${elapsed}s`)
  console.log(
    `Usage: input=${result.cacheUsage.inputTokens}  cache_write=${result.cacheUsage.cacheCreationInputTokens}  cache_read=${result.cacheUsage.cacheReadInputTokens}  output=${result.cacheUsage.outputTokens}`
  )
  console.log(`Issue id: ${result.issueId}`)
  console.log(`Review URL: http://localhost:3003/review/${result.issueId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
