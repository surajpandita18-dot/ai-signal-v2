// Stage — Deep-Dive Topic Discovery
//
// Runs fortnightly (alternate Mondays 18:00 IST) AFTER the weekly brief
// ships. Reads 60 days of long-form raw_items, asks Claude for 5
// candidate "assumptions Indian AI builders hold that the evidence
// contradicts." Persists to deep_dive_candidates. Owner picks one at
// /review/deep-dive.
//
// The human gate per CLAUDE.md rule #1 stays for the deep-dive track:
// the model proposes candidates; Suraj picks. The discovery agent does
// NOT auto-select — that's the editorial judgment we protect.

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getAnthropic,
  MODEL_SYNTHESIZE,
  firstText,
  parseJsonFromResponse,
} from '@/lib/anthropic'

const DISCOVERY_MODEL = MODEL_SYNTHESIZE // Opus 4.7 — assumption-finding needs nuance
const LOOKBACK_DAYS = 60
const MAX_ITEMS_TO_PROMPT = 240
const NUM_CANDIDATES = 5

const DISCOVERY_SYSTEM = `You are the editor scouting for a long-form essay series with THREE co-equal audiences — Indian AI builders (engineers shipping), PMs (at GCCs / SIs / Indian enterprises with AI budget), and founders (bootstrapped + AI-native). A deep-dive that ONLY serves builders fails. A deep-dive that ONLY serves PMs fails. Every candidate must work for at least 2 of the 3 archetypes — ideally all 3 — via different lenses on the same shift.

Your beat: find ASSUMPTIONS one of these communities holds that the evidence quietly contradicts.

Good candidates have all five:
1. Widely-held belief in the builder/PM/founder community (LinkedIn / X / podcast circuit / pitch decks).
2. Specific evidence that contradicts it (paper, production case, INR math, regulator filing, named procurement story).
3. Indian-context wedge — when re-run for Yotta H100s / DPDP / RBI / Indic data / GCC budgets / Indian payment rails, the contradiction is sharper than the global version.
4. ACTION implications for at least 2 of {builder Monday code-level call, PM build-vs-buy memo, founder fundraise/positioning slide}.
5. The dive moves a decision an actual reader is about to make this quarter — not abstract foresight.

Bad candidates:
- Generic "AI hype vs reality" (too broad — no one's decision changes)
- News stories (the weekly brief handles those — deep-dive is about durable mental models)
- Pure engineering debate with no PM/founder business angle
- Pure PM "framework for thinking about X" with no builder code-level grounding
- Anything where the contradicting evidence is opinion not data

# AUDIENCE MIX REQUIREMENT

Across the ${NUM_CANDIDATES} candidates you propose: at least 1 must lean PM-primary (procurement, build-vs-buy, vendor management, contracts, eval strategy at org scale), at least 1 must lean builder-primary (architecture, code-level technique, latency/cost engineering, model choice), and at least 1 must lean founder-primary (moat, fundraise narrative, distribution, pricing). The remaining 2 should be the cross-cutting topics that work for all three.

# OUTPUT — strict JSON, no fences

{
  "candidates": [
    {
      "assumption_challenged": "<one sentence stating what the audience believes>",
      "one_paragraph_hook": "<3-5 sentence essay hook. Open with a specific scene/number/named person/INR figure. End with what the dive will reveal. India-grounded.>",
      "primary_audience": "<builder | pm | founder | cross-cutting>",
      "evidence_anchor_urls": ["<URL>", "<URL>", "<URL>", "<URL>", "<URL>"],
      "score": <1-10 integer — how strong this is as a deep-dive candidate>
    }
  ]
}

Always exactly ${NUM_CANDIDATES} candidates honoring the audience mix above. URLs MUST be from the items provided — never fabricate.`

type AudienceLean = 'builder' | 'pm' | 'founder' | 'cross-cutting'

interface DiscoveryOutput {
  candidates: Array<{
    assumption_challenged: string
    one_paragraph_hook: string
    primary_audience?: AudienceLean
    evidence_anchor_urls: string[]
    score: number
  }>
}

function compactItemForPrompt(it: {
  source: string
  title: string
  excerpt: string | null
  url: string
  published_at: string | null
}): string {
  const date = it.published_at
    ? new Date(it.published_at).toISOString().slice(0, 10)
    : '—'
  const excerpt = (it.excerpt ?? '').slice(0, 220).replace(/\s+/g, ' ').trim()
  return `[${date}] ${it.source} — ${it.title}\n  ${excerpt}\n  ${it.url}`
}

export interface DiscoverResult {
  candidatesWritten: number
  cacheUsage: {
    inputTokens: number
    outputTokens: number
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
  }
}

export async function runStageDeepDiveDiscover(): Promise<DiscoverResult> {
  const supabase = createAdminSupabaseClient()
  const anthropic = getAnthropic()

  // Pull last 60 days of long-form raw_items. We bias toward longer
  // excerpts (deep-dive-flavored content) by ordering on published_at.
  const cutoffIso = new Date(
    Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: items, error } = await supabase
    .from('raw_items')
    .select('source, title, excerpt, url, published_at')
    .gte('published_at', cutoffIso)
    .order('published_at', { ascending: false })
    .limit(MAX_ITEMS_TO_PROMPT)
  if (error) throw new Error(`discovery load items: ${error.message}`)

  if (!items || items.length < 30) {
    throw new Error(
      `discovery: only ${items?.length ?? 0} items in 60-day window — need ≥30. Run smoke-source --track long-form first.`
    )
  }

  const userMessage = `# RECENT LONG-FORM CORPUS (${items.length} items, past ${LOOKBACK_DAYS} days)

${items.map(compactItemForPrompt).join('\n\n')}

# YOUR TASK

Propose exactly ${NUM_CANDIDATES} deep-dive candidates per the system prompt schema. Score each 1-10. Pick assumptions where the corpus already contains 3+ pieces of contradicting evidence so the dive has anchor URLs to work with.`

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: DISCOVERY_MODEL,
      max_tokens: 6000,
      system: [
        {
          type: 'text',
          text: DISCOVERY_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new Error(`discovery API ${err.status}: ${err.message}`)
    }
    throw err
  }

  if (response.stop_reason === 'max_tokens') {
    throw new Error('discovery hit max_tokens — output truncated')
  }

  const text = firstText(response)
  const parsed = parseJsonFromResponse<DiscoveryOutput>(text)

  if (!parsed.candidates || parsed.candidates.length === 0) {
    throw new Error('discovery: parsed output has no candidates')
  }

  // Persist. Default audience to 'cross-cutting' if model omitted.
  const validAudiences: AudienceLean[] = ['builder', 'pm', 'founder', 'cross-cutting']
  const rows = parsed.candidates.map((c) => ({
    assumption_challenged: c.assumption_challenged,
    one_paragraph_hook: c.one_paragraph_hook,
    primary_audience:
      c.primary_audience && validAudiences.includes(c.primary_audience)
        ? c.primary_audience
        : ('cross-cutting' as const),
    evidence_anchor_urls: c.evidence_anchor_urls,
    score: Math.max(1, Math.min(10, Math.round(c.score))),
    chosen: false as const,
  }))

  const { error: insertErr } = await supabase
    .from('deep_dive_candidates')
    .insert(rows)
  if (insertErr) {
    throw new Error(`discovery insert: ${insertErr.message}`)
  }

  return {
    candidatesWritten: rows.length,
    cacheUsage: {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  }
}
