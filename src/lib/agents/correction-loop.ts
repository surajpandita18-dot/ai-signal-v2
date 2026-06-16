// Correction loop — orchestrates the critic fan-out, decides whether the
// issue passes, and (if not) calls the editorial agent with the merged
// feedback for a revised payload. Bounded at maxRounds = 2.
//
// CRITICAL: the loop NEVER auto-publishes. If round 2 still fails
// convergence, status flips to 'awaiting_human' and Suraj reviews. This
// matches CLAUDE.md rule #3 + Suraj's "human gate on the editorial moat"
// (.claude/learnings-suraj-preferences.md #008).

import type { IssuePayload } from '../../../db/types/database'
import { runChief } from './chief-editorial'
import { runFactCheck } from './fact-checker'
import { runReadability } from './readability'
import { runPersonaPanel } from './personas'

export interface LoopRoundResult {
  round: number
  chief_severity_max: number
  contradicted_count: number
  forward_rate: number
  scannability_score: number
  pass: boolean                                   // convergence achieved?
  blocking_edits_count: number                    // chief edits w/ severity >= 3
}

export interface LoopResult {
  rounds: LoopRoundResult[]
  final_pass: boolean
  unresolved_edits_count: number
  forward_rate: number
}

// Convergence criteria — must hit ALL three for round to count as pass:
//  - chief severity_max <= 2 (no blocking edits)
//  - fact-checker contradicted_count == 0
//  - persona forward_rate >= 0.6 (3 of 5)
function isPass(r: {
  chief_severity_max: number
  contradicted_count: number
  forward_rate: number
}): boolean {
  return r.chief_severity_max <= 2 && r.contradicted_count === 0 && r.forward_rate >= 0.6
}

// Run the parallel critic fan-out for ONE round. Cluster evidence is
// optional — the fact-checker degrades gracefully if absent (still flags
// internal contradictions, won't catch cross-cluster ones).
export async function runCriticsRound(opts: {
  issueId: string
  payload: IssuePayload
  clusterEvidence: Array<{
    id: string
    label: string
    sample_items: Array<{ title: string; url: string; excerpt: string }>
  }>
  round: number
}): Promise<LoopRoundResult> {
  // Fan out — chief + factcheck + readability + 5 personas all run via
  // Promise.all. Wall-clock ≈ slowest call (~30s).
  const [chief, factcheck, readability, personas] = await Promise.all([
    runChief({ issueId: opts.issueId, payload: opts.payload, round: opts.round }),
    runFactCheck({
      issueId: opts.issueId,
      payload: opts.payload,
      clusterEvidence: opts.clusterEvidence,
      round: opts.round,
    }),
    runReadability({ issueId: opts.issueId, payload: opts.payload, round: opts.round }),
    runPersonaPanel({ issueId: opts.issueId, payload: opts.payload, round: opts.round }),
  ])

  const round: LoopRoundResult = {
    round: opts.round,
    chief_severity_max: chief.severity_max,
    contradicted_count: factcheck.contradicted_count,
    forward_rate: personas.forward_rate,
    scannability_score: readability.scannability_score,
    pass: false,
    blocking_edits_count: chief.edits.filter((e) => e.severity >= 3).length,
  }
  round.pass = isPass(round)
  return round
}

// Format merged feedback for the editorial agent's next pass. Concatenates
// chief edits + fact flags + readability notes + persona "missing_thing"
// items into a numbered instruction list.
export function buildFeedbackBlock(parts: {
  chief: import('./chief-editorial').ChiefResult
  factcheck: import('./fact-checker').FactCheckResult
  readability: import('./readability').ReadabilityResult
  personas: import('./personas').PersonaPanelResult
}): string {
  const lines: string[] = []
  let n = 1
  for (const e of parts.chief.edits) {
    lines.push(
      `${n++}. [chief, sev ${e.severity}] ${e.section}: ${e.instruction}${e.quote ? ` (was: "${e.quote}")` : ''}`
    )
  }
  for (const f of parts.factcheck.flags) {
    lines.push(
      `${n++}. [fact, ${f.status}] ${f.section}: "${f.claim}" → ${f.suggested_action}`
    )
  }
  for (const r of parts.readability.notes) {
    lines.push(`${n++}. [read] ${r.section}: ${r.issue} — fix: ${r.fix}`)
  }
  for (const p of parts.personas.panel) {
    if (!p.would_forward && p.missing_thing) {
      lines.push(
        `${n++}. [persona:${p.persona_id}] missing: ${p.missing_thing} (would not forward)`
      )
    }
  }
  return lines.join('\n')
}
