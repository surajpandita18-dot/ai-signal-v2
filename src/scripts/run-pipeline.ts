// Run the multi-agent editorial pipeline on an EXISTING issue.
//
// Modes:
//   (default)       — critique only. Runs critics, prints verdict, writes
//                     audit rows to issue_agent_runs. Does NOT touch the payload.
//   --apply         — full loop. Critique → if not converged, snapshot current
//                     payload to issue_payload_history, editorial-rewrite,
//                     re-critique. Up to maxRounds=2. Writes revised payload.
//   --json          — raw JSON output (skips pretty-print)
//
// Usage:
//   npx tsx src/scripts/run-pipeline.ts <issueId>
//   npx tsx src/scripts/run-pipeline.ts <issueId> --apply
//   npx tsx src/scripts/run-pipeline.ts <issueId> --json

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { buildFeedbackBlock } from '../lib/agents/correction-loop'
import { runChief } from '../lib/agents/chief-editorial'
import { runFactCheck } from '../lib/agents/fact-checker'
import { runReadability } from '../lib/agents/readability'
import { runPersonaPanel } from '../lib/agents/personas'
import { runEditorialRewrite } from '../lib/agents/editorial-rewrite'
import type { IssuePayload } from '../../db/types/database'

const MAX_ROUNDS = 2

// Helpers — refactored out of main() so the apply-mode loop can call them.

async function runCriticRound(
  issueId: string,
  payload: IssuePayload,
  clusterEvidence: Array<{
    id: string
    label: string
    sample_items: Array<{ title: string; url: string; excerpt: string }>
  }>,
  round: number
) {
  const t0 = Date.now()
  const [chief, factcheck, readability, personas] = await Promise.all([
    runChief({ issueId, payload, round }),
    runFactCheck({ issueId, payload, clusterEvidence, round }),
    runReadability({ issueId, payload, round }),
    runPersonaPanel({ issueId, payload, round }),
  ])
  const wallMs = Date.now() - t0
  const verdict = {
    round,
    chief_severity_max: chief.severity_max,
    contradicted_count: factcheck.contradicted_count,
    forward_rate: personas.forward_rate,
    scannability_score: readability.scannability_score,
    blocking_edits_count: chief.edits.filter((e) => e.severity >= 3).length,
    pass:
      chief.severity_max <= 2 &&
      factcheck.contradicted_count === 0 &&
      personas.forward_rate >= 0.6,
  }
  return { verdict, chief, factcheck, readability, personas, wallMs }
}

function printRound(
  label: string,
  v: ReturnType<typeof Object> & {
    round: number
    chief_severity_max: number
    contradicted_count: number
    forward_rate: number
    scannability_score: number
    pass: boolean
    blocking_edits_count: number
  },
  wallMs: number
) {
  console.log(`━━━ ${label} ━━━`)
  console.log(`  Pass:                  ${v.pass ? '✓ converged' : '✗ needs revision'}`)
  console.log(`  Chief severity (max):  ${v.chief_severity_max} / 5  (≤2 to pass)`)
  console.log(`  Fact contradictions:   ${v.contradicted_count}  (0 to pass)`)
  console.log(`  Persona forward rate:  ${(v.forward_rate * 100).toFixed(0)}%  (≥60% to pass)`)
  console.log(`  Readability score:     ${v.scannability_score} / 10`)
  console.log(`  Wall-clock:            ${(wallMs / 1000).toFixed(1)}s`)
  console.log()
}

async function main() {
  const issueId = process.argv[2]
  const jsonOnly = process.argv.includes('--json')
  const apply = process.argv.includes('--apply')
  if (!issueId) {
    console.error('Usage: npx tsx src/scripts/run-pipeline.ts <issueId> [--apply] [--json]')
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
    console.log(`▶ Running pipeline on issue ${issueId} ${apply ? '(APPLY mode — will revise payload)' : '(critique only)'}`)
    console.log(`  ${clusterEvidence.length} clusters of evidence loaded`)
    console.log()
  }

  // Round 0 — always runs.
  let working: IssuePayload = payload
  let { verdict, chief, factcheck, readability, personas, wallMs } =
    await runCriticRound(issueId, working, clusterEvidence, 0)

  if (jsonOnly && !apply) {
    console.log(JSON.stringify({ issueId, round: verdict, chief, factcheck, readability, personas, wallMs }, null, 2))
    process.exit(0)
  }

  if (!jsonOnly) printRound('ROUND 0 VERDICT', verdict, wallMs)

  // Apply mode — if round 0 didn't converge, snapshot the original and
  // run the rewrite + re-critique loop up to MAX_ROUNDS.
  let revised = false
  if (apply && !verdict.pass) {
    if (!jsonOnly) {
      console.log('▶ Round 0 did not converge — entering rewrite loop.')
      console.log()
    }
    // Snapshot original payload BEFORE the first rewrite — irreversible
    // safety net for the diff at /review/<id>?compare=previous.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (s.from('issue_payload_history' as any) as any).insert({
      issue_id: issueId,
      snapshot: payload,
      reason: 'rerun-pipeline',
    })

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const fb = buildFeedbackBlock({ chief, factcheck, readability, personas })
      if (!jsonOnly) {
        console.log(`▶ Round ${round}: editorial rewrite…`)
      }
      const t0 = Date.now()
      try {
        working = await runEditorialRewrite({
          issueId,
          currentPayload: working,
          feedbackBlock: fb,
          round,
        })
      } catch (e) {
        console.error(`Round ${round} editorial-rewrite failed:`, e instanceof Error ? e.message : String(e))
        break
      }
      const rewriteMs = Date.now() - t0
      if (!jsonOnly) console.log(`  rewrite done in ${(rewriteMs / 1000).toFixed(1)}s`)

      const next = await runCriticRound(issueId, working, clusterEvidence, round)
      verdict = next.verdict
      chief = next.chief
      factcheck = next.factcheck
      readability = next.readability
      personas = next.personas
      revised = true
      if (!jsonOnly) printRound(`ROUND ${round} VERDICT`, verdict, next.wallMs)
      if (verdict.pass) break
    }

    // Write the revised payload back. status stays whatever it was — we
    // do NOT auto-publish (rule #3). If convergence failed in 2 rounds,
    // flip to awaiting_human so Suraj sees it on /review.
    const newStatus = verdict.pass ? undefined : 'awaiting_human'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upd = await (s.from('issues' as any) as any)
      .update(newStatus ? { payload: working, status: newStatus } : { payload: working })
      .eq('id', issueId)
    if (upd.error) {
      console.error('Failed to write revised payload:', upd.error.message)
      process.exit(1)
    }
    if (!jsonOnly) {
      console.log(`✓ Revised payload written. ${verdict.pass ? 'Converged.' : `Did not converge in ${MAX_ROUNDS} rounds → status='awaiting_human'.`}`)
      console.log()
    }
  }

  if (jsonOnly) {
    console.log(JSON.stringify({ issueId, round: verdict, chief, factcheck, readability, personas, revised }, null, 2))
    process.exit(0)
  }

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

  if (apply) {
    console.log(`✓ Loop complete. Final verdict: ${verdict.pass ? 'converged' : 'awaiting human'}. ${revised ? 'Payload was revised.' : 'Payload unchanged (round 0 passed).'}`)
  } else {
    console.log(`✓ Round 0 complete. ${verdict.pass ? 'No revision needed.' : 'Revision recommended — re-run with --apply.'}`)
  }
  console.log(`  All agent outputs logged to issue_agent_runs for ${issueId}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
