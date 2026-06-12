// Stage 3.5 — Editorial QA pass.
//
// After the synthesizer produces an IssuePayload, this stage evaluates it
// against a 6-dimension rubric (headline / persona / math / hack / keep_skip
// / cohesion), regenerates any section scoring below the threshold (default 8)
// with explicit feedback, and persists the updated payload + scores to
// `issue_quality_logs`.
//
// Cron flow: synth → QA → (pass) → SHK → send | (fail) → status='awaiting_human'.

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getAnthropic,
  MODEL_SYNTHESIZE,
  firstText,
  parseJsonFromResponse,
} from '@/lib/anthropic'
import type { IssuePayload } from '../../../db/types/database'

const EVALUATOR_MODEL = MODEL_SYNTHESIZE // Opus 4.7 — must catch nuance
const PASS_THRESHOLD = 8 // each rubric dim must score >= this
const DEFAULT_MAX_RETRIES = 2

// Rubric definitions — kept short on purpose so evaluator + regenerator share
// the same understanding of "what good looks like".
const RUBRIC = `
# RUBRIC — score each dimension 1-10 against the locked editorial standard

## 1. headline (the 4-7 word magazine-cover title)
- 10: A verb attacking the reader + clear stakes (lost money, dying moat, closing window). Passes the WhatsApp-tap test: a stranger would tap it cold.
- 8-9: One of the three (verb / stakes / WhatsApp-tap) lands; the rest are present but not punchy.
- 5-7: Reads as a section title or a polite restatement of the throughline. Abstract, hedged, or generic.
- 1-4: Press-release voice. "AI pricing shifts in India" / "Weekly synthesis of frontier moves" / "Six layers of change".

## 2. persona — { archetype, translation, inr_math }
Translation only, math gets its own dim below.
- 10: Scene-open ("You've spent six months telling your Series B board…"), names a specific Indian competitor/surface, ends with "What I'd do Monday: <action with named file/slide/contract>".
- 8-9: Scene-open present + one specific named thing. Action is concrete.
- 5-7: Generic strategic prose. Could appear in any global newsletter. "Adopt agentic workflows" / "Re-evaluate your model strategy".
- 1-4: Reads like a Medium post. Hedged, abstract, no named anything.

## 3. math — persona.inr_math
- 10: 3-6 lines of "label : ₹ value" rows, ends with a one-sentence interpretation. Specific to the persona's actual workload (e.g., "Hindi voice agent, 1M MAU"). Delta or breakeven is stated.
- 8-9: All rows present + concrete numbers, but the interpretation is weak or missing.
- 5-7: Has numbers but they're industry averages with no India-specific framing.
- 1-4: No numbers, or fabricated-looking numbers, or numbers without context.

## 4. hack — production_hack
- 10: Names the technique in ≤7 words. "Why it matters" is INR/QPS-grounded. "How to apply" names the first file to edit + the flag/lib/PR + the metric to watch. Source URL is real.
- 8-9: 3 of the 4 above are tight.
- 5-7: Generic "consider using vLLM" without concrete steps.
- 1-4: Missing, or just a paper summary without builder action.

## 5. keep_skip
- 10: Each skip item NAMED specifically ("the $5.2B Applied Digital lease everyone quote-tweeted"). Reason is one sentence and India-relevant.
- 8-9: 4 of 5 skip items are specifically named.
- 5-7: Generic categories ("AI safety drama", "various funding rounds").
- 1-4: Empty, or contradicts the keep list, or contains items the brief should have covered.

## 6. cohesion — throughline_lead + six_layer_diff spine
- 10: Lead is a 45-70 word cold open with date + place + named actor, lands on the week's thesis. The 6 diff bullets visibly orbit one shift; 3 carry weight (spine), 3 are short (tendons).
- 8-9: Lead is strong; spine/tendon balance is close but a layer or two reads at equal weight.
- 5-7: Lead is a topic intro, not a scene. 6 layers read as 6 independent updates.
- 1-4: No connection between layers. Reads as a daily-digest, not a synthesis.
`.trim()

const EVALUATOR_SYSTEM = `You are the Editorial Director for AI Signal, a weekly Monday brief for Indian AI builders. Your job: score a finished payload against the locked rubric, then give one sentence of actionable feedback per failing dimension.

${RUBRIC}

# OUTPUT — strict JSON, no fences

{
  "scores": {
    "headline": <1-10>,
    "persona": <1-10>,
    "math": <1-10>,
    "hack": <1-10>,
    "keep_skip": <1-10>,
    "cohesion": <1-10>
  },
  "feedback": {
    "headline": "<one sentence of specific feedback>" | null,
    "persona": "<…>" | null,
    "math": "<…>" | null,
    "hack": "<…>" | null,
    "keep_skip": "<…>" | null,
    "cohesion": "<…>" | null
  },
  "overall_diagnosis": "<one-sentence summary of what the issue lacks>"
}

# RULES

- Feedback is null whenever score >= ${PASS_THRESHOLD}.
- Feedback must be ACTIONABLE: "rewrite headline as a verb attacking the reader (e.g., 'Meta leased your distribution')", not "headline could be punchier".
- Score honestly. The product fails if mediocre passes.`

// Per-section regenerator system prompts. Each is small + targeted so the
// model focuses on the one piece to rewrite. The rubric is included as
// context but only the relevant dimension matters.
const REGEN_SYSTEMS: Record<RegenSection, string> = {
  headline: `You are the Editorial Director rewriting ONE field. Given the full payload + specific feedback, produce ONLY a new headline. 4-7 words. Verb attacking the reader. Real stakes. Survives a WhatsApp tap from a stranger.

OUTPUT — JSON only, no fences: { "headline": "<new headline>" }`,

  persona: `You are the Editorial Director rewriting the persona TRANSLATION. Keep archetype + inr_math unchanged. Open with "You've spent…" or equivalent scene. Name a specific Indian competitor or surface. End with "What I'd do Monday: <concrete action with a named file, slide, or contract>." 120-180 words across 2-3 paragraphs separated by \\n\\n.

OUTPUT — JSON only: { "translation": "<new translation>" }`,

  math: `You are the Editorial Director rewriting the INR MATH block. 3-6 lines. Format: "<label>: <₹ value with unit>." Last line is a one-sentence interpretation tying the delta or breakeven to the persona's specific situation.

OUTPUT — JSON only: { "inr_math": "<new inr_math>" }`,

  hack: `You are the Editorial Director rewriting the PRODUCTION HACK. Title ≤7 words. why_it_matters is 40-70 words and INR/QPS-grounded for Indian builders (Yotta H100s, Hindi/Tamil voice, DPDP). how_to_apply names the first file to edit + the flag/lib/PR + the metric to watch. source_url MUST be a real URL.

OUTPUT — JSON only: { "production_hack": { "title": "<…>", "why_it_matters": "<…>", "how_to_apply": "<…>", "source_label": "<…>", "source_url": "<…>" } }`,

  keep_skip: `You are the Editorial Director rewriting the KEEP/SKIP block. Each skip item must NAME the specific noise piece (publication + headline or the exact phrase that dominated X). Each keep item is signal-adjacent (didn't make the main brief but worth 30 minutes). Reasons are one sentence and India-relevant.

OUTPUT — JSON only: { "keep_skip": { "keep": ["<item>", …], "skip": ["<item>", …] } }`,

  cohesion: `You are the Editorial Director rewriting the COLD-OPEN LEAD (throughline_lead). 45-70 words. ONE scene. Date + place + named actor. End landing in the week's thesis. No three-clause em-dash strings.

OUTPUT — JSON only: { "throughline_lead": "<new lead>" }`,
}

type Section = 'headline' | 'persona' | 'math' | 'hack' | 'keep_skip' | 'cohesion'
type RegenSection = Section

interface EvaluatorOutput {
  scores: Record<Section, number>
  feedback: Record<Section, string | null>
  overall_diagnosis: string
}

interface QAResult {
  issueId: string
  finalPass: boolean
  attempts: number
  scores: Record<Section, number>
  regenerated: Section[]
  cacheUsage: {
    inputTokens: number
    outputTokens: number
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
  }
  overallDiagnosis: string
}

async function evaluatePayload(
  anthropic: Anthropic,
  payload: IssuePayload
): Promise<{ output: EvaluatorOutput; usage: Anthropic.Usage }> {
  const userContent = `# PAYLOAD TO EVALUATE\n\n${JSON.stringify(payload, null, 2)}\n\n# YOUR TASK\nScore each rubric dimension 1-10 and give feedback for any score below ${PASS_THRESHOLD}.`

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: EVALUATOR_MODEL,
      max_tokens: 4096,
      system: [
        { type: 'text', text: EVALUATOR_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userContent }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError)
      throw new Error(`QA evaluator API ${err.status}: ${err.message}`)
    throw err
  }
  if (response.stop_reason === 'max_tokens')
    throw new Error('QA evaluator hit max_tokens')
  const text = firstText(response)
  const output = parseJsonFromResponse<EvaluatorOutput>(text)
  // Defensive: clamp scores to 1-10
  for (const k of Object.keys(output.scores) as Section[]) {
    const v = output.scores[k]
    output.scores[k] = Math.max(1, Math.min(10, Math.round(v)))
  }
  return { output, usage: response.usage }
}

async function regenerateSection(
  anthropic: Anthropic,
  section: RegenSection,
  payload: IssuePayload,
  feedback: string
): Promise<{ result: Record<string, unknown>; usage: Anthropic.Usage }> {
  const userContent = `# CURRENT PAYLOAD (context)\n\n${JSON.stringify(payload, null, 2)}\n\n# FEEDBACK ON THIS SECTION\n\n${feedback}\n\nRewrite ONLY the specified field per the system prompt.`

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: EVALUATOR_MODEL,
      max_tokens: 4096,
      system: [
        { type: 'text', text: REGEN_SYSTEMS[section], cache_control: { type: 'ephemeral' } },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userContent }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError)
      throw new Error(`QA regenerator (${section}) API ${err.status}: ${err.message}`)
    throw err
  }
  if (response.stop_reason === 'max_tokens')
    throw new Error(`QA regenerator (${section}) hit max_tokens`)
  const text = firstText(response)
  const result = parseJsonFromResponse<Record<string, unknown>>(text)
  return { result, usage: response.usage }
}

function applyRegenResult(
  payload: IssuePayload,
  section: RegenSection,
  result: Record<string, unknown>
): IssuePayload {
  const next: IssuePayload = JSON.parse(JSON.stringify(payload))
  switch (section) {
    case 'headline':
      if (typeof result.headline === 'string') next.headline = result.headline
      break
    case 'persona':
      if (typeof result.translation === 'string' && next.persona) {
        next.persona.translation = result.translation
      }
      break
    case 'math':
      if (typeof result.inr_math === 'string' && next.persona) {
        next.persona.inr_math = result.inr_math
      }
      break
    case 'hack':
      if (result.production_hack && typeof result.production_hack === 'object') {
        next.production_hack = result.production_hack as IssuePayload['production_hack']
      }
      break
    case 'keep_skip':
      if (result.keep_skip && typeof result.keep_skip === 'object') {
        next.keep_skip = result.keep_skip as IssuePayload['keep_skip']
      }
      break
    case 'cohesion':
      if (typeof result.throughline_lead === 'string') {
        next.throughline_lead = result.throughline_lead
      }
      break
  }
  return next
}

function accumUsage(
  acc: QAResult['cacheUsage'],
  u: Anthropic.Usage
): QAResult['cacheUsage'] {
  return {
    inputTokens: acc.inputTokens + (u.input_tokens ?? 0),
    outputTokens: acc.outputTokens + (u.output_tokens ?? 0),
    cacheCreationInputTokens:
      acc.cacheCreationInputTokens + (u.cache_creation_input_tokens ?? 0),
    cacheReadInputTokens:
      acc.cacheReadInputTokens + (u.cache_read_input_tokens ?? 0),
  }
}

export async function runStageEditorialQA(opts: {
  issueId: string
  maxRetries?: number
}): Promise<QAResult> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
  const supabase = createAdminSupabaseClient()
  const anthropic = getAnthropic()

  const { data: issue, error: loadErr } = await supabase
    .from('issues')
    .select('id, payload')
    .eq('id', opts.issueId)
    .single()
  if (loadErr) throw new Error(`load issue: ${loadErr.message}`)
  if (!issue.payload) throw new Error('issue has no payload — run synthesize first')

  let payload: IssuePayload = issue.payload as IssuePayload
  let attempt = 0
  let finalScores: Record<Section, number> = {
    headline: 0,
    persona: 0,
    math: 0,
    hack: 0,
    keep_skip: 0,
    cohesion: 0,
  }
  let regenerated: Section[] = []
  let usage: QAResult['cacheUsage'] = {
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

    const failing = (Object.keys(output.scores) as Section[]).filter(
      (k) => output.scores[k] < PASS_THRESHOLD
    )
    if (failing.length === 0) {
      break // pass
    }
    if (attempt > maxRetries) {
      break // out of retries; record current scores
    }

    // Regenerate each failing section in parallel.
    const regenPromises = failing.map(async (section) => {
      const fb = output.feedback[section]
      if (!fb) return null
      try {
        const { result, usage: regenUsage } = await regenerateSection(
          anthropic,
          section,
          payload,
          fb
        )
        return { section, result, usage: regenUsage }
      } catch (err) {
        // Don't crash the pipeline if one section fails to regen — log and skip.
        console.warn(`QA regen failed for ${section}: ${(err as Error).message}`)
        return null
      }
    })
    const regens = (await Promise.all(regenPromises)).filter(
      (r): r is { section: Section; result: Record<string, unknown>; usage: Anthropic.Usage } =>
        r !== null
    )
    for (const r of regens) {
      payload = applyRegenResult(payload, r.section, r.result)
      usage = accumUsage(usage, r.usage)
      if (!regenerated.includes(r.section)) regenerated.push(r.section)
    }
  }

  // Persist the (possibly updated) payload back to the issue row.
  const { error: updErr } = await supabase
    .from('issues')
    .update({ payload })
    .eq('id', opts.issueId)
  if (updErr) throw new Error(`persist payload: ${updErr.message}`)

  const overallPass =
    finalScores.headline >= PASS_THRESHOLD &&
    finalScores.persona >= PASS_THRESHOLD &&
    finalScores.math >= PASS_THRESHOLD &&
    finalScores.hack >= PASS_THRESHOLD &&
    finalScores.keep_skip >= PASS_THRESHOLD &&
    finalScores.cohesion >= PASS_THRESHOLD

  // Log this run (only the final attempt).
  const { error: logErr } = await supabase.from('issue_quality_logs').insert({
    issue_id: opts.issueId,
    attempt,
    headline_score: finalScores.headline,
    persona_score: finalScores.persona,
    math_score: finalScores.math,
    hack_score: finalScores.hack,
    keep_skip_score: finalScores.keep_skip,
    cohesion_score: finalScores.cohesion,
    overall_pass: overallPass,
    feedback: {
      regenerated,
      overall_diagnosis: overallDiagnosis,
    },
    evaluator_model: EVALUATOR_MODEL,
    cache_usage: usage,
  })
  if (logErr) console.warn(`QA log insert failed: ${logErr.message}`)

  return {
    issueId: opts.issueId,
    finalPass: overallPass,
    attempts: attempt,
    scores: finalScores,
    regenerated,
    cacheUsage: usage,
    overallDiagnosis,
  }
}
