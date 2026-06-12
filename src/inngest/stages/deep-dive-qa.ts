// Stage — Deep-Dive QA
//
// Sonnet 4.6 scores the DeepDivePayload across 6 rubric dimensions (1-10).
// On any failure (<8), regenerates that one section in isolation, then
// re-evaluates. Max 2 retries (long output is expensive).
//
// Why Sonnet not Opus: judging is easier than writing. QA is a hot loop —
// Sonnet is cheaper + fast enough; Opus is reserved for the original write.
//
// Scores are persisted to issue_quality_logs.feedback.deep_dive (JSONB)
// since the table's named columns are for weekly scores.

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getAnthropic,
  MODEL_QA_DEEP_DIVE,
  firstText,
  parseJsonFromResponse,
} from '@/lib/anthropic'
import type { DeepDivePayload } from '../../../db/types/database'

const PASS_THRESHOLD = 8
const DEFAULT_MAX_RETRIES = 2

type Dimension =
  | 'thesis_clarity'
  | 'evidence_density'
  | 'india_context_wedge'
  | 'action_concreteness'
  | 'counter_position_honesty'
  | 'voice_consistency'

const ALL_DIMENSIONS: Dimension[] = [
  'thesis_clarity',
  'evidence_density',
  'india_context_wedge',
  'action_concreteness',
  'counter_position_honesty',
  'voice_consistency',
]

const RUBRIC = `# RUBRIC — score each dimension 1-10

## 1. thesis_clarity
A reader should be able to state the contrarian thesis in ONE sentence after finishing Section 2 (the assumption).
- 10: Section 2 italicizes the belief, then names the swerve plainly. Cold open landed the stake.
- 8-9: Thesis is statable but requires re-reading.
- 5-7: Thesis emerges only by Section 3 or 4. Section 2 hedges.
- 1-4: No identifiable contrarian position. Reads as survey.

## 2. evidence_density
≥1 inline [text](url) markdown link per 200 words across Sections 3-4. Every link unique. Quotes match the claim they support.
- 10: ≥1 link / 200 words, all unique, sources visibly anchor the claims.
- 8-9: Density holds 80% of the time. Maybe one repeat link.
- 5-7: Density drops in the second half. Some claims uncited.
- 1-4: Sparse linking. Reads as op-ed not essay.

## 3. india_context_wedge
Section 4 (india_twist) cites an INR number, a DPDP/RBI/MeitY clause, an Indic-data fact, or a named Indian customer/team a global writer plausibly wouldn't have.
- 10: Multiple India-specific facts, each cited. The wedge is undeniable.
- 8-9: One strong India anchor + supporting India context.
- 5-7: India-context is mostly framing without specific facts.
- 1-4: Section 4 reads as a global essay with "India" string-replaced.

## 4. action_concreteness
Section 5 (monday_actions) names a file, contract clause, team role, vendor, or specific metric — not "consider X" or "evaluate whether".
- 10: All 3 actions name concrete artifacts ("Open scripts/eval_runner.py", "Renegotiate AWS Bedrock TCV clause 4.2").
- 8-9: 2 of 3 actions name concrete artifacts.
- 5-7: Actions are concrete-sounding but generic ("update your eval suite").
- 1-4: McKinsey-style imperatives ("consider", "evaluate", "explore").

## 5. counter_position_honesty
Section 6 (counter_positions) charitably steel-mans the opposing view. Each entry has a real link. The writer doesn't strawman.
- 10: Each entry would make the opposing camp nod in recognition. Real URLs.
- 8-9: One entry is slightly soft on the opposition.
- 5-7: Steel-mans are paraphrased weakly; sounds like deck-bullet objections.
- 1-4: Strawmen, or entries missing, or fabricated URLs.

## 6. voice_consistency
No McKinsey words ("leverage", "harness", "delve", "unlock", "robust", "seamless", "transformative", "ecosystem"/"landscape" metaphorical, "journey" metaphorical). No "arguably" or "potentially" or "could be argued". No emoji in headings. No three-clause em-dash strings.
- 10: Voice is editorial throughout. Zero banned words.
- 8-9: 1-2 minor slips.
- 5-7: 3-5 banned words, OR a hedged sentence, OR one emoji.
- 1-4: Multiple McKinsey phrases / emoji / hedging — reads as AI slop.`

const EVALUATOR_SYSTEM = `You are the Editorial Director for AI Signal's Deep-Dive Track. Score a finished deep-dive essay against the locked 6-dimension rubric, then give one sentence of actionable feedback per failing dimension.

${RUBRIC}

# OUTPUT — strict JSON, no fences

{
  "scores": {
    "thesis_clarity": <1-10>,
    "evidence_density": <1-10>,
    "india_context_wedge": <1-10>,
    "action_concreteness": <1-10>,
    "counter_position_honesty": <1-10>,
    "voice_consistency": <1-10>
  },
  "feedback": {
    "thesis_clarity": "<one actionable sentence>" | null,
    "evidence_density": "<…>" | null,
    "india_context_wedge": "<…>" | null,
    "action_concreteness": "<…>" | null,
    "counter_position_honesty": "<…>" | null,
    "voice_consistency": "<…>" | null
  },
  "overall_diagnosis": "<one sentence summarizing what the essay lacks>"
}

# RULES

- Feedback is null for any dimension scoring >= ${PASS_THRESHOLD}.
- Feedback must be ACTIONABLE — name the section + the fix.
- Score honestly. Mediocre work must not pass.`

// Per-section regenerator system prompts. Each rewrites only the failing
// piece — the writer's full system prompt is too heavy for a hot loop.
const REGEN_SYSTEMS: Record<Dimension, string> = {
  thesis_clarity: `You are the Editorial Director rewriting ONE field: the "assumption" section. State the common belief in ONE italicized sentence (markdown _italics_), then 2-3 sentences setting up why it's wrong. 80-120 words total. No hedging.

OUTPUT — JSON only: { "assumption": "<new assumption>" }`,

  evidence_density: `You are the Editorial Director rewriting the evidence_sections array. Add inline [text](url) markdown links throughout — target ≥1 link per 200 words. Pull URLs from the research_pack.evidence_triples shown in the user context. Keep 3-5 sub-sections; keep total length 1800-2800 words.

OUTPUT — JSON only: { "evidence_sections": [ { "heading": "<≤8 words>", "body": "<…>" }, … ] }`,

  india_context_wedge: `You are the Editorial Director rewriting the india_twist section. 350-500 words. Cite at least one INR number, DPDP/RBI clause, Indic-data fact, or named Indian customer from the research_pack.india_context_anchors shown in user context. Use inline [text](url) links.

OUTPUT — JSON only: { "india_twist": "<new india_twist>" }`,

  action_concreteness: `You are the Editorial Director rewriting the monday_actions array. Exactly 3 entries. Each ≤2 sentences. Each must name a file, contract clause, team role, vendor, or specific metric. Verbs like "Open", "Schedule", "Rip out", "Add", "Renegotiate", "Forward to your security lead". Strike "consider", "evaluate", "explore".

OUTPUT — JSON only: { "monday_actions": [ { "number": 1, "action": "<…>" }, { "number": 2, "action": "<…>" }, { "number": 3, "action": "<…>" } ] }`,

  counter_position_honesty: `You are the Editorial Director rewriting the counter_positions array. 2-3 entries. Each steel-mans the opposing view in ≤80 words — the writer should sound like they'd respect the opposing camp. Pull URLs from research_pack.counter_positions shown in user context. No straw men.

OUTPUT — JSON only: { "counter_positions": [ { "claim": "<…>", "best_link": "<URL>", "steel_man": "<…>" }, … ] }`,

  voice_consistency: `You are the Editorial Director rewriting the cold_open. Strike all McKinsey words ("leverage", "harness", "delve", "unlock", "robust", "seamless", "transformative", "ecosystem", "landscape", "journey"), all hedging ("arguably", "potentially", "could be argued"), all emoji, and any three-clause em-dash strings. 120-180 words. Scene-first. Named actor. Number.

OUTPUT — JSON only: { "cold_open": "<new cold_open>" }`,
}

interface EvaluatorOutput {
  scores: Record<Dimension, number>
  feedback: Record<Dimension, string | null>
  overall_diagnosis: string
}

export interface DeepDiveQAResult {
  issueId: string
  finalPass: boolean
  attempts: number
  scores: Record<Dimension, number>
  regenerated: Dimension[]
  overallDiagnosis: string
  cacheUsage: {
    inputTokens: number
    outputTokens: number
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
  }
}

function payloadForEval(payload: DeepDivePayload): Record<string, unknown> {
  // Strip the research_pack from the evaluator view — they get the rubric
  // applied to the FINISHED essay, not the raw materials.
  const { research_pack, candidate_meta, ...essay } = payload
  return essay
}

async function evaluatePayload(
  anthropic: Anthropic,
  payload: DeepDivePayload
): Promise<{ output: EvaluatorOutput; usage: Anthropic.Usage }> {
  const userContent = `# ESSAY TO EVALUATE

${JSON.stringify(payloadForEval(payload), null, 2)}

# YOUR TASK

Score each rubric dimension 1-10 and give actionable feedback for any score below ${PASS_THRESHOLD}.`

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: MODEL_QA_DEEP_DIVE,
      max_tokens: 4096,
      system: [
        { type: 'text', text: EVALUATOR_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userContent }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new Error(`deep-dive QA evaluator API ${err.status}: ${err.message}`)
    }
    throw err
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('deep-dive QA evaluator hit max_tokens')
  }
  const text = firstText(response)
  const output = parseJsonFromResponse<EvaluatorOutput>(text)
  // Clamp scores defensively.
  for (const k of ALL_DIMENSIONS) {
    const v = output.scores?.[k] ?? 0
    output.scores[k] = Math.max(1, Math.min(10, Math.round(v)))
  }
  return { output, usage: response.usage }
}

async function regenerateSection(
  anthropic: Anthropic,
  dim: Dimension,
  payload: DeepDivePayload,
  feedback: string
): Promise<{ result: Record<string, unknown>; usage: Anthropic.Usage }> {
  // The regenerator needs the research_pack in context so it can re-cite.
  const userContent = `# CURRENT ESSAY

${JSON.stringify(payloadForEval(payload), null, 2)}

# RESEARCH PACK (for citations + URLs)

${JSON.stringify(payload.research_pack ?? {}, null, 2)}

# FEEDBACK ON THIS SECTION

${feedback}

Rewrite ONLY the specified field per the system prompt. JSON only.`

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: MODEL_QA_DEEP_DIVE,
      max_tokens: 6000,
      system: [
        { type: 'text', text: REGEN_SYSTEMS[dim], cache_control: { type: 'ephemeral' } },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userContent }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new Error(`deep-dive QA regen (${dim}) API ${err.status}: ${err.message}`)
    }
    throw err
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`deep-dive QA regen (${dim}) hit max_tokens`)
  }
  const text = firstText(response)
  const result = parseJsonFromResponse<Record<string, unknown>>(text)
  return { result, usage: response.usage }
}

function applyRegen(
  payload: DeepDivePayload,
  dim: Dimension,
  result: Record<string, unknown>
): DeepDivePayload {
  const next: DeepDivePayload = JSON.parse(JSON.stringify(payload))
  switch (dim) {
    case 'thesis_clarity':
      if (typeof result.assumption === 'string') next.assumption = result.assumption
      break
    case 'evidence_density':
      if (Array.isArray(result.evidence_sections)) {
        next.evidence_sections = (result.evidence_sections as Array<Record<string, unknown>>).map((s) => ({
          heading: typeof s.heading === 'string' ? s.heading : '',
          body: typeof s.body === 'string' ? s.body : '',
        }))
      }
      break
    case 'india_context_wedge':
      if (typeof result.india_twist === 'string') next.india_twist = result.india_twist
      break
    case 'action_concreteness':
      if (Array.isArray(result.monday_actions)) {
        next.monday_actions = (result.monday_actions as Array<Record<string, unknown>>).map((a, i) => ({
          number: typeof a.number === 'number' ? a.number : i + 1,
          action: typeof a.action === 'string' ? a.action : '',
        }))
      }
      break
    case 'counter_position_honesty':
      if (Array.isArray(result.counter_positions)) {
        next.counter_positions = (result.counter_positions as Array<Record<string, unknown>>).map((c) => ({
          claim: typeof c.claim === 'string' ? c.claim : '',
          best_link: typeof c.best_link === 'string' ? c.best_link : '',
          steel_man: typeof c.steel_man === 'string' ? c.steel_man : '',
        }))
      }
      break
    case 'voice_consistency':
      if (typeof result.cold_open === 'string') next.cold_open = result.cold_open
      break
  }
  return next
}

function accumUsage(
  acc: DeepDiveQAResult['cacheUsage'],
  u: Anthropic.Usage
): DeepDiveQAResult['cacheUsage'] {
  return {
    inputTokens: acc.inputTokens + (u.input_tokens ?? 0),
    outputTokens: acc.outputTokens + (u.output_tokens ?? 0),
    cacheCreationInputTokens:
      acc.cacheCreationInputTokens + (u.cache_creation_input_tokens ?? 0),
    cacheReadInputTokens:
      acc.cacheReadInputTokens + (u.cache_read_input_tokens ?? 0),
  }
}

export async function runStageDeepDiveQA(opts: {
  issueId: string
  maxRetries?: number
}): Promise<DeepDiveQAResult> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
  const supabase = createAdminSupabaseClient()
  const anthropic = getAnthropic()

  const { data: issue, error: loadErr } = await supabase
    .from('issues')
    .select('id, payload')
    .eq('id', opts.issueId)
    .single()
  if (loadErr) throw new Error(`load issue: ${loadErr.message}`)
  if (!issue.payload) throw new Error('issue has no payload — run deep-dive-write first')

  let payload: DeepDivePayload = issue.payload as unknown as DeepDivePayload
  if (!payload.evidence_sections) {
    throw new Error('payload is not a DeepDivePayload (missing evidence_sections)')
  }

  let attempt = 0
  let finalScores: Record<Dimension, number> = ALL_DIMENSIONS.reduce(
    (acc, d) => {
      acc[d] = 0
      return acc
    },
    {} as Record<Dimension, number>
  )
  const regenerated: Dimension[] = []
  let usage: DeepDiveQAResult['cacheUsage'] = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  }
  let overallDiagnosis = ''

  while (attempt <= maxRetries) {
    attempt += 1
    const { output, usage: evalUsage } = await evaluatePayload(anthropic, payload)
    usage = accumUsage(usage, evalUsage)
    finalScores = output.scores
    overallDiagnosis = output.overall_diagnosis

    const failing = ALL_DIMENSIONS.filter((d) => output.scores[d] < PASS_THRESHOLD)
    if (failing.length === 0) break
    if (attempt > maxRetries) break

    // Regenerate failing sections in parallel.
    const regens = await Promise.all(
      failing.map(async (dim) => {
        const fb = output.feedback[dim]
        if (!fb) return null
        try {
          const { result, usage: ru } = await regenerateSection(anthropic, dim, payload, fb)
          return { dim, result, usage: ru }
        } catch (err) {
          console.warn(`deep-dive QA regen failed for ${dim}: ${(err as Error).message}`)
          return null
        }
      })
    )
    for (const r of regens) {
      if (!r) continue
      payload = applyRegen(payload, r.dim, r.result)
      usage = accumUsage(usage, r.usage)
      if (!regenerated.includes(r.dim)) regenerated.push(r.dim)
    }
  }

  // Persist the (possibly regenerated) payload back.
  const { error: updErr } = await supabase
    .from('issues')
    .update({ payload })
    .eq('id', opts.issueId)
  if (updErr) throw new Error(`persist deep-dive payload: ${updErr.message}`)

  const overallPass = ALL_DIMENSIONS.every((d) => finalScores[d] >= PASS_THRESHOLD)

  // Log to issue_quality_logs.feedback.deep_dive (table's named columns are
  // weekly-shape; deep-dive scores live in the JSONB sub-key).
  const { error: logErr } = await supabase.from('issue_quality_logs').insert({
    issue_id: opts.issueId,
    attempt,
    overall_pass: overallPass,
    feedback: {
      deep_dive: {
        scores: finalScores,
        regenerated,
        overall_diagnosis: overallDiagnosis,
      },
    },
    evaluator_model: MODEL_QA_DEEP_DIVE,
    cache_usage: usage,
  })
  if (logErr) console.warn(`deep-dive QA log insert failed: ${logErr.message}`)

  return {
    issueId: opts.issueId,
    finalPass: overallPass,
    attempts: attempt,
    scores: finalScores,
    regenerated,
    overallDiagnosis,
    cacheUsage: usage,
  }
}
