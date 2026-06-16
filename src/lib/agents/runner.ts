// Shared Anthropic call helper for the multi-agent editorial pipeline.
// One function — `runAgent` — handles: model dispatch, system prompt with
// ephemeral cache, adaptive thinking, structured-JSON parsing, retries,
// usage telemetry, and writes to `issue_agent_runs`.
//
// Per-agent files (analyst.ts, chief-editorial.ts, fact-checker.ts,
// readability.ts, personas.ts) wrap this with their prompt + schema.
//
// Anchors:
// - .claude/architecture-multi-agent-pipeline.md (the spec)
// - src/inngest/stages/editorial-qa.ts (existing single-call pattern)
// - skill claude-api defaults: opus-4-7 default, adaptive thinking

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '../supabase-admin'

export type AgentModel = 'claude-opus-4-7' | 'claude-sonnet-4-6'

export interface RunAgentOpts<T> {
  issueId: string
  agent: string                          // 'analyst' | 'chief' | 'persona:priya' …
  round: number                          // 0 = initial, 1+ = correction loop
  model: AgentModel
  system: string
  user: string
  maxTokens?: number
  // Effort controls how much thinking the model does. `high` is default but
  // can eat the whole max_tokens budget on simpler tasks (readability /
  // personas) leaving no room for the actual output. Use `medium` or `low`
  // for structured JSON-in/JSON-out agents where deep reasoning isn't needed.
  effort?: 'low' | 'medium' | 'high'
  // Parser turns the model's text into T. Throws on malformed output.
  parse: (text: string) => T
}

export interface RunAgentResult<T> {
  output: T
  rawText: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number | null
    cache_read_input_tokens: number | null
  }
  latencyMs: number
}

// Lazy-init — dotenv must have loaded before this runs. Cached after first
// call so we don't re-instantiate on every agent invocation.
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set when first agent ran')
  _client = new Anthropic({ apiKey })
  return _client
}

// Strip leading code-fence (```json … ```) the model sometimes adds despite
// instructions to emit raw JSON.
function stripFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

export async function runAgent<T>(
  opts: RunAgentOpts<T>
): Promise<RunAgentResult<T>> {
  const t0 = Date.now()

  const res = await getClient().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    system: [
      {
        type: 'text',
        text: opts.system,
        cache_control: { type: 'ephemeral' },
      },
    ],
    thinking: { type: 'adaptive' },
    output_config: { effort: opts.effort ?? 'medium' },
    messages: [{ role: 'user', content: opts.user }],
  })

  const latencyMs = Date.now() - t0
  const textBlock = res.content.find((c) => c.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(
      `[${opts.agent}] no text block in response: ${JSON.stringify(res.content).slice(0, 200)}`
    )
  }
  const raw = stripFence(textBlock.text)

  let parsed: T
  try {
    parsed = opts.parse(raw)
  } catch (e) {
    throw new Error(
      `[${opts.agent}] parse failed: ${e instanceof Error ? e.message : String(e)}\nRaw (first 600): ${raw.slice(0, 600)}`
    )
  }

  const usage = {
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    cache_creation_input_tokens: res.usage.cache_creation_input_tokens ?? null,
    cache_read_input_tokens: res.usage.cache_read_input_tokens ?? null,
  }

  // Persist forensics — every agent run lands in issue_agent_runs so a
  // mid-pipeline crash leaves a debuggable trail.
  try {
    const s = createAdminSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (s.from('issue_agent_runs' as any) as any).insert({
      issue_id: opts.issueId,
      agent: opts.agent,
      round: opts.round,
      output: parsed,
      model: opts.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_tokens: usage.cache_read_input_tokens ?? null,
      latency_ms: latencyMs,
    })
  } catch (e) {
    // Don't kill the run if the audit insert fails — log and continue.
    console.warn(
      `[${opts.agent}] issue_agent_runs insert failed: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  return { output: parsed, rawText: raw, usage, latencyMs }
}

// Helper: parse JSON with a sanity-check guard. Most agents return an object
// with specific keys; use this to assert presence after JSON.parse.
export function parseJsonObject<T>(text: string, assertKeys: (keyof T)[]): T {
  const parsed = JSON.parse(text) as T
  for (const k of assertKeys) {
    if (!(k in (parsed as object))) {
      throw new Error(`missing required key "${String(k)}" in agent output`)
    }
  }
  return parsed
}
