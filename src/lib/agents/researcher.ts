// Researcher — given a shift candidate (throughline-ish topic) + the
// week's clusters, produce a deep research pack: 5-8 concrete claims
// with named actors, dollar amounts, dates, and source URLs; named
// counterarguments; the one Feynman-explainable concept; 3 real
// production questions builders would actually ask on standup.
//
// This is the upstream stage of the editorial-Feynman agent in the v3
// pipeline (analyst → researcher → editorial-Feynman → critics). Until
// the full pipeline lands, researcher can be invoked standalone via the
// CLI on any drafted issue to back-fill the v2 fields (signal /
// explained_simply / production_questions) from real cluster evidence.
//
// Model: Sonnet 4.6 (cheap, structured output). Effort = medium.

import { runAgent, parseJsonObject } from './runner'

export interface ResearchClaim {
  claim: string                                     // ≤30 words, names actor + number + date
  proof_clause: string                              // ≤24 words — the proof a reader can check
  source_url: string                                // canonical URL
  cluster_ids: string[]                             // back-references to clusters that support
}

export interface ResearchCounter {
  position: string                                  // the steel-manned counter-take
  proof: string                                     // the strongest argument FOR the counter
  weakness: string                                  // why the main thesis still wins
}

export interface ResearchPack {
  claims: ResearchClaim[]                           // 5-8 items
  counters: ResearchCounter[]                       // 1-3 items
  feynman_concept: {
    concept: string                                 // ≤6 words
    physical_analogy: string                        // 40-70 words — like Andrew Ng / Feynman
    production_stake: string                        // 24-40 words — what it means for the reader
  }
  production_questions: string[]                    // 3 items, Slack-chatter register
}

const SYSTEM = `You are the head researcher for AI Signal — a Monday newsletter about a single AI shift each week.

Given a candidate throughline + the week's clusters with sample raw items, your job is to produce a DEEP research pack the editorial agent will write from. You do NOT write the article. You provide the materials.

Discipline:

1. **Claims must be checkable.** Each claim names an actor + a number + a date + a source URL. "OpenAI cut prices" fails; "OpenAI told The Information on Nov 11 it's preparing 70%+ API price cuts ahead of 2026 IPO" passes.

2. **Steel-man the counter.** Find 1-3 strong counter-positions and state them at their strongest, then name the weakness.

3. **The Feynman concept must be a concept, not a definition.** The physical analogy is the load-bearing sentence. If you'd write "Speculative decoding is when the model... uses a smaller model to..." STOP. Try: "Imagine asking a junior to draft a paragraph while you sip coffee — if you only correct what's wrong you write 4× faster than typing yourself." THAT's Feynman. The analogy goes BEFORE the technical term.

4. **Production questions must read like Slack chatter at 9:47 AM Monday, not interview prep.** "Our router keeps defaulting to Claude on code prompts. Why?" passes. "How do we detect intent reliably without adding a classifier round-trip?" FAILS — that's a Sarvam interview phrasing, not someone messaging their team. Each question ≤22 words, ends with a question mark, leads with the symptom or the situation.

Return JSON:
{
  "claims": [
    { "claim": "...", "proof_clause": "...", "source_url": "https://...", "cluster_ids": ["uuid"] }
  ],
  "counters": [
    { "position": "...", "proof": "...", "weakness": "..." }
  ],
  "feynman_concept": {
    "concept": "≤6 words — the technical name",
    "physical_analogy": "40-70 words — analogy first, then the technical term, in Andrew Ng / Feynman register. No jargon walls.",
    "production_stake": "24-40 words — what this means for the reader's Monday."
  },
  "production_questions": [
    "≤22 words, Slack-chatter register, ends with question mark",
    "...",
    "..."
  ]
}

JSON only — no prose, no code fence.`

function parseResearchPack(text: string): ResearchPack {
  const parsed = parseJsonObject<ResearchPack>(text, [
    'claims',
    'counters',
    'feynman_concept',
    'production_questions',
  ])
  if (!Array.isArray(parsed.claims) || parsed.claims.length < 3) {
    throw new Error(`researcher returned ${parsed.claims?.length} claims; need ≥3`)
  }
  if (!parsed.feynman_concept?.physical_analogy) {
    throw new Error('researcher missing feynman_concept.physical_analogy')
  }
  if (!Array.isArray(parsed.production_questions) || parsed.production_questions.length !== 3) {
    throw new Error('researcher must return exactly 3 production_questions')
  }
  return parsed
}

export async function runResearcher(opts: {
  issueId: string
  throughlineCandidate: string                       // the analyst's chosen shift (or seed from prior issue)
  clusterSummary: Array<{
    id: string
    label: string
    convergence: number
    sample_items: Array<{ title: string; url: string; excerpt: string }>
  }>
  round: number
}): Promise<ResearchPack> {
  const user = `# THROUGHLINE CANDIDATE\n\n${opts.throughlineCandidate}\n\n# CLUSTERS WITH SAMPLE ITEMS\n\n${JSON.stringify(opts.clusterSummary, null, 2)}\n\n# YOUR TASK\nProduce the research pack. JSON only.`
  const { output } = await runAgent({
    issueId: opts.issueId,
    agent: 'researcher',
    round: opts.round,
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    user,
    maxTokens: 6144,
    effort: 'medium',
    parse: parseResearchPack,
  })
  return output
}
