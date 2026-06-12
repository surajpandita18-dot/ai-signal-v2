// Stage — Deep-Dive Research
//
// Reads a chosen deep_dive_candidate, WebFetches its evidence_anchor_urls,
// pulls related raw_items by keyword ILIKE, then calls Opus 4.7 to produce
// a structured research_pack: { evidence_triples, counter_positions,
// india_context_anchors }. Persists into issues.payload (JSONB) without
// clobbering other keys — payload schema lives in JSONB so no migration.
//
// Each external call sits in its own try/catch + timeout per CLAUDE.md rule #4
// (inngest step boundaries — we mirror the pattern here in case this stage
// gets lifted into an Inngest function later).

import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  getAnthropic,
  MODEL_DEEP_DIVE_RESEARCH,
  firstText,
  parseJsonFromResponse,
} from '@/lib/anthropic'
import type {
  DeepDiveCandidate,
  DeepDivePayload,
  DeepDiveResearchPack,
  DeepDiveCandidateMeta,
  RawItem,
} from '../../../db/types/database'

const FETCH_TIMEOUT_MS = 20_000
const FETCH_TEXT_CHARS = 4000
const RAW_ITEM_LIMIT = 30
const MAX_KEYWORDS = 6

export interface ResearchResult {
  issueId: string
  candidateId: string
  evidenceTripleCount: number
  counterPositionCount: number
  indiaAnchorCount: number
  cacheUsage: {
    inputTokens: number
    outputTokens: number
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
  }
}

// ─────────────────────────────────────────────────────────────────────
// WebFetch — bare fetch + plain-text strip. We keep this dependency-free
// instead of adding cheerio / jsdom.
// ─────────────────────────────────────────────────────────────────────

interface FetchedPage {
  url: string
  title: string | null
  text: string
  error?: string
}

function stripHtml(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim().slice(0, 200) : null

  // Remove script/style/noscript blocks entirely.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    // Preserve newlines around block-level tags so paragraph breaks survive.
    .replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip remaining tags.
    .replace(/<[^>]+>/g, ' ')

  const text = decodeEntities(stripped)
    .replace(/[\t\r ]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()

  return { title, text }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
}

async function fetchPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; AISignalResearchBot/1.0; +https://getaisignal.org)',
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    })
    if (!res.ok) {
      return { url, title: null, text: '', error: `HTTP ${res.status}` }
    }
    const html = await res.text()
    const { title, text } = stripHtml(html)
    return {
      url,
      title,
      text: text.slice(0, FETCH_TEXT_CHARS),
    }
  } catch (err) {
    return {
      url,
      title: null,
      text: '',
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timer)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Keyword extraction — used to ILIKE the raw_items table for related
// context the WebFetched anchors might miss.
// ─────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'are',
  'was', 'will', 'been', 'their', 'they', 'them', 'these', 'those', 'than',
  'then', 'when', 'what', 'which', 'while', 'about', 'after', 'before',
  'into', 'over', 'under', 'just', 'only', 'also', 'more', 'most', 'some',
  'such', 'your', 'yours', 'every', 'each', 'because', 'since', 'still',
  'should', 'would', 'could', 'might', 'said', 'says', 'one', 'two', 'three',
  'india', 'indian', 'builder', 'builders',
])

function extractKeywords(text: string, limit: number): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
  // Frequency-rank but cap at limit.
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k)
}

// ─────────────────────────────────────────────────────────────────────
// LLM prompt
// ─────────────────────────────────────────────────────────────────────

const RESEARCH_SYSTEM = `You are the research arm of a long-form essay series for Indian AI builders, PMs, and founders ("AI Signal — Deep-Dive Track"). Your output feeds the writer agent. Your job is NOT to write the essay — it is to extract structured evidence the writer can cite inline.

# OUTPUT — strict JSON, no fences

{
  "evidence_triples": [
    {
      "url": "<one of the URLs in the corpus>",
      "quote": "<≤200 words direct excerpt anchoring the claim — verbatim from the corpus, in quotes or paraphrased only if a direct excerpt isn't available>",
      "claim_supported": "<one sentence stating what the writer can argue using this quote>"
    }
  ],
  "counter_positions": [
    {
      "claim": "<the strongest opposing view to the candidate's assumption — phrased charitably>",
      "best_link": "<URL from the corpus that best represents this opposing view>",
      "steel_man": "<≤80 words steel-manning the opposing view. No straw men.>"
    }
  ],
  "india_context_anchors": [
    {
      "fact": "<an INR number, DPDP/RBI clause, Indic-data fact, GCC org-chart detail, or named Indian builder/buyer specific — that a global writer wouldn't have>",
      "source": "<URL or canonical name>"
    }
  ]
}

# RULES

- 6-12 evidence_triples. Cover the candidate's spine claims AND its India-context twist.
- 3-5 counter_positions. Be honest — the deep-dive's credibility lives here.
- 3-6 india_context_anchors. INR numbers, regulator clauses, Indic model evals, named Indian customers preferred.
- URLs MUST come from the corpus provided (anchor URLs + raw_items). Never fabricate.
- Quotes MUST be verbatim from the corpus or close paraphrase. Never invent.
- If the corpus lacks evidence for a strong counter-position, name what's MISSING rather than fabricating.
- No hedging in claim_supported / steel_man — make a real argument.`

// ─────────────────────────────────────────────────────────────────────
// Main stage
// ─────────────────────────────────────────────────────────────────────

export async function runStageDeepDiveResearch(opts: {
  issueId: string
  candidateId: string
}): Promise<ResearchResult> {
  const supabase = createAdminSupabaseClient()
  const anthropic = getAnthropic()

  // 1. Load candidate.
  const { data: candidate, error: candErr } = await supabase
    .from('deep_dive_candidates')
    .select('*')
    .eq('id', opts.candidateId)
    .single<DeepDiveCandidate>()
  if (candErr || !candidate) {
    throw new Error(`load candidate: ${candErr?.message ?? 'not found'}`)
  }

  const anchorUrls = Array.isArray(candidate.evidence_anchor_urls)
    ? (candidate.evidence_anchor_urls as string[])
    : []
  if (anchorUrls.length === 0) {
    throw new Error('candidate has no evidence_anchor_urls')
  }

  // 2. WebFetch all anchor URLs in parallel.
  const fetched = await Promise.allSettled(anchorUrls.map((u) => fetchPage(u)))
  const pages: FetchedPage[] = fetched.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          url: anchorUrls[i] ?? '(unknown)',
          title: null,
          text: '',
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        }
  )
  const successfulPages = pages.filter((p) => !p.error && p.text.length > 0)
  if (successfulPages.length === 0) {
    throw new Error(
      `WebFetch failed for all ${anchorUrls.length} anchor URLs: ${pages
        .map((p) => `${p.url}: ${p.error ?? 'empty'}`)
        .join('; ')}`
    )
  }

  // 3. Pull related raw_items by keyword ILIKE.
  const keywords = extractKeywords(
    `${candidate.assumption_challenged} ${candidate.one_paragraph_hook}`,
    MAX_KEYWORDS
  )
  const relatedItems: RawItem[] = []
  if (keywords.length > 0) {
    const orFilter = keywords
      .map((k) => `title.ilike.%${k}%,excerpt.ilike.%${k}%`)
      .join(',')
    const { data: items } = await supabase
      .from('raw_items')
      .select('*')
      .or(orFilter)
      .order('published_at', { ascending: false })
      .limit(RAW_ITEM_LIMIT)
    if (items) relatedItems.push(...items)
  }

  // 4. Build the corpus message.
  const corpusParts: string[] = []
  corpusParts.push(
    `# CANDIDATE ASSUMPTION (the belief we're challenging)\n\n${candidate.assumption_challenged}`
  )
  corpusParts.push(
    `# ESSAY HOOK\n\n${candidate.one_paragraph_hook}`
  )
  corpusParts.push(
    `# PRIMARY AUDIENCE\n\n${candidate.primary_audience}`
  )

  corpusParts.push(`# FETCHED ANCHOR PAGES (${successfulPages.length}/${anchorUrls.length} succeeded)\n`)
  for (const p of successfulPages) {
    corpusParts.push(
      `## ${p.title ?? '(untitled)'}\nURL: ${p.url}\n\n${p.text}`
    )
  }
  const failed = pages.filter((p) => p.error || p.text.length === 0)
  if (failed.length > 0) {
    corpusParts.push(
      `## (failed fetches — do NOT cite)\n${failed
        .map((p) => `- ${p.url}: ${p.error ?? 'empty'}`)
        .join('\n')}`
    )
  }

  if (relatedItems.length > 0) {
    corpusParts.push(
      `# RELATED RAW ITEMS (${relatedItems.length}, keyword-matched: ${keywords.join(', ')})\n`
    )
    for (const it of relatedItems) {
      const date = it.published_at
        ? new Date(it.published_at).toISOString().slice(0, 10)
        : '—'
      corpusParts.push(
        `- [${date}] ${it.source} — ${it.title}\n  ${(it.excerpt ?? '').slice(0, 300)}\n  ${it.url}`
      )
    }
  }

  corpusParts.push(
    `# YOUR TASK\n\nProduce the research_pack JSON per the system schema. Cite only the URLs above. Verbatim quotes. JSON only.`
  )

  const userMessage = corpusParts.join('\n\n')

  // 5. Call Opus.
  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: MODEL_DEEP_DIVE_RESEARCH,
      max_tokens: 8192,
      system: [
        {
          type: 'text',
          text: RESEARCH_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new Error(`deep-dive research API ${err.status}: ${err.message}`)
    }
    throw err
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('deep-dive research hit max_tokens — output truncated')
  }

  const text = firstText(response)
  const pack = parseJsonFromResponse<DeepDiveResearchPack>(text)

  // Defensive normalization.
  pack.evidence_triples = Array.isArray(pack.evidence_triples) ? pack.evidence_triples : []
  pack.counter_positions = Array.isArray(pack.counter_positions) ? pack.counter_positions : []
  pack.india_context_anchors = Array.isArray(pack.india_context_anchors)
    ? pack.india_context_anchors
    : []

  // 6. Persist. Read current payload (if any) and merge — don't clobber.
  const { data: issue, error: issueErr } = await supabase
    .from('issues')
    .select('payload')
    .eq('id', opts.issueId)
    .single()
  if (issueErr) throw new Error(`load issue: ${issueErr.message}`)

  const candidateMeta: DeepDiveCandidateMeta = {
    candidate_id: candidate.id,
    assumption_challenged: candidate.assumption_challenged,
    one_paragraph_hook: candidate.one_paragraph_hook,
    primary_audience: candidate.primary_audience,
    evidence_anchor_urls: anchorUrls,
  }

  const existing = (issue.payload as Partial<DeepDivePayload> | null) ?? {}
  const nextPayload: Partial<DeepDivePayload> = {
    ...existing,
    kind: 'deep_dive',
    research_pack: pack,
    candidate_meta: candidateMeta,
  }

  const { error: updErr } = await supabase
    .from('issues')
    .update({ payload: nextPayload as DeepDivePayload, status: 'synthesizing' })
    .eq('id', opts.issueId)
  if (updErr) throw new Error(`persist research_pack: ${updErr.message}`)

  return {
    issueId: opts.issueId,
    candidateId: opts.candidateId,
    evidenceTripleCount: pack.evidence_triples.length,
    counterPositionCount: pack.counter_positions.length,
    indiaAnchorCount: pack.india_context_anchors.length,
    cacheUsage: {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  }
}
