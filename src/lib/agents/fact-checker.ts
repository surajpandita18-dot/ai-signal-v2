// Fact-Checker — verifies truth-claims in the payload against the cluster
// evidence we already have in DB. Does NOT judge prose, only facts/citations.

import type { IssuePayload } from '../../../db/types/database'
import { runAgent, parseJsonObject } from './runner'

export interface FactFlag {
  claim: string                                       // exact quote from payload
  section: string                                     // 'six_layer_diff[2]' | 'throughline' | …
  status: 'unsupported' | 'contradicted' | 'thin'
  cluster_ids: string[]                               // cluster ids that touch the claim (may be empty)
  suggested_action: 'cite' | 'soften' | 'drop'
}

export interface FactCheckResult {
  flags: FactFlag[]
  citation_gaps: string[]                             // claims that should have a source linked but don't
  contradicted_count: number
}

const SYSTEM = `You are the fact-checker for AI Signal. You verify every truth-claim in a weekly AI brief against the cluster + raw-item evidence the system collected this week.

A claim is SUPPORTED only if at least one cluster's sample items state the same fact (named dollar amount, named actor, named date, named action).

Cap the output at 10 flags maximum. Prioritise the most load-bearing claims (throughline + Ship/Hold/Kill labels + INR math numbers + named regulators). Don't flag every minor adjective.

Flag categories:
- "unsupported" — no cluster evidence touches the claim
- "contradicted" — a cluster's sample items state the OPPOSITE
- "thin" — only one source covers a load-bearing claim (named number, named company action, named regulator move)

For each flag include:
- claim: the exact quote (≤30 words)
- section: where in the payload it appears (throughline, six_layer_diff[N], persona.translation, persona.inr_math, shk.<kind>, keep_skip.<kind>[N])
- status: one of the three
- cluster_ids: array of cluster ids that touch the claim (may be empty)
- suggested_action: "cite" | "soften" | "drop"

You do NOT judge prose. You do NOT assess voice. Only facts + citations.

Return JSON:
{
  "flags": [ ... ],
  "citation_gaps": [ "<claim that needs a source link added>", ... ],
  "contradicted_count": <number of flags with status="contradicted">
}

If everything checks out, return empty arrays. JSON only.`

function parseFactCheck(text: string): FactCheckResult {
  const parsed = parseJsonObject<FactCheckResult>(text, [
    'flags',
    'citation_gaps',
    'contradicted_count',
  ])
  if (!Array.isArray(parsed.flags)) throw new Error('factcheck flags not array')
  return parsed
}

export async function runFactCheck(opts: {
  issueId: string
  payload: IssuePayload
  clusterEvidence: Array<{
    id: string
    label: string
    sample_items: Array<{ title: string; url: string; excerpt: string }>
  }>
  round: number
}): Promise<FactCheckResult> {
  const user = `# CLUSTER EVIDENCE\n\n${JSON.stringify(opts.clusterEvidence, null, 2)}\n\n# ISSUE PAYLOAD\n\n${JSON.stringify(opts.payload, null, 2)}\n\n# YOUR TASK\nFlag every unsupported / contradicted / thin claim. Return JSON only.`
  const { output } = await runAgent({
    issueId: opts.issueId,
    agent: 'fact-checker',
    round: opts.round,
    model: 'claude-sonnet-4-6',
    system: SYSTEM,
    user,
    maxTokens: 6144,
    effort: 'low',
    parse: parseFactCheck,
  })
  return output
}
