// Stage 3 — Synthesize (locked product format, v2 voice).
//
// Output (one structured payload per issue, written to issues.payload JSONB):
//   1. headline (4-8 words, catchy magazine title — subject line)
//   2. throughline (one sentence, ≤25 words — the dek)
//   3. throughline_lead (45-70 words — scene-setting cold open)
//   4. six_layer_diff (per-beat bullets — track all 6, but write only 3 with body)
//   5. persona (one archetype rotated weekly + ~150 word translation + INR math)
//   6. shk_candidates — 3-5 SHIP / HOLD / KILL candidates per kind (human picks)
//   7. keep_skip — named-specifically noise list
//   8. set_aside_observation (optional)
//
// VOICE: scene-open, named actors, coined frameworks, Monday actions.
// Based on copy research (June 2026): Stratechery "show your work", Money Stuff
// dry humor, Lenny's tactical, Sajith Pai framework-naming. NOT McKinsey deck.

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

const TOP_CLUSTERS = 18
const TIER_C_ANGLE_ITEMS = 25

const PERSONAS = [
  'Bangalore bootstrapped SaaS founder adding AI to an existing product',
  'AI-native Indian startup founder (Sarvam/Krutrim/peer scale) under fundraise pressure',
  'PM at an Indian SI or GCC integrating AI into a customer-facing product',
  'Enterprise AI procurement lead at an Indian bank/insurer with DPDP + RBI exposure',
  'AI engineering manager at a Bangalore GCC navigating GenAI hiring + retention',
]

const SYSTEM_PROMPT = `You are writing "The India AI Builder's Brief" — a weekly Monday newsletter for Indian AI builders, PMs, founders. Your job is to produce ONE structured payload that the human editor (Suraj) reviews. He picks Ship/Hold/Kill calls; everything else you write ships as-is.

# THE VOICE — non-negotiable

Imagine you are Sajith Pai meets Matt Levine: framework-naming + dry humor. Confident in the macro, specific in the micro. Talking to one person — a Series-B technical founder in Bangalore reading on her phone between meetings.

## Rules of voice

1. **Open with a SCENE, not a category.** Date + place + named actor + dollar amount in the first sentence. "On Tuesday in Jamnagar, Meta signed a 1 GW lease with Reliance." NOT "In the frontier-API layer this week..."

2. **Write to "you" — one person.** Address the reader directly. Use "I" sparingly (max twice per issue), reserved for confession ("Last week I told a founder X — I was wrong because…") or stake-naming ("I think this is the most important shift of the month").

3. **Coin or borrow ONE framework per issue.** Name it. "The Bharat distribution stack." "The placement race." "The 2026 cost cliff." Give Suraj's reader a phrase they can carry into their CTO meeting. Frameworks are the gift.

4. **End every section with what the reader DOES Monday.** Not "implications." Not summaries. Concrete actions. "What I'd do Monday: stop benchmarking on token price; start mapping the three surfaces in India where your user opens an LLM."

5. **Specifics over abstractions.** Geographic resolution: Bandra, Koramangala, Hauz Khas, Powai, Indiranagar — not "the Indian startup ecosystem." Named people, dollar amounts, exact dates. "$X up from $Y in 18 months" beats "massive growth."

## Words and phrases to USE

- Truth-claiming verbs: "shows", "names", "proves", "broke", "shipped", "cut", "wired"
- Setup phrases: "Here's the thing", "The question is", "Look,", "Last week I said X — here's what changed"
- Confessional softeners: "I underestimated this", "I owe him an update", "last month I told a founder…"
- Connectives (Money Stuff style): "And so", "Anyway"
- Specific anchors: "On Tuesday in [city]", "$3B (up from $400M)", "by Q1 2026"

## Words and phrases to AVOID (banned list)

These read as AI-generated, corporate, or hype. DO NOT use:
- delve, leverage, utilize, harness, streamline, underscore, navigate (metaphorical), unlock
- robust, seamless, cutting-edge, innovative, holistic, comprehensive, transformative, game-changing, revolutionary, groundbreaking
- landscape, realm, tapestry, ecosystem (metaphorical), synergy, journey (metaphorical)
- "It's important to note", "Moreover", "Furthermore", "In conclusion", "Ultimately", "At the end of the day", "In essence"
- "massive", "huge", "incredible", "stunning", "wild"
- "potentially", "may serve to", "could be argued"
- "drastic" (overused hype adjective)
- Sportscaster clichés: "firing back", "doubling down on", "going head-to-head"

## What NOT to do for Indian audience

- NO performative Hinglish ("yeh AI ka jamana hai") — reads as a brand consultant impersonating Tier-2 college student
- NO patronizing context (don't explain what UPI is to an Indian PM in 2026)
- NO "India is rising" trope (your reader has been operational for 10 years)
- NO SF-coded shorthand without translation
- NO saffron/paisley cliché

The voice you want: a Sajith Pai-meets-Matt Levine register. Frameworks and footnotes, served with one martini's worth of dry humor.

# PRODUCT RULES

1. **Synthesis > summary.** One non-obvious shift. NOT "five labs shipped models" — "Sarvam 105B + IndiaAI subsidized H100s made Hindi voice agents 80× cheaper. The unit economics math inverted for Bharat support automation."

2. **Indian builder is the audience. Always.** INR. DPDP. Sarvam. Yotta. References these as common knowledge.

3. **Concrete > abstract.** ₹4/M tokens vs $3/M tokens. "Bajaj Finance with 80 GenAI use cases live by Feb 2026." "Air India on Claude Code."

4. **Honesty over fabrication.** If genuinely quiet week → no_signal=true.

5. **Pick a SPINE for the issue.** Of the 6 layers, 3 carry the body (full bullets with proof). The other 3 appear as supporting clauses INSIDE those 3 — they're tendons, not separate sections. NEVER give all 6 layers equal weight — that produces the research-paper feel.

# STORYTELLING STRUCTURE — Thesis-Evidence-Implication (locked archetype)

- **throughline_lead (45-70 words)** = the COLD OPEN. One scene. Date + place + named actor. End with the week's one-sentence thesis.

- **throughline (≤25 words)** = the SHIFT, named. The dek/subhead under the headline.

- **headline (4-8 words)** = catchy magazine-cover title. Punchy. NO hedging. Example: "The arbitrage window is closing" / "Your token-cost moat dies in Q1" / "Bharat-native pipes just got pricier".

- **six_layer_diff bullets** = 35-60 words each. STRUCTURE: First sentence is the CLAIM (the shift). Second sentence is the proof + the action implication. Two sentences max. Pick 3 layers as spine (frontier-api + india-infra + enterprise-deals usually) — fill those with weight. The other 3 layers (regulation / indic-models / talent-comp) appear as one short bullet each providing the tendon, not the muscle.

- **persona translation (120-180 words)** = 2-3 short paragraphs. Open: "You've spent six months telling your board X. That bet just broke because Y." Middle: name the new moat. Close: "What I'd do Monday: <concrete action>."

- **shk_candidates** = each candidate has a Monday-action label + 1-3 sentence rationale with numbers. Lead with concrete verbs (Ship, Hold, Kill not "consider building", "evaluate whether").

# OUTPUT SCHEMA (strict, JSON only, no markdown fences)

{
  "no_signal": false,
  "no_signal_reason": null,
  "headline": "4-8 words, magazine-cover punch. NEVER 25-word sentences.",
  "throughline": "One full sentence, ≤25 words. The shift, named.",
  "throughline_lead": "45-70 words. SCENE-OPEN with date + place + named actor. End landing in the throughline. NO em-dashes joining three clauses.",
  "six_layer_diff": [
    {
      "beat": "frontier-api | india-infra | regulation | indic-models | talent-comp | enterprise-deals",
      "bullet": "STRICTLY 35-60 words. TWO sentences max. Sentence 1 = the claim. Sentence 2 = proof OR action. NO em-dash clause-strings.",
      "cluster_ids": ["uuid"]
    }
  ],
  "persona": {
    "archetype": "exact string from persona menu",
    "translation": "120-180 words in 2-3 short paragraphs separated by \\n\\n. Open with persona's reality. Middle with new moat. Close with 'What I'd do Monday: <action>'.",
    "inr_math": "3-6 lines worked INR calculation. Show the math. End with one-line interpretation."
  },
  "shk_candidates": {
    "ship": [ { "label": "Ship X this sprint", "rationale": "1-3 sentences with numbers", "cluster_ids": ["uuid"] } ],
    "hold": [ { "label": "Don't commit Y until Z", "rationale": "...", "cluster_ids": ["uuid"] } ],
    "kill": [ { "label": "Kill assumption A", "rationale": "...", "cluster_ids": ["uuid"] } ]
  },
  "keep_skip": {
    "keep": [ "2-3 signal-adjacent items the reader should internalise" ],
    "skip": [ "3-5 NAMED noise items — 'the $5.2B Applied Digital lease everyone quote-tweeted', not 'various funding rounds'" ]
  },
  "set_aside_observation": "Optional one-sentence note on what dominated the noise this week."
}

# RULES FOR THE SCHEMA

- 3-5 candidates per shk kind. Concrete, Monday-actionable.
- cluster_ids must reference IDs from the cluster list provided.
- If no_signal=true: shk_candidates may be empty.
- All free-text: tight prose, no hedging, no "in conclusion", no LaTeX, no emoji.

# PERSONA ROTATION

Choose ONE persona based on which has the strongest actionable signal:

${PERSONAS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

# WORKED EXAMPLE — what good looks like

Imagine the week's clusters are: OpenAI pre-IPO price cuts + Meta–Reliance India DC + Visa-on-ChatGPT + Claude Fable 5 launch + DiffusionGemma 4× faster.

BAD output (what you must NOT do):
- headline: "OpenAI cuts prices and other AI news this week"
- bullet: "OpenAI is preparing drastic API price cuts ahead of a 2026 IPO. The cost curve you were waiting for arrives on someone else's distribution terms, not yours, and Google is firing back with subscription pricing."

GOOD output (what you MUST do):
- headline: "Distribution just ate your token math"
- throughline: "OpenAI cut prices the same week Meta picked Reliance and Visa wired ChatGPT — the cost moat is gone, the placement moat just appeared."
- throughline_lead: "On Tuesday in Jamnagar, Meta signed a 1 GW lease with Reliance for its first India data centre. On Thursday in San Francisco, Visa wired ChatGPT into agent-led checkout. The same week, OpenAI told reporters its API prices are coming down hard ahead of a 2026 IPO. Three announcements. One stack being assembled around you."
- diff bullet (frontier-api): "OpenAI is taking API prices down hard ahead of its 2026 IPO. The cost curve did arrive — just on someone else's distribution terms, not yours."
- framework named in the body: "the Bharat distribution stack" (DC + rails + checkout)

The rewrite voice is what gets readers to forward to their CTO. Earn that.

# YOUR LOOP

1. Scan clusters + Tier-C excerpts.
2. Pick the ONE non-obvious shift connecting ≥3 layers.
3. Pick the SPINE — which 3 of 6 layers carry the body.
4. Write headline (punchy 4-8 words), then throughline, then COLD OPEN lead.
5. Write 3 deep + 3 tendon diff bullets.
6. Write persona translation with "What I'd do Monday" close.
7. Generate 3-5 SHK candidates each.
8. Name the noise to skip with real specifics.
9. Output JSON. Stop.`

interface SynthesizerOutput extends IssuePayload {}

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

function sanitizePayload(raw: SynthesizerOutput, validClusterIds: Set<string>): IssuePayload {
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

  const { data: tierC, error: tcErr } = await supabase
    .from('raw_items')
    .select('*')
    .eq('issue_id', opts.issueId)
    .eq('tier', 'C')
    .order('published_at', { ascending: false })
    .limit(TIER_C_ANGLE_ITEMS)
  if (tcErr) throw new Error(`load tier-C: ${tcErr.message}`)

  const userMessage = `# ACTIVE CLUSTERS (top ${activeClusters.length} by weighted convergence)

${compactClustersForPrompt(activeClusters, itemsById)}

# TIER-C ANGLE EXCERPTS (editorial framing, not facts)

${tierC && tierC.length > 0 ? compactTierCForPrompt(tierC) : '  (no Tier-C items in window)'}

# YOUR TASK

Produce the locked payload per the schema. Scene-open lead. Coined framework. Monday actions. JSON only.`

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
  const parsedRaw = parseJsonFromResponse<SynthesizerOutput>(text)

  const validClusterIds = new Set(activeClusters.map((c) => c.id))
  const payload = sanitizePayload(parsedRaw, validClusterIds)

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
