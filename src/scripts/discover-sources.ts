// Source Discovery — Stage 0.5.
//
// Scans recent raw_items (last N days) and asks Claude Opus 4.7 for new sources
// to add. Writes a markdown proposal file the human reviews + approves manually.
//
// Why a script (not Inngest): per CLAUDE.md, sourcing IS the product. The human
// reviews every new source before it lands in src/config/sources.ts. We will
// schedule this as a cron LATER once the rubric is proven.
//
// Usage:
//   npx tsx src/scripts/discover-sources.ts [--days N]
//
// Outputs:
//   docs/SOURCE_PROPOSALS_<YYYY-MM-DD>.md  — markdown table for human review
//
// Requires .env.local with:
//   ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { getAnthropic, MODEL_SYNTHESIZE, firstText, parseJsonFromResponse } from '../lib/anthropic'
import { SOURCES } from '../config/sources'
import type { Beat, RawItem } from '../../db/types/database'

loadDotenv({ path: '.env.local', override: true })

const REQUIRED_ENV = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const DEFAULT_DAYS = 30
const MAX_ITEMS = 500
const MIN_ITEMS = 50
const URL_VERIFY_TIMEOUT_MS = 7_000
const URL_VERIFY_CONCURRENCY = 6

const BEATS: ReadonlyArray<Beat> = [
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals',
]

const BEAT_DESCRIPTIONS: Record<Beat, string> = {
  'frontier-api': 'global model API moves — OpenAI/Anthropic/Google/DeepSeek pricing + capability',
  'india-infra': 'Indian cloud / GPU / IndiaAI Mission — Yotta, E2E, Jarvislabs, Krutrim Cloud',
  'regulation': 'MeitY / PIB / RBI / SEBI / IRDAI / CDSCO / DPDP gazette + advisories',
  'indic-models': 'Sarvam / AI4Bharat / BharatGen / Gnani / Two AI / Krutrim tech',
  'talent-comp': 'funding tracker + hiring trends + comp benchmarks; Indian-grounded',
  'enterprise-deals': 'vendor newsrooms + Indian enterprise AI buyer stories (banks/GCC/SI)',
}

interface Proposal {
  name: string
  rationale: string
  candidate_urls: string[]
  tier: 'A' | 'B' | 'C'
  weight: number
  beat: Beat
  evidence: string
}

interface ProposalsResponse {
  proposals: Proposal[]
}

interface VerifiedProposal extends Proposal {
  verifications: Array<{ url: string; status: number | null; ok: boolean; note: string }>
}

function parseArgs(argv: string[]): { days: number } {
  let days = DEFAULT_DAYS
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days') {
      const next = argv[i + 1]
      const n = Number(next)
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`--days must be a positive integer, got: ${next}`)
        process.exit(1)
      }
      days = Math.floor(n)
      i++
    }
  }
  return { days }
}

function checkEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    console.error('Copy .env.local.example to .env.local and fill them in.')
    process.exit(1)
  }
}

async function loadRecentRawItems(days: number): Promise<RawItem[]> {
  const supabase = createAdminSupabaseClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('raw_items')
    .select('*')
    .gte('fetched_at', since)
    .order('fetched_at', { ascending: false })
    .limit(MAX_ITEMS)
  if (error) throw new Error(`load raw_items: ${error.message}`)
  return data ?? []
}

function compactCorpus(items: RawItem[]): string {
  return items
    .map((it) => {
      const excerpt = it.excerpt ? ` — ${it.excerpt.slice(0, 150).replace(/\s+/g, ' ').trim()}` : ''
      return `[${it.source} beat=${it.beat}] ${it.title}${excerpt}`
    })
    .join('\n')
}

function existingSourcesByBeat(): string {
  const groups = new Map<Beat, string[]>()
  for (const b of BEATS) groups.set(b, [])
  for (const s of SOURCES) groups.get(s.beat)?.push(`${s.name} (${s.tier}/${s.weight})`)
  return BEATS.map((b) => {
    const names = groups.get(b) ?? []
    return `## ${b}\n${names.length ? names.map((n) => `- ${n}`).join('\n') : '- (none)'}`
  }).join('\n\n')
}

function buildSystemPrompt(): string {
  const beatLines = BEATS.map((b) => `- \`${b}\` — ${BEAT_DESCRIPTIONS[b]}`).join('\n')
  const existing = existingSourcesByBeat()
  return `You are the Source Discovery agent for "The India AI Builder's Brief" — a weekly Monday synthesis for Indian AI builders, PMs, founders.

# THE 6 LOCKED BEATS

${beatLines}

# TIER + WEIGHT RUBRIC

- **Tier A (weight 4-5)** — primary publisher (model card, court ruling, RBI circular) OR a named individual journalist/analyst with a sustained track record on the beat. First-party regulators and frontier labs sit at A/5. High-signal individuals sit at A/4.
- **Tier B (weight 2-3)** — reputable journalism with India-context awareness, OR a specialist newsletter with proven signal. Mainstream tech press (TechCrunch, VentureBeat) sit at B/2.
- **Tier C (weight 1-2)** — volume/breadth, useful only for convergence signal (HN, arXiv listings, broad aggregators).

# HARD CONSTRAINTS

1. **Free RSS or public Atom only.** No paid subscriptions, no logged-in API tiers, no scraping. The feed must be retrievable with a public curl/GET.
2. **Must map cleanly to ONE of the 6 beats.** "Covers AI" is not a beat. If a source straddles, pick the dominant one.
3. **Must verifiably resolve.** Do not fabricate URLs. If you are unsure of the exact RSS path, set \`candidate_urls: []\` and explain in the rationale that the URL needs human verification.
4. **Indian audience moat.** Prefer sources that add India-context the existing list misses (DPDP litigation, Indic models, INR-grounded VC analysis, Indian enterprise procurement). Adding another generic US tech blog is bloat.
5. **No duplicates.** Do not propose anything already in the existing list below.
6. **Prioritize thin beats.** Look at the existing list — propose more for the beats with the fewest sources / weakest A-tier.

# EXISTING SOURCES (names only, grouped by beat)

${existing}

# OUTPUT SCHEMA

Return STRICT JSON, no markdown fences:

\`\`\`
{
  "proposals": [
    {
      "name": "string — display name",
      "rationale": "string — 1-2 sentences why this source belongs and what beat-specific signal it adds",
      "candidate_urls": ["string — likely RSS/Atom URL, or [] if uncertain"],
      "tier": "A" | "B" | "C",
      "weight": 1 | 2 | 3 | 4 | 5,
      "beat": "frontier-api" | "india-infra" | "regulation" | "indic-models" | "talent-comp" | "enterprise-deals",
      "evidence": "string — what about the recent corpus suggests this source would add signal (e.g. 'cited 4 times in the past month by ET-Tech and Livemint as authoritative on DPDP')"
    }
  ]
}
\`\`\`

# RULES

- Return 5-10 proposals total.
- Prioritize beats with thin coverage (regulation, indic-models, india-infra).
- Do NOT fabricate URLs. If the exact RSS path is unknown, return \`candidate_urls: []\` and flag in rationale that the URL needs verification.
- Tie every proposal to evidence from the corpus where possible. Generic "this source is famous" is weaker than "the corpus shows X cited by ET Tech twice".
- JSON only. No prose outside the JSON.`
}

function buildUserPrompt(corpus: string, itemCount: number, days: number): string {
  return `# RECENT CORPUS

Last ${days} days, ${itemCount} items (most-recent first). Format: [source beat=X] title — excerpt(150 chars).

${corpus}

# YOUR TASK

Propose 5-10 new sources per the schema. Prioritize beats with thin coverage. Don't propose anything already in the existing list. Don't fabricate URLs — leave \`candidate_urls: []\` if unsure.`
}

async function verifyUrl(url: string): Promise<{ url: string; status: number | null; ok: boolean; note: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), URL_VERIFY_TIMEOUT_MS)
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'ai-signal-source-discovery/1.0 (+https://ai-signal-v2.vercel.app)' },
    })
    // Some servers refuse HEAD — fall back to GET.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'ai-signal-source-discovery/1.0 (+https://ai-signal-v2.vercel.app)' },
      })
    }
    return {
      url,
      status: res.status,
      ok: res.ok,
      note: res.ok ? 'OK' : `HTTP ${res.status}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { url, status: null, ok: false, note: `fetch error: ${msg.slice(0, 80)}` }
  } finally {
    clearTimeout(timer)
  }
}

async function verifyAll(proposals: Proposal[]): Promise<VerifiedProposal[]> {
  // Flatten URLs with back-pointers so we can run a small concurrency pool.
  const tasks: Array<{ pIdx: number; url: string }> = []
  proposals.forEach((p, pIdx) => {
    for (const url of p.candidate_urls) tasks.push({ pIdx, url })
  })
  const results = new Map<number, Array<{ url: string; status: number | null; ok: boolean; note: string }>>()
  proposals.forEach((_, i) => results.set(i, []))

  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const my = cursor++
      const t = tasks[my]
      if (!t) return
      const r = await verifyUrl(t.url)
      results.get(t.pIdx)!.push(r)
    }
  }
  await Promise.all(Array.from({ length: URL_VERIFY_CONCURRENCY }, () => worker()))

  return proposals.map((p, i) => ({ ...p, verifications: results.get(i) ?? [] }))
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

function renderMarkdown(args: {
  proposals: VerifiedProposal[]
  itemCount: number
  days: number
  date: string
  existingCount: number
}): string {
  const { proposals, itemCount, days, date, existingCount } = args
  const totalUrlsChecked = proposals.reduce((a, p) => a + p.verifications.length, 0)
  const okUrls = proposals.reduce((a, p) => a + p.verifications.filter((v) => v.ok).length, 0)

  const tableRows = proposals
    .map((p) => {
      const urls = p.candidate_urls.length
        ? p.candidate_urls.map((u) => `\`${u}\``).join('<br/>')
        : '_(none — needs human research)_'
      const curl = p.verifications.length
        ? p.verifications
            .map((v) => `${v.ok ? 'OK' : 'FAIL'} ${v.status ?? '-'} (${escapePipes(v.note)})`)
            .join('<br/>')
        : '_(no URL to check)_'
      return `| ${escapePipes(p.name)} | ${escapePipes(p.rationale)} | ${urls} | ${curl} | ${p.tier} | ${p.weight} | \`${p.beat}\` | ${escapePipes(p.evidence)} |`
    })
    .join('\n')

  return `# Source Proposals — ${date}

> Generated ${date}. Reviewed: **No**. Approved: **none yet**.
>
> Scanned ${itemCount} \`raw_items\` from the last ${days} days against ${existingCount} existing sources.
> ${proposals.length} proposals returned. ${okUrls}/${totalUrlsChecked} candidate URLs verified (HTTP 2xx).

## Proposals

| name | rationale | candidate url(s) | curl_result | tier | weight | beat | evidence |
|---|---|---|---|---|---|---|---|
${tableRows || '| _(no proposals)_ | | | | | | | |'}

## How to use this file

- **To accept a proposal:** copy a row's name + URL into \`src/config/sources.ts\` following the existing pattern (\`{ id, name, tier, weight, beat, feedUrl, windowHours, kind: 'rss' }\`). Then run \`pnpm smoke:source\` to confirm the feed pulls. Add a one-line comment with the date you approved it.
- **To reject a proposal:** leave the row alone (or delete the file once you've reviewed). The agent does not learn from rejection here — re-running may re-propose. If a name keeps appearing and you keep rejecting, add it to a denylist comment in \`sources.ts\`.
- **If \`curl_result\` is FAIL or no URLs were returned:** the agent flagged the proposal as needing human URL research. Open the source's site and look for an RSS / Atom link in the page \`<head>\`, or check \`/{feed,rss,atom}\` paths.
- **Cadence:** re-run \`npx tsx src/scripts/discover-sources.ts\` weekly (or after a major sourcing event). The corpus rotates fast — new high-signal voices show up cited in ET Tech / Livemint before they show up in any "best AI newsletters" list.

_— end of file —_
`
}

async function callClaude(corpus: string, itemCount: number, days: number): Promise<{
  proposals: Proposal[]
  usage: { inputTokens: number; outputTokens: number; cacheCreate: number; cacheRead: number }
}> {
  const anthropic = getAnthropic()
  const system = buildSystemPrompt()
  const user = buildUserPrompt(corpus, itemCount, days)

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: MODEL_SYNTHESIZE,
      max_tokens: 8_000,
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: user }],
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new Error(`discover rate-limited: ${err.message}`)
    if (err instanceof Anthropic.BadRequestError) throw new Error(`discover 400: ${err.message}`)
    if (err instanceof Anthropic.APIError) throw new Error(`discover API error ${err.status}: ${err.message}`)
    throw err
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('discover hit max_tokens — output truncated')
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('discover refused — review prompt')
  }

  const text = firstText(response)
  const parsed = parseJsonFromResponse<ProposalsResponse>(text)
  const proposals = sanitizeProposals(parsed.proposals ?? [])

  return {
    proposals,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreate: response.usage.cache_creation_input_tokens ?? 0,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
    },
  }
}

function sanitizeProposals(raw: Proposal[]): Proposal[] {
  const existingNames = new Set(SOURCES.map((s) => s.name.toLowerCase()))
  const validBeats = new Set<Beat>(BEATS)
  const out: Proposal[] = []
  for (const p of raw) {
    if (!p || typeof p.name !== 'string') continue
    if (existingNames.has(p.name.toLowerCase())) continue
    if (!validBeats.has(p.beat)) continue
    if (!['A', 'B', 'C'].includes(p.tier)) continue
    const weight = Number(p.weight)
    if (!Number.isFinite(weight) || weight < 1 || weight > 5) continue
    const urls = Array.isArray(p.candidate_urls)
      ? p.candidate_urls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
      : []
    out.push({
      name: p.name.trim(),
      rationale: String(p.rationale ?? '').trim(),
      candidate_urls: urls,
      tier: p.tier,
      weight: Math.round(weight),
      beat: p.beat,
      evidence: String(p.evidence ?? '').trim(),
    })
  }
  return out
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  checkEnv()
  const { days } = parseArgs(process.argv.slice(2))

  console.log(`Source Discovery — scanning last ${days} days...`)
  const items = await loadRecentRawItems(days)
  console.log(`  loaded ${items.length} raw_items`)

  if (items.length < MIN_ITEMS) {
    console.error(`\nFewer than ${MIN_ITEMS} raw_items in the last ${days} days (got ${items.length}).`)
    console.error('Run a few Stage-1 sourcing passes first, or pass --days with a larger window.')
    process.exit(1)
  }

  const corpus = compactCorpus(items)
  console.log(`  corpus = ${corpus.length} chars, calling Claude (${MODEL_SYNTHESIZE})...`)

  const { proposals, usage } = await callClaude(corpus, items.length, days)
  console.log(
    `  got ${proposals.length} proposals (in=${usage.inputTokens} out=${usage.outputTokens} cache_create=${usage.cacheCreate} cache_read=${usage.cacheRead})`,
  )

  console.log('  verifying candidate URLs...')
  const verified = await verifyAll(proposals)
  const okCount = verified.reduce((a, p) => a + p.verifications.filter((v) => v.ok).length, 0)
  const totalUrls = verified.reduce((a, p) => a + p.verifications.length, 0)

  const date = todayIso()
  const md = renderMarkdown({
    proposals: verified,
    itemCount: items.length,
    days,
    date,
    existingCount: SOURCES.length,
  })

  const outPath = `docs/SOURCE_PROPOSALS_${date}.md`
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, md, 'utf8')

  // Top-3 pick by (tier rank, weight) — Tier A first, then weight desc.
  const tierRank: Record<'A' | 'B' | 'C', number> = { A: 0, B: 1, C: 2 }
  const top = [...verified]
    .sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || b.weight - a.weight)
    .slice(0, 3)

  console.log('\n--- Summary ---')
  console.log(`Wrote: ${outPath}`)
  console.log(`Proposals: ${verified.length}   URLs verified: ${okCount}/${totalUrls}`)
  console.log('Top 3 picks (tier+weight):')
  for (const p of top) {
    console.log(`  - [${p.tier}/${p.weight}] ${p.name} (${p.beat})`)
  }
  console.log('\nReview the file and copy approved rows into src/config/sources.ts.')
}

main().catch((err) => {
  console.error('\nFATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
