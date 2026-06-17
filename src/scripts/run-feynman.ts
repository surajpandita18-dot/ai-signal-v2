// Run the researcher → editorial-Feynman pipeline on a drafted issue.
// Re-generates the editorial-v2 fields (signal_of_the_week,
// explained_simply, production_questions) from real cluster evidence
// in Andrew-Ng / Feynman / Slack-chatter register.
//
// Does NOT touch six_layer_diff, shk_candidates, or persona — those
// are the synthesizer's territory. This script is the Feynman lift only.
//
// Usage:
//   npx tsx src/scripts/run-feynman.ts <issueId>
//   npx tsx src/scripts/run-feynman.ts <issueId> --refresh-throughline
//   npx tsx src/scripts/run-feynman.ts <issueId> --dry-run   # don't write

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { runResearcher } from '../lib/agents/researcher'
import { runEditorialFeynman } from '../lib/agents/editorial-feynman'
import type { IssuePayload } from '../../db/types/database'

async function main() {
  const issueId = process.argv[2]
  const dryRun = process.argv.includes('--dry-run')
  const refreshTL = process.argv.includes('--refresh-throughline')
  if (!issueId) {
    console.error('Usage: npx tsx src/scripts/run-feynman.ts <issueId> [--refresh-throughline] [--dry-run]')
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  const s = createAdminSupabaseClient()
  const { data: issue, error } = await s
    .from('issues')
    .select('id, issue_type, payload')
    .eq('id', issueId)
    .single()
  if (error || !issue?.payload) {
    console.error('Issue not found or empty payload:', error?.message)
    process.exit(1)
  }
  const payload = issue.payload as IssuePayload

  // Pull cluster evidence — researcher needs cluster labels + sample raw items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clusters } = await (s.from('clusters' as any) as any)
    .select('id, label, item_ids, convergence_score')
    .eq('issue_id', issueId)
    .limit(20)
  const allIds = new Set<string>()
  for (const c of clusters ?? []) {
    const ids = Array.isArray(c.item_ids) ? (c.item_ids as string[]) : []
    for (const id of ids.slice(0, 5)) allIds.add(id)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawItems } = allIds.size
    ? await (s.from('raw_items' as any) as any)
        .select('id, title, url, summary')
        .in('id', Array.from(allIds))
    : { data: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemMap = new Map<string, { title: string; url: string; excerpt: string }>(
    (rawItems ?? []).map((r: { id: string; title?: string; url?: string; summary?: string }) => [
      r.id,
      {
        title: r.title ?? '',
        url: r.url ?? '',
        excerpt: (r.summary ?? '').slice(0, 600),
      },
    ])
  )
  const clusterSummary = (clusters ?? []).map((c: { id: string; label: string; item_ids: unknown; convergence_score: number }) => ({
    id: c.id,
    label: c.label,
    convergence: c.convergence_score ?? 0,
    sample_items: (Array.isArray(c.item_ids) ? (c.item_ids as string[]) : [])
      .slice(0, 5)
      .map((id) => itemMap.get(id))
      .filter((x): x is { title: string; url: string; excerpt: string } => !!x),
  }))

  console.log(`▶ Stage 1 — researcher (Sonnet, ~30s)`)
  console.log(`  ${clusterSummary.length} clusters loaded`)
  const t0 = Date.now()
  const pack = await runResearcher({
    issueId,
    throughlineCandidate: payload.throughline ?? payload.headline ?? '',
    clusterSummary,
    round: 0,
  })
  console.log(`  ✓ pack: ${pack.claims.length} claims, ${pack.counters.length} counters, concept "${pack.feynman_concept.concept}"`)
  console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log()

  console.log(`▶ Stage 2 — editorial-feynman (Opus, ~90s)`)
  const t1 = Date.now()
  const ed = await runEditorialFeynman({
    issueId,
    researchPack: pack,
    currentPayload: payload,
    refreshThroughline: refreshTL,
    round: 0,
  })
  console.log(`  ✓ ${((Date.now() - t1) / 1000).toFixed(1)}s`)
  console.log()

  console.log('━━━ SIGNAL OF THE WEEK ━━━')
  console.log(`  ${ed.signal_of_the_week}`)
  console.log()
  console.log('━━━ EXPLAINED SIMPLY ━━━')
  console.log(`  ${ed.explained_simply.concept}`)
  console.log(`  ${ed.explained_simply.explanation}`)
  console.log()
  console.log('━━━ PRODUCTION QUESTIONS ━━━')
  for (const q of ed.production_questions) console.log(`  - ${q}`)
  if (refreshTL && ed.throughline) {
    console.log()
    console.log('━━━ THROUGHLINE (refreshed) ━━━')
    console.log(`  ${ed.throughline}`)
    console.log()
    console.log('━━━ THROUGHLINE LEAD (refreshed) ━━━')
    console.log(`  ${ed.throughline_lead}`)
  }
  console.log()

  if (dryRun) {
    console.log('--dry-run: not writing to DB.')
    process.exit(0)
  }

  // Snapshot the v2 fields before overwriting (history table)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (s.from('issue_payload_history' as any) as any).insert({
    issue_id: issueId,
    snapshot: {
      signal_of_the_week: payload.signal_of_the_week,
      explained_simply: payload.explained_simply,
      production_questions: payload.production_questions,
      throughline: payload.throughline,
      throughline_lead: payload.throughline_lead,
    },
    reason: 'run-feynman',
  })

  const newPayload: IssuePayload = {
    ...payload,
    signal_of_the_week: ed.signal_of_the_week,
    explained_simply: ed.explained_simply,
    production_questions: ed.production_questions,
  }
  if (refreshTL && ed.throughline) newPayload.throughline = ed.throughline
  if (refreshTL && ed.throughline_lead) newPayload.throughline_lead = ed.throughline_lead

  const upd = await s.from('issues').update({ payload: newPayload }).eq('id', issueId)
  if (upd.error) {
    console.error('Update failed:', upd.error.message)
    process.exit(1)
  }
  console.log(`✓ Payload v2 fields refreshed on ${issueId}.`)
  console.log(`  Prior values snapshotted in issue_payload_history.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
