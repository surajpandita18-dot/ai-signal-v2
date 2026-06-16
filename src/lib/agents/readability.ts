// Readability / UX — reads the rendered payload as a builder on a phone
// Monday morning. Scores scannability + flags structural reading issues.
// Does NOT evaluate argument quality.

import type { IssuePayload } from '../../../db/types/database'
import { runAgent, parseJsonObject } from './runner'

export interface ReadNote {
  section: string                                 // 'throughline_lead' | 'six_layer_diff[3]' | 'persona.translation' …
  issue: string                                   // ≤24 words — what fails the read
  fix: string                                     // ≤24 words — what to do about it
}

export interface ReadabilityResult {
  scannability_score: number                      // 1..10
  notes: ReadNote[]
  length_stats: {
    total_words: number
    longest_paragraph_words: number
    longest_bullet_words: number
  }
}

const SYSTEM = `You are reading an AI brief on a phone in bed, Monday 7:45 AM IST. Score the read experience.

You do NOT evaluate the argument. Only:
- Hierarchy: does the throughline land in the first paragraph? Is the Ship-pick visually distinct?
- Scannability: paragraphs >5 lines, bullets >60 words, walls of grey text without break
- Length: a 1500-word target — if total_words >2000 or <800, flag
- Mobile rhythm: lots of em-dashes inside one sentence, three-clause sentences, missing line breaks
- Missing publication signals: byline, dateline, read-time, Monday-action close, lime closure mark "—— That's the shift. You're caught up."
- Beat repetition — if four beats all say "Anthropic apologized → router wins" the eye glazes

Score scannability 1–10 (10 = effortless). For each flagged note: section + issue + fix, each ≤24 words. Compute length_stats from the payload text.

Return JSON:
{
  "scannability_score": <int 1-10>,
  "notes": [ { "section": "...", "issue": "...", "fix": "..." }, ... ],
  "length_stats": { "total_words": <int>, "longest_paragraph_words": <int>, "longest_bullet_words": <int> }
}

JSON only — no prose, no code fence.`

function parseReadability(text: string): ReadabilityResult {
  const parsed = parseJsonObject<ReadabilityResult>(text, [
    'scannability_score',
    'notes',
    'length_stats',
  ])
  if (!Array.isArray(parsed.notes)) throw new Error('readability notes not array')
  return parsed
}

export async function runReadability(opts: {
  issueId: string
  payload: IssuePayload
  round: number
}): Promise<ReadabilityResult> {
  const user = `# PAYLOAD\n\n${JSON.stringify(opts.payload, null, 2)}\n\n# YOUR TASK\nRead as a phone-reader Monday 7:45 AM. Score scannability + flag reading issues. Return JSON only.`
  const { output } = await runAgent({
    issueId: opts.issueId,
    agent: 'readability',
    round: opts.round,
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    user,
    maxTokens: 4096,
    effort: 'low',
    parse: parseReadability,
  })
  return output
}
