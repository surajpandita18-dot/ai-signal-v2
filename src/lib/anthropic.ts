import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    client = new Anthropic({ apiKey })
  }
  return client
}

// Models — pinned per stage. Use aliases per claude-api skill guidance.
//   Haiku 4.5 — structural task (clustering): cheap, fast, fine.
//   Opus 4.7 — Stage 3 synthesis: the product's reasoning core. Worth the cost.
//   Opus 4.7 — Deep-dive research + write: long-form reasoning at high effort.
//   Sonnet 4.6 — Deep-dive QA: hot-loop scoring + per-section regen; judging is
//     easier than writing, Sonnet's cheaper and fast enough.
export const MODEL_CLUSTER = 'claude-haiku-4-5'
export const MODEL_SYNTHESIZE = 'claude-opus-4-7'
export const MODEL_DEEP_DIVE_RESEARCH = 'claude-opus-4-7'
export const MODEL_DEEP_DIVE_DRAFT = 'claude-opus-4-7'
export const MODEL_QA_DEEP_DIVE = 'claude-sonnet-4-6'

/**
 * Extract the first text block from an Anthropic messages response.
 * Throws if no text block found.
 */
export function firstText(response: Anthropic.Messages.Message): string {
  for (const block of response.content) {
    if (block.type === 'text') return block.text
  }
  throw new Error('No text block in Anthropic response')
}

/**
 * Parse a JSON object from a model response that may wrap it in
 * ```json fences or include leading prose. Throws if no JSON parseable.
 */
export function parseJsonFromResponse<T = unknown>(text: string): T {
  // Try fenced code block first.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : text.trim()

  // Find first { or [ to handle leading prose.
  const start = candidate.search(/[{[]/)
  if (start === -1) {
    throw new Error('No JSON found in model response')
  }
  const trimmed = candidate.slice(start)

  try {
    return JSON.parse(trimmed) as T
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from model: ${err instanceof Error ? err.message : err}`
    )
  }
}
