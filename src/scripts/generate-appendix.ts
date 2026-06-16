// Generate the issue appendix (interview drills + further reading) from
// the issue's payload via Claude. Replaces the hand-curated seed-appendix
// step for new issues — synthesizer Round 2 will inline this into the
// pipeline; until then, run after auto-pick-shk on any drafted issue.
//
// Usage:
//   npx tsx src/scripts/generate-appendix.ts <issueId>
//
// Anchors:
// - Schema: db/types/database.ts → AppendixPack (interview_drills,
//   further_reading)
// - Design intent: .claude/learnings-user-audit.md → "Topic-aware
//   interview drills" + "Resources / further reading"
// - Model default per .claude rules: claude-opus-4-7 with adaptive
//   thinking. Effort=high is the sweet spot for structured editorial.

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import type {
  AppendixPack,
  DeepDivePayload,
  IssuePayload,
} from '../../db/types/database'

const MODEL = 'claude-opus-4-7'

const SYSTEM = `You are the editor of "AI Signal" — a weekly Monday-morning AI brief written from Bangalore for builders, PMs, and founders worldwide. The audience is global + Indian; the India lens (INR math, RBI/DPDP/NPCI, Indic models) is the moat — keep it as the unique edge but do NOT erase it to feel "global". The Stratechery-from-Taiwan pattern.

You produce the per-issue **appendix** that lives at the foot of the web page:

1. **interview_drills**: exactly 3 questions, each a genuine interview-prep tool generated from THIS issue's content (no generic templates). One per kind:
   - "system-design" — a real architecture question a senior AI engineer would face, grounded in the issue's technical beat.
   - "product-strategy" — a PM/founder question about positioning, GTM, or strategy, grounded in the persona or enterprise-deals beat.
   - "regulation-india" — a question about how to ship under RBI / DPDP / NPCI / SEBI given this week's regulatory state. ALWAYS keep this slot India-specific even for a global reader — that's the moat.
   Each question:
   - ≤ 45 words
   - "asked_at": 3–5 SHORT labels naming where this question gets asked (e.g., "Sarvam Sr. AI Eng", "Anthropic India Solutions", "OpenAI Bangalore PM", "Razorpay platform", "Pine Labs", "GCC AI lead", "Founder pitch (Series-B Indian fund)", "NPCI compliance review", "RBI working group"). Mix Indian + global surfaces where natural.
   - "answer_skeleton": 2–3 sentences naming what a strong answer actually touches — concrete structure, not vague pointers. Should be useful enough that a candidate would screenshot it.

2. **further_reading**: curated outbound links the reader leaves with.
   - "articles": 3 items, one per major beat in the issue (title, source, url, why ≤14 words)
   - "video": 0–1 podcast/talk/clip (Latent Space, Lenny's, Cognition pod, etc.)
   - "paper": 0–1 arxiv / RFC / canonical paper grounding a claim in the issue
   - "indian_builder": 0–1 — the DIFFERENTIATOR slot. A Bangalore/Indian engineer shipping the exact pattern this issue argues for (tweet thread, blog, YouTube clip, podcast). This is what no other newsletter does.

Use real, plausible URLs (canonical homepages or known paths — e.g., "https://newsletter.pragmaticengineer.com/", "https://arxiv.org/abs/...", "https://www.latent.space/", "https://docs.portkey.ai/", "https://twitter.com/<handle>"). Do not fabricate specific article slugs; canonical site URLs are fine.

Output ONLY a JSON object matching this exact TypeScript type:

\`\`\`ts
{
  interview_drills: Array<{
    kind: 'system-design' | 'product-strategy' | 'regulation-india'
    question: string
    asked_at: string[]
    answer_skeleton: string
  }>
  further_reading: {
    articles: Array<{ title: string; source: string; url: string; why: string }>
    video?: { title: string; source: string; url: string; why: string }
    paper?: { title: string; source: string; url: string; why: string }
    indian_builder?: { title: string; source: string; url: string; why: string }
  }
}
\`\`\`

No prose around the JSON. No code fences. Just the JSON object.`

async function generate(payload: IssuePayload | DeepDivePayload, isDeepDive: boolean): Promise<AppendixPack> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const userMsg = `# ISSUE PAYLOAD\n\n${JSON.stringify(payload, null, 2)}\n\n# YOUR TASK\nGenerate the appendix for this ${
    isDeepDive ? 'deep-dive' : 'weekly brief'
  }. Produce the JSON object only.`

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
    ],
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    messages: [{ role: 'user', content: userMsg }],
  })

  // Find the first text block in the response — Opus 4.7 may emit thinking
  // blocks first.
  const textBlock = res.content.find((c) => c.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`Claude returned no text block: ${JSON.stringify(res.content)}`)
  }
  const raw = textBlock.text.trim()

  // Strip code-fence if present despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: AppendixPack
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(
      `Claude returned non-JSON: ${e instanceof Error ? e.message : String(e)}\nRaw: ${raw.slice(0, 500)}`
    )
  }

  // Sanity checks
  if (!Array.isArray(parsed.interview_drills) || parsed.interview_drills.length !== 3) {
    throw new Error(`Expected 3 interview_drills, got ${parsed.interview_drills?.length}`)
  }
  const kinds = parsed.interview_drills.map((d) => d.kind).sort()
  const expected = ['product-strategy', 'regulation-india', 'system-design']
  if (JSON.stringify(kinds) !== JSON.stringify(expected)) {
    throw new Error(`Expected drill kinds [${expected.join(', ')}], got [${kinds.join(', ')}]`)
  }
  if (!parsed.further_reading || !Array.isArray(parsed.further_reading.articles)) {
    throw new Error('further_reading.articles missing or not an array')
  }
  return parsed
}

async function main() {
  const issueId = process.argv[2]
  if (!issueId) {
    console.error('Usage: npx tsx src/scripts/generate-appendix.ts <issueId>')
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set')
    process.exit(1)
  }

  const s = createAdminSupabaseClient()
  const { data: issue, error } = await s
    .from('issues')
    .select('id, issue_type, payload')
    .eq('id', issueId)
    .single()
  if (error || !issue) {
    console.error('Issue not found:', error?.message)
    process.exit(1)
  }
  if (!issue.payload) {
    console.error('Issue has no payload — synthesize first')
    process.exit(1)
  }

  const isDeepDive = issue.issue_type === 'deep_dive'
  const payload = issue.payload as unknown as IssuePayload | DeepDivePayload
  console.log(`Generating appendix for ${issueId} (${issue.issue_type})...`)
  const appendix = await generate(payload, isDeepDive)
  console.log(`✓ Got ${appendix.interview_drills.length} drills + ${appendix.further_reading.articles.length} articles`)

  const newPayload = { ...(payload as object), appendix } as
    | IssuePayload
    | DeepDivePayload
  const upd = await s
    .from('issues')
    .update({ payload: newPayload })
    .eq('id', issueId)
  if (upd.error) {
    console.error('Update failed:', upd.error.message)
    process.exit(1)
  }
  console.log(`✓ Appendix written to issue ${issueId}`)
  console.log()
  console.log('Drills:')
  for (const d of appendix.interview_drills) {
    console.log(`  [${d.kind}] ${d.question.slice(0, 80)}...`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
