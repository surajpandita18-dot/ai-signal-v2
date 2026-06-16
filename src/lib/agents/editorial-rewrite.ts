// Editorial-Rewrite — consumes the merged critique feedback + the current
// payload and produces a revised payload. This is NOT a re-synthesis from
// clusters; it's a focused revision agent.
//
// Use case: correction-loop round 1+. The synthesizer (synthesize.ts) does
// the initial creative pass from clusters; this agent does targeted
// rewrites based on critic feedback while preserving voice + structure.
//
// Anchors:
// - .claude/architecture-multi-agent-pipeline.md → Section A (editorial)
// - src/inngest/stages/synthesize.ts (the original creative-pass prompt)

import type { IssuePayload } from '../../../db/types/database'
import { runAgent } from './runner'

const SYSTEM = `You are the senior editor of AI Signal — the Monday weekly AI brief written from Bangalore for global + Indian builders. You receive an ISSUE PAYLOAD draft + a NUMBERED FEEDBACK list from chief editor, fact-checker, readability, and persona panel. Your job: produce a REVISED payload that applies every feedback note.

Rules:
1. Treat every feedback note as a BINDING edit, not a suggestion. If chief flags severity ≥3, that section must change.
2. Preserve voice — short declarative sentences, named numbers, no McKinsey register ("paradigm shift", "leverage synergies"), no hedging ("could potentially"), no sportscaster cliché.
3. Preserve the India lens (INR math, RBI/DPDP/NPCI, Indic models). If feedback says "make it more global", REINFORCE the India angle — global readers want it BECAUSE it's the unique edge.
4. Preserve the schema exactly. Do NOT add fields, do NOT drop required fields. The renderer expects: headline, throughline, throughline_lead, six_layer_diff (array of { beat, bullet, cluster_ids }), persona ({ archetype, translation, inr_math }), shk_candidates ({ ship, hold, kill — each array of { label, rationale, cluster_ids }), keep_skip ({ keep, skip — string arrays }), production_hack (or null), set_aside_observation, no_signal, no_signal_reason.
5. Keep cluster_ids intact on six_layer_diff and shk_candidates rows — do not invent new ids.
6. If a feedback note is wrong (e.g., asks to add a beat that has no evidence), preserve the original and add a one-sentence justification at the END of throughline_lead. Don't fabricate to satisfy feedback.
7. If multiple feedback notes conflict (e.g., persona Priya wants more INR math, persona Marcus wants less India context), optimise for the persona named in payload.persona.archetype; note the trade-off briefly.

Return ONLY the revised payload as a single JSON object — no prose, no code fence.`

export async function runEditorialRewrite(opts: {
  issueId: string
  currentPayload: IssuePayload
  feedbackBlock: string
  round: number
}): Promise<IssuePayload> {
  const user = `# CURRENT PAYLOAD\n\n${JSON.stringify(opts.currentPayload, null, 2)}\n\n# NUMBERED FEEDBACK\n\n${opts.feedbackBlock}\n\n# YOUR TASK\nProduce the revised payload. JSON only.`
  const { output } = await runAgent<IssuePayload>({
    issueId: opts.issueId,
    agent: 'editorial-rewrite',
    round: opts.round,
    model: 'claude-opus-4-7',
    system: SYSTEM,
    user,
    maxTokens: 16_000,
    effort: 'high',
    parse: (text) => {
      const parsed = JSON.parse(text) as IssuePayload
      // Minimal sanity check — full schema validation lives in synthesize.ts
      // sanitizePayload; we trust the rewriter to preserve schema (rule #4
      // in the system prompt). Just guard the load-bearing fields here.
      if (typeof parsed.throughline !== 'string') {
        throw new Error('revised payload missing throughline')
      }
      if (!Array.isArray(parsed.six_layer_diff)) {
        throw new Error('revised payload six_layer_diff not an array')
      }
      if (!parsed.shk_candidates || !Array.isArray(parsed.shk_candidates.ship)) {
        throw new Error('revised payload shk_candidates malformed')
      }
      return parsed
    },
  })
  return output
}
