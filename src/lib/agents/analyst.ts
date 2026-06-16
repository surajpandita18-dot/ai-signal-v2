// Analyst — picks which structural template best fits this week's clusters.
// First stage of the multi-agent editorial pipeline. Returns chosen_structure
// + rationale + spine_beats. Does NOT write copy.

import type { Beat } from '../../../db/types/database'
import { runAgent, parseJsonObject } from './runner'

export type StructureKey =
  | 'standard-6-layer'
  | 'no-signal'
  | 'one-thing-deep-zoom'
  | 'regulation-lead'
  | 'deal-heavy'

export const STRUCTURE_BRIEFS: Record<StructureKey, string> = {
  'standard-6-layer':
    'Default issue spine. 6 beats, ~60 words each. One throughline pulling them together. Persona translation + INR math. Use when ≥3 beats moved this week.',
  'no-signal':
    'Honest "no shift this week" issue per CLAUDE.md rule #3. Single 200-word lead naming what dominated noise + why none of it changed your stack. No 6-layer, no INR math. Sources/skip section still ships.',
  'one-thing-deep-zoom':
    'One cluster dominates ≥40% of convergence. Spend 60% of the issue on that single shift — its proof, second-order effects, persona impact. Compress remaining beats to one sentence each.',
  'regulation-lead':
    'DPDP / RBI / NPCI / SEBI moved meaningfully. Lead with regulation beat; other 5 beats framed AS responses to that move. INR math should reflect compliance cost, not just inference cost.',
  'deal-heavy':
    'Three or more named enterprise contracts this week. Lead with enterprise-deals beat. The deal log IS the throughline; remaining beats explain why those deals shaped that way.',
}

export interface AnalystResult {
  chosen_structure: StructureKey
  rationale: string                // one sentence
  spine_beats: Beat[]              // 3 of 6, in display order
}

const SYSTEM = `You are the structural editor for AI Signal — a weekly Monday-morning AI brief written from Bangalore for builders worldwide, with the India lens (INR math, RBI/DPDP/NPCI, Indic models) as the moat.

Given the week's top clusters (convergence scores + beat distribution), decide which of 5 templates this week's signal fits:

- "standard-6-layer" — ≥3 beats moved meaningfully
- "no-signal" — no non-obvious shift; honestly say so per CLAUDE.md rule #3
- "one-thing-deep-zoom" — one cluster dominates ≥40% of convergence
- "regulation-lead" — DPDP/RBI/MeitY/NPCI/SEBI moved
- "deal-heavy" — ≥3 named enterprise contracts

Return JSON:
{
  "chosen_structure": "<one of the 5 keys>",
  "rationale": "<one sentence (≤30 words) — what about the clusters made this template the right call>",
  "spine_beats": ["<beat-1>", "<beat-2>", "<beat-3>"]    // top 3 in display order, from frontier-api, india-infra, regulation, indic-models, talent-comp, enterprise-deals
}

You do NOT write copy. You do NOT pick Ship/Hold/Kill. You do NOT name a throughline. You CHOOSE the structural template only. JSON only — no prose, no code fence.`

function parseAnalyst(text: string): AnalystResult {
  const parsed = parseJsonObject<AnalystResult>(text, [
    'chosen_structure',
    'rationale',
    'spine_beats',
  ])
  const validStructures: StructureKey[] = [
    'standard-6-layer',
    'no-signal',
    'one-thing-deep-zoom',
    'regulation-lead',
    'deal-heavy',
  ]
  if (!validStructures.includes(parsed.chosen_structure)) {
    throw new Error(`analyst chose invalid structure "${parsed.chosen_structure}"`)
  }
  if (!Array.isArray(parsed.spine_beats) || parsed.spine_beats.length < 1) {
    throw new Error('analyst spine_beats missing or empty')
  }
  return parsed
}

// Cluster summary input: callers pass a brief structured summary (NOT the
// full raw_items text — keep this call cheap; Sonnet-tier on ~6k tokens).
export async function runAnalyst(opts: {
  issueId: string
  clusterSummary: Array<{
    id: string
    label: string
    beat: Beat | null
    convergence: number             // 0..1 — how many sources agreed
    item_count: number
  }>
  round: number
}): Promise<AnalystResult> {
  const user = `# CLUSTERS THIS WEEK\n\n${JSON.stringify(opts.clusterSummary, null, 2)}\n\n# YOUR TASK\nChoose the structural template that best fits. Return the JSON object only.`
  const { output } = await runAgent({
    issueId: opts.issueId,
    agent: 'analyst',
    round: opts.round,
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    user,
    maxTokens: 1024,
    parse: parseAnalyst,
  })
  return output
}
