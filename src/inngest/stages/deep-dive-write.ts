// Stage — Deep-Dive Write
//
// Reads issues.payload.research_pack + candidate_meta. Asks Opus 4.7 to
// produce the locked 7-section essay JSON (DeepDivePayload). Persists to
// issues.payload — merges, does not clobber research_pack / candidate_meta
// so QA + reruns stay idempotent.
//
// Voice register: Stratechery + Air Mail. Scene-open. Named research.
// Inline [text](url) markdown links pulled from research_pack.evidence_triples
// only — never fabricate. No "arguably / potentially". No McKinsey phrases.
// No emoji in headers.

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getAnthropic,
  MODEL_DEEP_DIVE_DRAFT,
  firstText,
  parseJsonFromResponse,
} from '@/lib/anthropic'
import type {
  DeepDivePayload,
  DeepDiveAudience,
  DeepDiveResearchPack,
  DeepDiveCandidateMeta,
} from '../../../db/types/database'

export interface WriteResult {
  issueId: string
  wordCount: number
  sectionCount: number
  primaryAudience: DeepDiveAudience
  cacheUsage: {
    inputTokens: number
    outputTokens: number
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
  }
}

const VALID_AUDIENCES: DeepDiveAudience[] = ['builder', 'pm', 'founder', 'cross-cutting']

const WRITER_SYSTEM = `You are the lead essayist for AI Signal's Deep-Dive Track. Your audience is the engineering/PM-stake subset of Indian AI builders, PMs, and founders. The brief gives them the shift; the deep-dive gives them the durable mental model + receipts to defend a build/buy/rip call in a hostile room.

# VOICE — non-negotiable

Register: Stratechery's "show your work" + Air Mail's editorial pacing + Just Another PM's framework-naming. Confident, named, citation-dense, scene-first.

## Rules

1. SCENE-FIRST openers. Date + place + named actor + number in the first two sentences. Never "In this essay we will…", never an abstract.
2. NAMED RESEARCH. Every debatable claim in Sections 3-4 gets a bracketed [text](url) inline link drawn from the research_pack.evidence_triples. The "[text]" describes the source ("Hamel Husain's evals primer", "Anthropic's Claude 4 model card", "RBI's Sept 2025 circular").
3. NO HEDGING. Strike "arguably", "potentially", "could be argued", "may serve to". Pick a position.
4. NO MCKINSEY. Strike "leverage", "harness", "delve", "unlock", "robust", "seamless", "transformative", "ecosystem" (metaphorical), "landscape" (metaphorical), "journey" (metaphorical).
5. NO EMOJI in headings, ever.
6. NO three-clause em-dash strings. One em-dash per sentence max.
7. CONCRETE > abstract. ₹14L burned in 3 weeks beats "significant cost overrun". "Bajaj Finance's voice support stack" beats "Indian financial services".
8. "I" SPARINGLY. Max 3 times across the essay, reserved for confession or stake-naming ("I underestimated this last quarter").

# LOCKED 7-SECTION STRUCTURE

| # | Section | Length | Voice cue |
|---|---|---|---|
| 1 | cold_open | 120-180 words | One scene. Named actor. Number. End on the thesis-tease (NOT the assumption stated yet). |
| 2 | assumption | 80-120 words | State the common belief in ONE italicized sentence (use markdown _italics_). Then 2-3 sentences setting up why it's wrong without yet showing the evidence. |
| 3 | evidence_sections | 3-5 sub-sections, 1800-2800 words TOTAL | Each section: ≤8-word heading, 1-line claim, then proof. Inline [text](url) links from research_pack throughout. INR math, paper citations, production logs, regulator filings. Average ≥1 link per 200 words across these sections. |
| 4 | india_twist | 350-500 words | What changes when you re-run the analysis with INR pricing, DPDP, Indic data, GCC org charts. MUST cite at least one india_context_anchor from the research_pack (INR number / DPDP clause / Indic model fact / named Indian customer). This is the wedge global writers can't copy. |
| 5 | monday_actions | 3 numbered actions, 200-300 words total | Each ≤2 sentences. NAMES files, contracts, team roles, vendors. Not "consider X". Verbs: "Open", "Schedule", "Rip out", "Add a column to", "Renegotiate", "Forward to your security lead". |
| 6 | counter_positions | 80-120 words | 2-3 entries. Steel-man (charitable phrasing) of the strongest opposing views. Each entry pulls from research_pack.counter_positions. Honesty over fabrication. |
| 7 | further_reading | 5-8 links | One-line annotation per link. Pull from research_pack URLs. Annotation states WHY this is the next read. |

# OUTPUT — strict JSON, no fences, no markdown wrapper

{
  "title": "<≤8 words. Sharp, contrarian, named verb. Like 'Long context didn't kill RAG. Cost did.' or 'Your agent is a ₹14L tail-risk bet.' NEVER 'The future of X' or 'Why X matters'.>",
  "subtitle": "<one sentence, ≤20 words. The thesis stated plain.>",
  "cold_open": "<120-180 words per the rules above>",
  "assumption": "<80-120 words. Use markdown _italics_ around the belief in the first sentence.>",
  "evidence_sections": [
    {
      "heading": "<≤8 words>",
      "body": "<the section body. Includes inline [text](url) markdown links from research_pack only. Multiple paragraphs ok, separated by \\n\\n.>"
    }
  ],
  "india_twist": "<350-500 words. ≥1 india_context_anchor cited.>",
  "monday_actions": [
    { "number": 1, "action": "<≤2 sentences. Names file/team/contract/vendor.>" },
    { "number": 2, "action": "<…>" },
    { "number": 3, "action": "<…>" }
  ],
  "counter_positions": [
    {
      "claim": "<strongest opposing view, charitable phrasing>",
      "best_link": "<URL from research_pack.counter_positions>",
      "steel_man": "<≤80 words steel-manning the position>"
    }
  ],
  "further_reading": [
    {
      "url": "<URL>",
      "annotation": "<one-line WHY this is the next read>"
    }
  ],
  "primary_audience": "<builder | pm | founder | cross-cutting>"
}

# RULES FOR THE SCHEMA

- evidence_sections: 3-5 entries, 1800-2800 words total.
- monday_actions: exactly 3 entries.
- counter_positions: 2-3 entries. Pull from research_pack.counter_positions — keep the same URLs.
- further_reading: 5-8 entries. URLs should appear in the research_pack or be canonical references from the evidence_anchor_urls.
- Inline links use markdown [text](url) syntax — never raw URLs in body prose, never footnote numbers.
- Every URL cited inline must exist in research_pack.evidence_triples OR research_pack.counter_positions OR candidate_meta.evidence_anchor_urls. No fabrication.
- primary_audience should match candidate_meta.primary_audience unless the research pack shifted the lens.

# YOUR LOOP

1. Read the research_pack. Identify the spine: which 3-5 sub-claims build the contrarian thesis?
2. Pick a contrarian title. Verb + stake.
3. Write the cold open — one scene with a number.
4. State the assumption italicized + set up the swerve.
5. Write each evidence section with citations from research_pack inline.
6. Write the India twist using india_context_anchors.
7. Write 3 numbered Monday actions, each naming a concrete artifact.
8. Pull 2-3 counter_positions verbatim from research_pack (don't soften).
9. Write further_reading from the corpus.
10. Output JSON. Stop.`

export async function runStageDeepDiveWrite(opts: {
  issueId: string
}): Promise<WriteResult> {
  const supabase = createAdminSupabaseClient()
  const anthropic = getAnthropic()

  // 1. Load existing payload (must have research_pack + candidate_meta).
  const { data: issue, error: loadErr } = await supabase
    .from('issues')
    .select('id, payload')
    .eq('id', opts.issueId)
    .single()
  if (loadErr) throw new Error(`load issue: ${loadErr.message}`)
  const existing = (issue.payload as Partial<DeepDivePayload> | null) ?? {}
  const researchPack = existing.research_pack as DeepDiveResearchPack | undefined
  const candidateMeta = existing.candidate_meta as DeepDiveCandidateMeta | undefined
  if (!researchPack) {
    throw new Error('payload.research_pack missing — run deep-dive-research first')
  }
  if (!candidateMeta) {
    throw new Error('payload.candidate_meta missing — run deep-dive-research first')
  }

  // 2. Build user message.
  const userMessage = `# CANDIDATE META

ASSUMPTION CHALLENGED: ${candidateMeta.assumption_challenged}
ESSAY HOOK: ${candidateMeta.one_paragraph_hook}
PRIMARY AUDIENCE: ${candidateMeta.primary_audience}
EVIDENCE ANCHOR URLs:
${candidateMeta.evidence_anchor_urls.map((u) => `  - ${u}`).join('\n')}

# RESEARCH PACK

## Evidence triples (${researchPack.evidence_triples.length})
${researchPack.evidence_triples
  .map(
    (e, i) =>
      `${i + 1}. URL: ${e.url}
   CLAIM: ${e.claim_supported}
   QUOTE: ${e.quote}`
  )
  .join('\n\n')}

## Counter-positions (${researchPack.counter_positions.length})
${researchPack.counter_positions
  .map(
    (c, i) =>
      `${i + 1}. CLAIM: ${c.claim}
   LINK: ${c.best_link}
   STEEL-MAN: ${c.steel_man}`
  )
  .join('\n\n')}

## India-context anchors (${researchPack.india_context_anchors.length})
${researchPack.india_context_anchors
  .map((a, i) => `${i + 1}. FACT: ${a.fact}\n   SOURCE: ${a.source}`)
  .join('\n\n')}

# YOUR TASK

Produce the DeepDivePayload JSON per the system prompt. 2800-4000 word essay. Inline [text](url) links throughout Sections 3-4. JSON only.`

  // 3. Call Opus.
  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: MODEL_DEEP_DIVE_DRAFT,
      max_tokens: 16_000,
      system: [
        {
          type: 'text',
          text: WRITER_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new Error(`deep-dive write API ${err.status}: ${err.message}`)
    }
    throw err
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('deep-dive write hit max_tokens — output truncated')
  }

  const text = firstText(response)
  const parsed = parseJsonFromResponse<DeepDivePayload>(text)

  // 4. Sanitize / normalize.
  const audience: DeepDiveAudience = VALID_AUDIENCES.includes(parsed.primary_audience)
    ? parsed.primary_audience
    : candidateMeta.primary_audience

  const essay: DeepDivePayload = {
    kind: 'deep_dive',
    title: (parsed.title ?? '').trim(),
    subtitle: (parsed.subtitle ?? '').trim(),
    cold_open: (parsed.cold_open ?? '').trim(),
    assumption: (parsed.assumption ?? '').trim(),
    evidence_sections: Array.isArray(parsed.evidence_sections)
      ? parsed.evidence_sections.map((s) => ({
          heading: (s.heading ?? '').trim(),
          body: (s.body ?? '').trim(),
        }))
      : [],
    india_twist: (parsed.india_twist ?? '').trim(),
    monday_actions: Array.isArray(parsed.monday_actions)
      ? parsed.monday_actions.map((a, i) => ({
          number: typeof a.number === 'number' ? a.number : i + 1,
          action: (a.action ?? '').trim(),
        }))
      : [],
    counter_positions: Array.isArray(parsed.counter_positions)
      ? parsed.counter_positions.map((c) => ({
          claim: (c.claim ?? '').trim(),
          best_link: (c.best_link ?? '').trim(),
          steel_man: (c.steel_man ?? '').trim(),
        }))
      : [],
    further_reading: Array.isArray(parsed.further_reading)
      ? parsed.further_reading.map((r) => ({
          url: (r.url ?? '').trim(),
          annotation: (r.annotation ?? '').trim(),
        }))
      : [],
    primary_audience: audience,
    research_pack: researchPack,
    candidate_meta: candidateMeta,
  }

  // 5. Persist back to issues.payload.
  const { error: updErr } = await supabase
    .from('issues')
    .update({ payload: essay, status: 'drafted' })
    .eq('id', opts.issueId)
  if (updErr) throw new Error(`persist deep-dive payload: ${updErr.message}`)

  const wordCount = countWords(
    [
      essay.cold_open,
      essay.assumption,
      ...essay.evidence_sections.map((s) => s.body),
      essay.india_twist,
      ...essay.monday_actions.map((a) => a.action),
      ...essay.counter_positions.map((c) => c.steel_man),
    ].join(' ')
  )

  return {
    issueId: opts.issueId,
    wordCount,
    sectionCount: essay.evidence_sections.length,
    primaryAudience: essay.primary_audience,
    cacheUsage: {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  }
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}
