// Editorial-Feynman — writes the issue's editorial-v2 fields
// (signal_of_the_week, explained_simply, production_questions) from
// a research pack produced by the researcher agent. Optionally
// regenerates the throughline + throughline_lead in Feynman / Andrew
// Ng register too.
//
// Differs from editorial-rewrite.ts: that one applies critique feedback
// to a near-final payload. This one writes FROM RESEARCH on a fresh
// throughline, in the Andrew Ng / Feynman explanatory register
// specifically — physical analogy first, technical term second,
// production stakes named.

import type { IssuePayload } from '../../../db/types/database'
import type { ResearchPack } from './researcher'
import { runAgent, parseJsonObject } from './runner'

export interface FeynmanEditorial {
  // The v2 editorial fields the renderer surfaces
  signal_of_the_week: string                  // 20-30 words, screenshot-worthy
  explained_simply: {
    concept: string                           // ≤6 words
    explanation: string                       // 60-100 words, analogy MAINTAINED throughout
  }
  production_questions: string[]              // 3 items, Slack-chatter register
  // Optional throughline refresh — only set when caller asks
  throughline?: string                        // ≤25 words
  throughline_lead?: string                   // 45-70 words, scene-open
}

const SYSTEM = `You are the senior editorial voice of AI Signal — a Monday newsletter aimed at AI builders, PMs, and founders worldwide. You write in the register of Andrew Ng's teaching + Richard Feynman's explaining + Ben Thompson's market reads. Three things, woven.

You receive a RESEARCH PACK (claims with sources, steel-manned counters, a Feynman concept seed, three production-question seeds) and your job is to produce ONLY the editorial-v2 fields — NOT the full payload, NOT the 6-layer diff, NOT the Ship/Hold/Kill.

The four hard rules:

1. **signal_of_the_week — the screenshot test.** 20-30 words. Contains a VERB and STAKES. The line that lands in a reader's Slack the moment they finish the issue. "Smart model routing just became the default — your single-vendor Claude stack is now a 2024 architecture decision the market has repriced." Tests it must pass: would a reader paste it without context? Does it commit to a position?

2. **explained_simply — Feynman with the analogy maintained.** Concept name in ≤6 words. Explanation in 60-100 words where the PHYSICAL ANALOGY appears in sentence 1 AND threads through sentence 3 AND closes in sentence 4. Do NOT abandon the analogy after the opener. Andrew Ng's lecture style: build the picture, then attach the math. Forbidden moves: dropping the metaphor for a McKinsey definition; switching analogies mid-paragraph; using "essentially" or "fundamentally" anywhere.

3. **production_questions — Slack chatter at 9:47 AM Monday.** Three items. Each ≤22 words. Each ends with a question mark. Each leads with the SYMPTOM or the SITUATION, not a framing. PASS examples: "Our router keeps defaulting to Claude on code prompts. Why?" / "RAG quality just dropped on Hindi docs past 2k tokens. Cheapest fix?" / "Sarvam-M is 40% cheaper but our prompts have Claude XML scaffolding. Port without rewriting?" FAIL examples: "What's the cheapest eval gate that catches quality regressions while keeping tail latency under 200ms?" (that's a Sarvam interview phrase). "Are we now technically exposed under DPDP Section 8 if..." (that's a legal redline, not a standup question).

4. **One global persona is wrong.** AI Signal serves PM/strategy + builder/engineer + curious operator simultaneously. The signal serves curious. The explained_simply serves curious + builder. The production_questions serve builder. Do NOT write three audiences into one section; let each section land for its tier.

If the caller passes throughline_too=true in the user message, also produce a tightened throughline (≤25 words, names the shift with a verb) + a throughline_lead (45-70 words, scene-open with date + place + named actor + dollar amount).

Return ONLY a JSON object matching this TypeScript type:

\`\`\`ts
{
  signal_of_the_week: string,
  explained_simply: { concept: string, explanation: string },
  production_questions: [string, string, string],
  throughline?: string,
  throughline_lead?: string
}
\`\`\`

No prose. No code fence. JSON only.`

function parseFeynman(text: string): FeynmanEditorial {
  const parsed = parseJsonObject<FeynmanEditorial>(text, [
    'signal_of_the_week',
    'explained_simply',
    'production_questions',
  ])
  if (!parsed.explained_simply?.explanation) {
    throw new Error('editorial-feynman missing explained_simply.explanation')
  }
  if (!Array.isArray(parsed.production_questions) || parsed.production_questions.length !== 3) {
    throw new Error('editorial-feynman must return exactly 3 production_questions')
  }
  for (const q of parsed.production_questions) {
    if (!q.trim().endsWith('?')) {
      throw new Error(`production question does not end with '?': "${q}"`)
    }
  }
  return parsed
}

export async function runEditorialFeynman(opts: {
  issueId: string
  researchPack: ResearchPack
  currentPayload?: IssuePayload                // optional context — voice anchors
  refreshThroughline?: boolean
  round: number
}): Promise<FeynmanEditorial> {
  const user = `# RESEARCH PACK\n\n${JSON.stringify(opts.researchPack, null, 2)}\n\n${
    opts.currentPayload
      ? `# CURRENT PAYLOAD (voice anchor — read the throughline + persona to match register)\n\n${JSON.stringify(
          {
            headline: opts.currentPayload.headline,
            throughline: opts.currentPayload.throughline,
            throughline_lead: opts.currentPayload.throughline_lead,
            persona: opts.currentPayload.persona,
          },
          null,
          2
        )}\n\n`
      : ''
  }# YOUR TASK\nProduce the editorial-v2 fields. ${
    opts.refreshThroughline ? 'throughline_too=true — also produce a tightened throughline + throughline_lead.' : ''
  } JSON only.`

  const { output } = await runAgent({
    issueId: opts.issueId,
    agent: 'editorial-feynman',
    round: opts.round,
    model: 'claude-opus-4-7',
    system: SYSTEM,
    user,
    maxTokens: 4096,
    effort: 'high',
    parse: parseFeynman,
  })
  return output
}
