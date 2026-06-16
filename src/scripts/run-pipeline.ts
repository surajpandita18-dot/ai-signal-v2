// Run the multi-agent critique pipeline on an EXISTING issue.
// This is the v1 surface — it does NOT regenerate the payload (Round 2
// editorial agent is the bigger lift). It runs chief + fact-check +
// readability + 5 personas in parallel, prints scores, writes everything
// to `issue_agent_runs`, and saves a brief verdict to disk.
//
// Use cases:
// - Back-fill quality telemetry on existing issues
// - Decide if an issue needs Suraj's manual edit before send
// - Surface specific edits for the next synth pass
//
// Usage:
//   npx tsx src/scripts/run-pipeline.ts <issueId>
//   npx tsx src/scripts/run-pipeline.ts <issueId> --json   # raw output, no pretty-print

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { runCriticsRound, buildFeedbackBlock } from '../lib/agents/correction-loop'
import { runChief } from '../lib/agents/chief-editorial'
import { runFactCheck } from '../lib/agents/fact-checker'
import { runReadability } from '../lib/agents/readability'
import { runPersonaPanel } from '../lib/agents/personas'
import type { IssuePayload } from '../../db/types/database'

async function main() {
  const issueId = process.argv[2]
  const jsonOnly = process.argv.includes('--json')
  if (!issueId) {
    console.error('Usage: npx tsx src/scripts/run-pipeline.ts <issueId> [--json]')
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
  if (error || !issue) {
    console.error('Issue not found:', error?.message)
    process.exit(1)
  }
  if (!issue.payload) {
    console.error('Issue has no payload — synthesize first')
    process.exit(1)
  }
  if (issue.issue_type !== 'weekly_brief') {
    console.error(`Pipeline only supports weekly_brief — got ${issue.issue_type}`)
    process.exit(1)
  }
  const payload = issue.payload as IssuePayload

  // Pull cluster evidence — fact-checker needs raw_item excerpts to verify
  // claims. clusters.item_ids is a jsonb array; we join through raw_items
  // to get title/url/excerpt for each one (cap at 5 items per cluster to
  // keep the prompt cheap).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clusters } = await (s.from('clusters' as any) as any)
    .select('id, label, item_ids')
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
  const clusterEvidence = (clusters ?? []).map((c: { id: string; label: string; item_ids: unknown }) => ({
    id: c.id,
    label: c.label,
    sample_items: (Array.isArray(c.item_ids) ? (c.item_ids as string[]) : [])
      .slice(0, 5)
      .map((id) => itemMap.get(id))
      .filter((x): x is { title: string; url: string; excerpt: string } => !!x),
  }))

  if (!jsonOnly) {
    console.log(`▶ Running critic round on issue ${issueId}`)
    console.log(`  ${clusterEvidence.length} clusters of evidence loaded`)
    console.log()
  }

  // Run round 0 (initial). We keep the four critics + persona panel calls
  // independent so we get all four sub-results back (correction-loop's
  // runCriticsRound only returns the aggregate). Run them directly here for
  // the verbose CLI output; results are still persisted to issue_agent_runs
  // by the underlying runAgent helper.
  const t0 = Date.now()
  const [chief, factcheck, readability, personas] = await Promise.all([
    runChief({ issueId, payload, round: 0 }),
    runFactCheck({ issueId, payload, clusterEvidence, round: 0 }),
    runReadability({ issueId, payload, round: 0 }),
    runPersonaPanel({ issueId, payload, round: 0 }),
  ])
  const wallMs = Date.now() - t0

  // Also call the aggregator for convergence calc (does not re-call API
  // since runAgent has no internal cache; we'd duplicate API calls).
  // Build the round result manually instead.
  const round = {
    round: 0,
    chief_severity_max: chief.severity_max,
    contradicted_count: factcheck.contradicted_count,
    forward_rate: personas.forward_rate,
    scannability_score: readability.scannability_score,
    pass:
      chief.severity_max <= 2 &&
      factcheck.contradicted_count === 0 &&
      personas.forward_rate >= 0.6,
    blocking_edits_count: chief.edits.filter((e) => e.severity >= 3).length,
  }

  if (jsonOnly) {
    console.log(JSON.stringify({ issueId, round, chief, factcheck, readability, personas, wallMs }, null, 2))
    process.exit(0)
  }

  console.log('━━━ ROUND 0 VERDICT ━━━')
  console.log(`  Pass:                  ${round.pass ? '✓ converged' : '✗ needs revision'}`)
  console.log(`  Chief severity (max):  ${round.chief_severity_max} / 5  (≤2 to pass)`)
  console.log(`  Fact contradictions:   ${round.contradicted_count}  (0 to pass)`)
  console.log(`  Persona forward rate:  ${(round.forward_rate * 100).toFixed(0)}%  (≥60% to pass)`)
  console.log(`  Readability score:     ${round.scannability_score} / 10`)
  console.log(`  Wall-clock:            ${(wallMs / 1000).toFixed(1)}s`)
  console.log()

  console.log('━━━ CHIEF EDITORIAL EDITS ━━━')
  if (chief.edits.length === 0) {
    console.log('  (no edits)')
  } else {
    for (const e of chief.edits) {
      console.log(`  [sev ${e.severity}] ${e.section}`)
      console.log(`    → ${e.instruction}`)
      if (e.quote) console.log(`      quote: "${e.quote}"`)
    }
  }
  console.log(`\n  Diagnosis: ${chief.diagnosis}\n`)

  console.log('━━━ FACT-CHECK FLAGS ━━━')
  if (factcheck.flags.length === 0) {
    console.log('  (no flags)')
  } else {
    for (const f of factcheck.flags) {
      console.log(`  [${f.status}] ${f.section}  →  ${f.suggested_action}`)
      console.log(`    "${f.claim}"`)
    }
  }
  if (factcheck.citation_gaps.length) {
    console.log(`\n  Citation gaps:`)
    for (const g of factcheck.citation_gaps) console.log(`    - ${g}`)
  }
  console.log()

  console.log('━━━ READABILITY NOTES ━━━')
  console.log(`  Length: ${readability.length_stats.total_words} words; longest para ${readability.length_stats.longest_paragraph_words}w; longest bullet ${readability.length_stats.longest_bullet_words}w`)
  if (readability.notes.length === 0) {
    console.log('  (no notes)')
  } else {
    for (const n of readability.notes) {
      console.log(`  ${n.section}: ${n.issue}`)
      console.log(`    fix: ${n.fix}`)
    }
  }
  console.log()

  console.log('━━━ PERSONA PANEL ━━━')
  for (const p of personas.panel) {
    const flag = p.would_forward ? '✓ would forward' : '✗ would NOT forward'
    console.log(`  ${p.persona_id.padEnd(7)} ${flag}`)
    console.log(`    strongest:  "${p.strongest_line.slice(0, 80)}${p.strongest_line.length > 80 ? '…' : ''}"`)
    if (p.confusing_line) console.log(`    confusing:  "${p.confusing_line.slice(0, 80)}${p.confusing_line.length > 80 ? '…' : ''}"`)
    console.log(`    missing:    ${p.missing_thing}`)
  }
  console.log()

  console.log('━━━ MERGED FEEDBACK BLOCK (for editorial round 1) ━━━')
  const fb = buildFeedbackBlock({ chief, factcheck, readability, personas })
  console.log(fb)
  console.log()

  console.log(`✓ Round 0 complete. ${round.pass ? 'No revision needed.' : 'Revision recommended.'}`)
  console.log(`  All agent outputs logged to issue_agent_runs for ${issueId}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
