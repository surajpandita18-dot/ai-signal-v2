// Persona panel — 5 simulated target readers. Each reads the payload as
// themselves and answers: would I forward this to one peer? What was
// confusing? What was strongest? What's missing?
//
// Forward rate (≥3 of 5 = pass) gates the correction loop. Qualitative
// notes are advisory — pruned after 4 weeks if a persona never moves
// a needle (per .claude/architecture-multi-agent-pipeline.md → Risks).

import type { IssuePayload } from '../../../db/types/database'
import { runAgent, parseJsonObject } from './runner'

export type PersonaId =
  | 'priya'
  | 'marcus'
  | 'anil'
  | 'megha'
  | 'ravi'

interface PersonaDef {
  id: PersonaId
  name: string
  who: string                  // ≤60 words — identity + what they care about + dealbreaker
}

export const PERSONA_PANEL: PersonaDef[] = [
  {
    id: 'priya',
    name: 'Priya',
    who: 'AI-native Indian founder. Series-B Bangalore, Krutrim/Sarvam tier. Cares: capital efficiency, defensibility against frontier-API drift, INR math. Knows DPDP cold. Will NOT forward filler or anything that reads Bay-Area-coded. Dealbreaker: hedging.',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    who: 'Bay Area PM at a Stripe/Anthropic-adjacent startup. Cares: the India-specific edge he cannot get from Stratechery or Latent Space — regulation ahead of US/EU, INR cost reality, Indic-model evals. Intolerant of hedging or thin claims. Dealbreaker: India angle erased.',
  },
  {
    id: 'anil',
    name: 'Anil',
    who: 'GCC AI lead at Bangalore Wells Fargo / JPMC. Cares: procurement risk, RBI/DPDP exposure on agent payments, talent retention. Forwards if it makes his Q-review deck stronger. Dealbreaker: opinion without an evidence chain.',
  },
  {
    id: 'megha',
    name: 'Megha',
    who: 'Interview-prepping ML engineer, 4 YOE, prepping for Anthropic India / Sarvam / OpenAI Bangalore. Cares: the appendix interview drills + framework names she can drop in an interview. Ignores everything else. Dealbreaker: appendix is generic.',
  },
  {
    id: 'ravi',
    name: 'Ravi',
    who: 'Enterprise procurement lead at Bajaj Finance scale. Reads the INR math FIRST; everything else is supporting evidence. Cares: contract risk, vendor lock-in cost, exit clauses. Dealbreaker: math without interpretation.',
  },
]

export interface PersonaVerdict {
  persona_id: PersonaId
  would_forward: boolean
  strongest_line: string                  // verbatim quote from payload
  confusing_line: string                  // verbatim quote OR '' if none
  missing_thing: string                   // ≤24 words — what they wanted that wasn't there
}

export interface PersonaPanelResult {
  panel: PersonaVerdict[]
  forward_rate: number                    // 0..1
}

function buildSystem(p: PersonaDef): string {
  return `You ARE ${p.name}. ${p.who}

You receive an AI weekly brief draft. Read it as YOU — not as a critic. Decide:
1. Would I forward this to one peer this morning? (true / false)
2. What was the strongest line? (verbatim quote ≤20 words from the payload)
3. What was confusing (if anything)? (verbatim quote OR "")
4. What did I want that wasn't there? (≤24 words)

Return JSON:
{
  "persona_id": "${p.id}",
  "would_forward": <bool>,
  "strongest_line": "<verbatim quote>",
  "confusing_line": "<verbatim or '' >",
  "missing_thing": "<≤24 words>"
}

JSON only — no prose, no code fence. Don't soften your opinion — you don't have to forward an issue that didn't land for you.`
}

function parseVerdict(text: string): PersonaVerdict {
  return parseJsonObject<PersonaVerdict>(text, [
    'persona_id',
    'would_forward',
    'strongest_line',
    'missing_thing',
  ])
}

export async function runPersonaPanel(opts: {
  issueId: string
  payload: IssuePayload
  round: number
}): Promise<PersonaPanelResult> {
  // Five Sonnet calls in parallel — total dominated by latency not tokens.
  const panel = await Promise.all(
    PERSONA_PANEL.map(async (p) => {
      const { output } = await runAgent({
        issueId: opts.issueId,
        agent: `persona:${p.id}`,
        round: opts.round,
        model: 'claude-sonnet-4-6',
        system: buildSystem(p),
        user: `# PAYLOAD\n\n${JSON.stringify(opts.payload, null, 2)}\n\n# YOUR TASK\nRead as ${p.name}. Return your verdict JSON only.`,
        maxTokens: 2048,
        effort: 'low',
        parse: parseVerdict,
      })
      return output
    })
  )

  const fwd = panel.filter((v) => v.would_forward).length
  return { panel, forward_rate: fwd / panel.length }
}
