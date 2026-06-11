// One-off helper: auto-pick the FIRST candidate per Ship/Hold/Kill on a given
// issue. Used for design-preview test sends so the email has the full SHK
// section without waiting for human pick.

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { createAdminSupabaseClient } from '../lib/supabase-admin'

loadDotenv({ path: '.env.local', override: true })

async function main() {
  const issueId = process.argv[2]
  if (!issueId) {
    console.error('Usage: tsx src/scripts/auto-pick-shk.ts <issueId>')
    process.exit(1)
  }
  const supabase = createAdminSupabaseClient()
  const { data: issue, error } = await supabase
    .from('issues')
    .select('payload')
    .eq('id', issueId)
    .single()
  if (error || !issue?.payload) {
    console.error('issue or payload missing:', error?.message)
    process.exit(1)
  }
  const p = issue.payload
  const chosen = {
    ship: p.shk_candidates?.ship?.[0] ?? null,
    hold: p.shk_candidates?.hold?.[0] ?? null,
    kill: p.shk_candidates?.kill?.[0] ?? null,
  }
  const { error: updErr } = await supabase
    .from('issues')
    .update({ chosen_calls: chosen })
    .eq('id', issueId)
  if (updErr) {
    console.error('update failed:', updErr.message)
    process.exit(1)
  }
  console.log('Auto-picked SHK:')
  for (const k of ['ship', 'hold', 'kill'] as const) {
    console.log(`  ${k.toUpperCase()}: ${chosen[k]?.label ?? '(none)'}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
