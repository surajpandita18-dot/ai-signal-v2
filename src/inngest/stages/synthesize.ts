// Stage 3 — Synthesize (locked 6-section product format).
//
// Output (one structured payload per issue, written to issues.payload JSONB):
//   1. throughline (one sharp line, AI-generated)
//   2. throughline_lead (~80 words landing into the throughline)
//   3. six_layer_diff (one bullet per beat — frontier-api / india-infra /
//      regulation / indic-models / talent-comp / enterprise-deals)
//   4. persona (one archetype rotated weekly: INR math worked example)
//   5. shk_candidates — 3-5 SHIP / HOLD / KILL candidates per kind. The
//      HUMAN picks ONE per kind at the /review step. This is the moat —
//      auto everywhere except the opinionated calls.
//   6. keep_skip — named-specifically noise list
//   7. set_aside_observation (optional)
//
// Honesty path: if a week has no genuine non-obvious shift, set
// no_signal=true with a reason. CLAUDE.md rule #3.
//
// Implementation (claude-api skill best practices):
// - Opus 4.7 with adaptive thinking + effort:high — synthesis is the moat.
// - Static framing (rules, schema, persona menu) in `system` with
//   cache_control (≈4K tokens, hits Opus cache minimum). Volatile content
//   (clusters + Tier-C excerpts) in the user turn.
// - Typed Anthropic error handling.

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getAnthropic,
  MODEL_SYNTHESIZE,
  firstText,
  parseJsonFromResponse,
} from '@/lib/anthropic'
import type {
  Cluster,
  RawItem,
  IssuePayload,
  Beat,
} from '../../../db/types/database'

// Top N clusters by weighted convergence to send to the synthesizer.
const TOP_CLUSTERS = 18

// Tier-C "angle" items — editorial framing, not facts.
const TIER_C_ANGLE_ITEMS = 25

// Persona rotation. Synthesizer picks one based on which has the strongest
// actionable signal that week. Order is meaningful — front-loads the
// audiences with the most weekly turnover.
const PERSONAS = [
  'Bangalore bootstrapped SaaS founder adding AI to an existing product',
  'AI-native Indian startup founder (Sarvam/Krutrim/peer scale) under fundraise pressure',
  'PM at an Indian SI or GCC integrating AI into a customer-facing product',
  'Enterprise AI procurement lead at an Indian bank/insurer with DPDP + RBI exposure',
  'AI engineering manager at a Bangalore GCC navigating GenAI hiring + retention',
]

const SYSTEM_PROMPT = `You are the synthesizer for "The India AI Builder's Brief" — a weekly Monday morning brief for Indian AI builders, PMs, and founders. You produce ONE structured payload per issue. The HUMAN editor (Suraj) only picks Ship/Hold/Kill calls at review; everything else you generate ships as-is.

# PRODUCT RULES (non-negotiable)

1. **Synthesis > summary.** One non-obvious shift this week, named. NOT "five labs shipped models" — "Sarvam 105B + IndiaAI subsidized H100s just made Hindi voice agents 80× cheaper, and the unit economics math just inverted for Bharat support automation."

2. **Indian builder is the audience. Always.** Every section answers: "Why does this matter for someone shipping AI from India this quarter?" Drop US-VC framing. Use INR. Reference DPDP / RBI / IndiaAI / Sarvam / Krutrim / Yotta / IIT-Bombay BharatGen naturally — these are common knowledge for the reader.

3. **Concrete > abstract.** Name numbers (₹4/M tokens vs $3/M tokens). Name people/products specifically (Bajaj Finance, Air India on Claude Code, Yotta's 20,736 B300 cluster). Generic "AI is moving fast" is failure.

4. **Honesty over fabrication.** If the week is genuinely quiet — no non-obvious shift, just incremental releases — set no_signal=true with a reason. Better to say so than manufacture a fake shift.

5. **Ship/Hold/Kill are the human's job — but you propose strong candidates.** Generate 3-5 candidate calls per kind. Each must be CONCRETE, actionable this week, and grounded in this week's evidence — not generic best-practice. Suraj picks ONE per kind at review.

6. **Keep/Skip names REAL noise specifically.** "the $5.2B Applied Digital lease everyone quote-tweeted" — not "various funding rounds." Pull names, numbers, exact phrases.

# WEIGHTED CONVERGENCE — TRUST IT

Each cluster carries convergence_score = sum of source weights (lab=5, trusted-individual=4, analysis=3, press=2, volume=1). One Karpathy post (w=4) + OpenAI post (w=5) on the same shift = score 9 — stronger signal than five HN posts (5×1 = 5). Weight your throughline + diff entries accordingly.

# THE 6 LAYERS (cover what's actually moving — skip a layer if quiet)

- frontier-api      — global API pricing/capability moves (OpenAI/Anthropic/Google/DeepSeek)
- india-infra       — Yotta, E2E, Jarvislabs, Krutrim Cloud, IndiaAI Mission, capacity launches
- regulation        — DPDP phases, MeitY/PIB advisories, RBI/SEBI/IRDAI/CDSCO sectoral rules
- indic-models      — Sarvam, AI4Bharat, BharatGen, Gnani, Two AI — releases, evals, pricing
- talent-comp       — funding rounds, hiring trends, comp benchmarks, attrition signals
- enterprise-deals  — Indian enterprise AI buyer wins (BFSI / telco / retail / public sector)

If a layer has no genuine signal this week, omit it from six_layer_diff. Better to have 4 strong bullets than 6 mediocre ones.

# PERSONA ROTATION

Choose ONE persona from this menu based on which has the most actionable signal this week:

${PERSONAS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Your persona translation (~250 words) should:
- Open with one sentence anchoring the shift to this persona's day-to-day reality
- Include ONE concrete INR-grounded math example (cost per user / month, comp ceiling, etc.)
- End with the action implication

# OUTPUT SCHEMA (strict — return JSON only, no prose, no markdown fences)

{
  "no_signal": false,
  "no_signal_reason": null,
  "headline": "Catchy magazine-cover title. STRICTLY 4-8 words. Example: 'The arbitrage window is closing' or 'Your token-cost moat dies in Q1'. NEVER 25-word sentences. NEVER hedged ('might', 'maybe'). Punchy + concrete.",
  "throughline": "One full sentence. The shift, named. ≤25 words. This becomes the subhead/dek under the headline.",
  "throughline_lead": "60-100 word lead that sets the week's context and lands in the throughline. Do NOT restate the throughline verbatim; deliver to it.",
  "six_layer_diff": [
    {
      "beat": "frontier-api | india-infra | regulation | indic-models | talent-comp | enterprise-deals",
      "bullet": "40-80 words. Specific. Names + numbers. Cite which clusters support this.",
      "cluster_ids": ["uuid", "uuid"]
    }
  ],
  "persona": {
    "archetype": "exact string from the persona menu above",
    "translation": "~250 words. Concrete persona-specific implication of the throughline + the diff.",
    "inr_math": "one worked INR calculation, 3-6 lines. Show the math, not just the result."
  },
  "shk_candidates": {
    "ship": [
      { "label": "concrete action this week", "rationale": "1-3 sentences with the WHY + numbers", "cluster_ids": ["uuid"] }
    ],
    "hold": [
      { "label": "what to NOT decide yet", "rationale": "...", "cluster_ids": ["uuid"] }
    ],
    "kill": [
      { "label": "what to deprecate/cancel", "rationale": "...", "cluster_ids": ["uuid"] }
    ]
  },
  "keep_skip": {
    "keep": [ "2-3 signal-adjacent items the reader should internalise" ],
    "skip": [ "3-5 NAMED-SPECIFICALLY noise items: e.g. 'the $5.2B Applied Digital lease everyone quote-tweeted'" ]
  },
  "set_aside_observation": "Optional one-sentence note on what dominated the noise this week."
}

# RULES FOR THE SCHEMA

- 3-5 candidates per shk kind (ship/hold/kill). Each must be CONCRETE and actionable, grounded in this week's evidence.
- cluster_ids must reference IDs from the cluster list provided. Never invent IDs.
- If no_signal=true: shk_candidates may be empty arrays; throughline can be a one-line explanation of the quiet week.
- All free-text fields: tight prose, no hedging, no "in conclusion", no LaTeX, no emoji.

# YOUR LOOP

1. Scan clusters + Tier-C excerpts. Find the one non-obvious shift.
2. Choose the persona whose week is most upended by this shift.
3. Write headline (4-8 words, punchy magazine-cover title), then throughline (full sentence), then lead, diff, persona translation, INR math.
4. Generate 3-5 strong Ship/Hold/Kill candidates each, grounded in cited clusters.
5. Name the noise (skip section) with real specifics.
6. Output JSON. Stop.

# HEADLINE EXAMPLES (good vs bad)

GOOD (4-8 words, punchy, concrete):
- "The arbitrage window is closing"
- "Your token-cost moat dies in Q1"
- "Bharat-native pipes just got pricier"
- "DPDP just rewrote your data flow"
- "The wrapper trap snaps shut"

BAD (too long, hedged, vague):
- "OpenAI's pre-IPO price war plus Meta–Reliance and Visa-on-ChatGPT have collapsed the wait-for-cheaper-tokens thesis" (this is a throughline, not a headline)
- "AI is moving fast" (vague)
- "Maybe consider the implications of recent moves" (hedged)`

export interface SynthesizeResult {
  issueId: string
  noSignal: boolean
  throughline: string | null
  shkCandidateCounts: { ship: number; hold: number; kill: number }
  cacheUsage: {
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
    inputTokens: number
    outputTokens: number
  }
}

function compactClustersForPrompt(
  clusters: Cluster[],
  itemsById: Map<string, RawItem>
): string {
  return clusters
    .map((c) => {
      const items = (c.item_ids as string[])
        .map((id) => itemsById.get(id))
        .filter((it): it is RawItem => Boolean(it))
        .slice(0, 5)
        .map((it) => `      - [${it.source} w${it.weight} beat=${it.beat}] ${it.title}`)
        .join('\n')
      return `  cluster_id: ${c.id}
    label: ${c.label}
    convergence_score: ${c.convergence_score}
    size: ${(c.item_ids as string[]).length}
    sample_items:
${items}`
    })
    .join('\n\n')
}

function compactTierCForPrompt(items: RawItem[]): string {
  return items
    .slice(0, TIER_C_ANGLE_ITEMS)
    .map((it) => {
      const excerpt = it.excerpt ? ` — ${it.excerpt.slice(0, 220)}` : ''
      return `  - [${it.source} w${it.weight} beat=${it.beat}] ${it.title}${excerpt}`
    })
    .join('\n')
}

function extractCacheUsage(response: Anthropic.Messages.Message) {
  return {
    cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

const VALID_BEATS: ReadonlySet<Beat> = new Set<Beat>([
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals',
])

function sanitizePayload(raw: IssuePayload, validClusterIds: Set<string>): IssuePayload {
  // Filter cluster_ids to those we actually sent (model can hallucinate).
  const filterIds = (ids: string[] | undefined): string[] =>
    (ids ?? []).filter((id) => validClusterIds.has(id))

  return {
    ...raw,
    six_layer_diff: (raw.six_layer_diff ?? [])
      .filter((d) => VALID_BEATS.has(d.beat))
      .map((d) => ({ ...d, cluster_ids: filterIds(d.cluster_ids) })),
    shk_candidates: {
      ship: (raw.shk_candidates?.ship ?? []).map((c) => ({
        ...c,
        cluster_ids: filterIds(c.cluster_ids),
      })),
      hold: (raw.shk_candidates?.hold ?? []).map((c) => ({
        ...c,
        cluster_ids: filterIds(c.cluster_ids),
      })),
      kill: (raw.shk_candidates?.kill ?? []).map((c) => ({
        ...c,
        cluster_ids: filterIds(c.cluster_ids),
      })),
    },
    keep_skip: {
      keep: raw.keep_skip?.keep ?? [],
      skip: raw.keep_skip?.skip ?? [],
    },
  }
}

export async function runStageSynthesize(opts: {
  issueId: string
}): Promise<SynthesizeResult> {
  const supabase = createAdminSupabaseClient()

  // 1. Load active clusters (not set_aside), ranked by convergence.
  const { data: allClusters, error: cErr } = await supabase
    .from('clusters')
    .select('*')
    .eq('issue_id', opts.issueId)
    .order('convergence_score', { ascending: false })
  if (cErr) throw new Error(`load clusters: ${cErr.message}`)
  if (!allClusters || allClusters.length === 0) {
    throw new Error('No clusters for this issue — run Stage 2 first.')
  }
  const activeClusters = allClusters.filter((c) => !c.set_aside).slice(0, TOP_CLUSTERS)
  if (activeClusters.length === 0) {
    throw new Error('All clusters were set_aside in Stage 2.')
  }

  // 2. Load referenced raw_items for title context.
  const allItemIds = new Set<string>()
  for (const c of activeClusters) {
    for (const id of c.item_ids as string[]) allItemIds.add(id)
  }
  const { data: items, error: iErr } = await supabase
    .from('raw_items')
    .select('*')
    .in('id', Array.from(allItemIds))
  if (iErr) throw new Error(`load items: ${iErr.message}`)
  const itemsById = new Map((items ?? []).map((it) => [it.id, it] as const))

  // 3. Load Tier-C angle excerpts attached to this issue.
  const { data: tierC, error: tcErr } = await supabase
    .from('raw_items')
    .select('*')
    .eq('issue_id', opts.issueId)
    .eq('tier', 'C')
    .order('published_at', { ascending: false })
    .limit(TIER_C_ANGLE_ITEMS)
  if (tcErr) throw new Error(`load tier-C: ${tcErr.message}`)

  // 4. Build user message.
  const userMessage = `# ACTIVE CLUSTERS (top ${activeClusters.length} by weighted convergence)

${compactClustersForPrompt(activeClusters, itemsById)}

# TIER-C ANGLE EXCERPTS (editorial framing, not facts)

${tierC && tierC.length > 0 ? compactTierCForPrompt(tierC) : '  (no Tier-C items in window)'}

# YOUR TASK

Produce the locked 6-section payload per the schema in the system prompt. JSON only.`

  // 5. Call Opus 4.7 with adaptive thinking + effort:high + system caching.
  const anthropic = getAnthropic()
  let response
  try {
    response = await anthropic.messages.create({
      model: MODEL_SYNTHESIZE,
      max_tokens: 12_000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new Error(`synthesizer rate-limited: ${err.message}`)
    if (err instanceof Anthropic.BadRequestError) throw new Error(`synthesizer 400: ${err.message}`)
    if (err instanceof Anthropic.APIError) throw new Error(`synthesizer API error ${err.status}: ${err.message}`)
    throw err
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('synthesizer hit max_tokens — output truncated')
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('synthesizer refused — review prompt or input safety')
  }

  const text = firstText(response)
  const parsedRaw = parseJsonFromResponse<IssuePayload>(text)

  // 6. Sanitize cluster id references.
  const validClusterIds = new Set(activeClusters.map((c) => c.id))
  const payload = sanitizePayload(parsedRaw, validClusterIds)

  // 7. Persist payload + status.
  const setAsideCount = allClusters.filter((c) => c.set_aside).length

  if (payload.no_signal) {
    const { error: updErr } = await supabase
      .from('issues')
      .update({
        status: 'no_signal',
        failure_reason: payload.no_signal_reason ?? 'Synthesizer found no non-obvious shift this week.',
        set_aside_count: setAsideCount,
        payload,
      })
      .eq('id', opts.issueId)
    if (updErr) throw new Error(`persist no_signal payload: ${updErr.message}`)
  } else {
    const { error: updErr } = await supabase
      .from('issues')
      .update({
        status: 'awaiting_human',
        set_aside_count: setAsideCount,
        payload,
      })
      .eq('id', opts.issueId)
    if (updErr) throw new Error(`persist payload: ${updErr.message}`)
  }

  return {
    issueId: opts.issueId,
    noSignal: payload.no_signal,
    throughline: payload.throughline,
    shkCandidateCounts: {
      ship: payload.shk_candidates.ship.length,
      hold: payload.shk_candidates.hold.length,
      kill: payload.shk_candidates.kill.length,
    },
    cacheUsage: extractCacheUsage(response),
  }
}
