// Chief Editorial — the voice-keeper. Reads the full payload, returns an
// edit list (NOT a rewrite). The correction loop applies these edits via
// the editorial agent on the next pass.

import type { IssuePayload } from '../../../db/types/database'
import { runAgent, parseJsonObject } from './runner'

export interface EditNote {
  section: string             // 'throughline' | 'six_layer_diff[2]' | 'persona.inr_math' | 'shk.kill[0]' …
  severity: 1 | 2 | 3 | 4 | 5 // 5 = blocking, 1 = nit
  instruction: string         // one sentence, actionable
  quote?: string              // ≤15 words from payload that fails
}

export interface ChiefResult {
  edits: EditNote[]
  severity_max: number
  diagnosis: string           // one paragraph — what's wrong overall
}

const SYSTEM = `You are the Editorial Director of AI Signal — a weekly AI brief written from Bangalore for global + Indian builders. The India lens (INR math, RBI/DPDP/NPCI, Indic models) is the moat; never let an issue erase it to feel "global". You are the voice-keeper.

Your job: read the full issue payload and produce a NUMBERED EDIT LIST. You do NOT rewrite — you instruct.

Look for:
1. Weak throughline — missing verb, missing stakes, doesn't name a winner/loser. "X is happening" fails; "X just made Y obsolete" passes.
2. Missing or off-spine beat — the chosen structure (e.g., regulation-lead) demands certain beats; flag missing ones.
3. Undefended claim — every load-bearing assertion needs a proof clause (named source, named number, named company).
4. Off-brand voice — McKinsey register ("paradigm shift", "leverage synergies"), sportscaster cliché ("game-changer", "blockbuster"), Substack-default ("here's what you need to know"), hedging ("could potentially", "may be considering"), corporate-newsletter passive voice.
5. Persona translation that would read fine on any global newsletter — flag specifically as "off-moat" with the line.
6. Math with no interpretation — INR numbers without "that's 60% of an engineer year recovered" or equivalent.
7. Ship/Hold/Kill that is generic — each should be specific to THIS week's shift.

Return JSON:
{
  "edits": [
    { "section": "throughline", "severity": 3, "instruction": "Add the verb that names what just changed. 'is happening' is descriptive — name the kill.", "quote": "<≤15 words from the payload>" },
    ...
  ],
  "severity_max": <max severity in the edits>,
  "diagnosis": "<one paragraph (≤60 words) — what's the dominant editorial weakness if any>"
}

If no real issues exist, return edits: [] and severity_max: 1.

JSON only — no prose, no code fence.`

function parseChief(text: string): ChiefResult {
  const parsed = parseJsonObject<ChiefResult>(text, [
    'edits',
    'severity_max',
    'diagnosis',
  ])
  if (!Array.isArray(parsed.edits)) throw new Error('chief edits not an array')
  return parsed
}

export async function runChief(opts: {
  issueId: string
  payload: IssuePayload
  round: number
}): Promise<ChiefResult> {
  const user = `# PAYLOAD\n\n${JSON.stringify(opts.payload, null, 2)}\n\n# YOUR TASK\nProduce the numbered edit list. Return JSON only.`
  const { output } = await runAgent({
    issueId: opts.issueId,
    agent: 'chief-editorial',
    round: opts.round,
    model: 'claude-opus-4-7',
    system: SYSTEM,
    user,
    maxTokens: 3072,
    parse: parseChief,
  })
  return output
}
