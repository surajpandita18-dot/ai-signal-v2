// Stage 2 — Cluster.
// Loads recent raw_items, picks the most-signal subset, asks Claude Haiku to
// group them into thematic clusters, and writes the result with a *weighted*
// convergence_score (sum of distinct source weights, not raw source count).
//
// Why weighting matters: one Karpathy (w=4) + one DeepMind (w=5) about the same
// shift should beat five HN posts (w=1×5). The synthesizer prompt in Stage 3
// uses convergence_score to rank candidate throughlines.

import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getAnthropic, MODEL_CLUSTER, firstText, parseJsonFromResponse } from '@/lib/anthropic'
import type { RawItem } from '../../../db/types/database'

// Hard cap on items sent to Claude. ~200 × ~80 tokens each ≈ 16k input tokens,
// well within Haiku 4.5's window. Higher caps would let arXiv volume drown signal.
const ITEM_CAP = 200

// Drop items older than this (hours). Tier C 7d window is enforced at fetch time,
// so by the time items reach clustering the recency cut is uniform.
const CLUSTER_WINDOW_HOURS = 24 * 7

export interface ClusterModelOutput {
  label: string
  item_ids: string[]
  set_aside?: boolean
  set_aside_reason?: string
}

export interface ClusterResult {
  issueId: string
  itemsConsidered: number
  itemsSentToModel: number
  clustersWritten: number
  setAsideCount: number
  topClusters: Array<{ label: string; size: number; convergence: number; sources: string[] }>
}

interface CompactItem {
  id: string
  source: string
  weight: number
  beat: string
  title: string
  excerpt: string | null
}

function compactForModel(item: RawItem): CompactItem {
  const excerpt = item.excerpt ? item.excerpt.slice(0, 240) : null
  return {
    id: item.id,
    source: item.source,
    weight: item.weight,
    beat: item.beat,
    title: item.title,
    excerpt,
  }
}

function buildPrompt(items: CompactItem[]): string {
  const itemBlocks = items
    .map(
      (it, i) =>
        `[${i}] id=${it.id}\n  source=${it.source} weight=${it.weight} beat=${it.beat}\n  title: ${it.title}${it.excerpt ? `\n  excerpt: ${it.excerpt}` : ''}`
    )
    .join('\n\n')

  return `You are clustering the past week's AI news for a weekly synthesis brief. The brief surfaces ONE non-obvious shift per week, supported by 2-3 proof clusters. Your job here is to produce the clusters.

A cluster is a group of items that point to the SAME underlying shift — same launch and its reactions, same trend across multiple announcements, same theme appearing in multiple voices. Items can be in only ONE cluster.

Rules:
1. Aim for 10-20 clusters total. Quality > quantity.
2. Mark a cluster set_aside=true when it is one of:
   - Single-source AND not from a top lab (weight<5)
   - Off-topic for AI (a stray business / consumer story)
   - Pure noise (single VC raise with no product significance, etc.)
3. Use short, specific labels (5-10 words). Avoid generic labels like "Model updates" — say "OpenAI ships gpt-5.1 with reasoning modes" instead.
4. EVERY item id must appear in exactly one cluster (or in its own set_aside cluster).
5. Output JSON only — no prose, no preamble, no markdown fences.
6. item_ids must be ONLY the uuid string from the id= field above. Never echo titles, excerpts, sources, or weights into the JSON.
7. set_aside_reason is optional and capped at 12 words.

Output schema (strict):
{
  "clusters": [
    { "label": "...", "item_ids": ["uuid1", "uuid2"], "set_aside": false },
    { "label": "...", "item_ids": ["uuid3"], "set_aside": true, "set_aside_reason": "single-source funding" }
  ]
}

ITEMS:
${itemBlocks}`
}

/**
 * Score = primary by source weight (5 is best), secondary by recency.
 * Used to pick top-N items when raw count exceeds ITEM_CAP.
 */
function itemScore(item: RawItem): number {
  const weight = item.weight
  const ageHours = item.published_at
    ? (Date.now() - new Date(item.published_at).getTime()) / (1000 * 60 * 60)
    : 999
  // Heavily favor weight; recency is a tiebreaker within weight bucket.
  return weight * 1000 - ageHours
}

export async function runStageCluster(opts: { issueId: string }): Promise<ClusterResult> {
  const supabase = createAdminSupabaseClient()

  // 1. Load items: ones already attached to THIS issue, plus unattached.
  //    Run two separate queries (Supabase .or() with UUIDs misbehaves).
  //    Recency window applied in JS.
  const cutoffMs = Date.now() - CLUSTER_WINDOW_HOURS * 60 * 60 * 1000
  const [attachedRes, unattachedRes] = await Promise.all([
    supabase
      .from('raw_items')
      .select('*')
      .eq('issue_id', opts.issueId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(2000),
    supabase
      .from('raw_items')
      .select('*')
      .is('issue_id', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(2000),
  ])
  if (attachedRes.error) throw new Error(`load attached: ${attachedRes.error.message}`)
  if (unattachedRes.error) throw new Error(`load unattached: ${unattachedRes.error.message}`)
  const itemsRaw = [...(attachedRes.data ?? []), ...(unattachedRes.data ?? [])]
  if (itemsRaw.length === 0) {
    throw new Error('No raw_items found — run Stage 1 first.')
  }
  const items = itemsRaw.filter((it) => {
    if (!it.published_at) return true // keep undated items (e.g. some arXiv quirks)
    return new Date(it.published_at).getTime() >= cutoffMs
  })
  if (items.length === 0) {
    throw new Error(`No raw_items in last ${CLUSTER_WINDOW_HOURS}h — run Stage 1 first.`)
  }

  // 2. Claim unattached items for this issue. Batch the UPDATE — PostgREST
  //    puts the IN clause in the URL, which has a ~8KB practical limit
  //    (~200 uuids per call is safe).
  const unattachedIds = items.filter((i) => i.issue_id === null).map((i) => i.id)
  const BATCH = 150
  for (let i = 0; i < unattachedIds.length; i += BATCH) {
    const chunk = unattachedIds.slice(i, i + BATCH)
    const { error: claimErr } = await supabase
      .from('raw_items')
      .update({ issue_id: opts.issueId })
      .in('id', chunk)
    if (claimErr) {
      throw new Error(`claim batch failed (offset ${i}): ${claimErr.message}`)
    }
  }

  // 3. Score + cap.
  const ranked = [...items].sort((a, b) => itemScore(b) - itemScore(a))
  const capped = ranked.slice(0, ITEM_CAP)
  const compact = capped.map(compactForModel)

  // 4. Send to Claude.
  const prompt = buildPrompt(compact)
  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: MODEL_CLUSTER,
    max_tokens: 16_000,
    messages: [{ role: 'user', content: prompt }],
  })
  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      `Cluster response hit max_tokens (16000) — input had ${compact.length} items. ` +
        `Lower ITEM_CAP or split into batches.`
    )
  }
  const text = firstText(response)
  const parsed = parseJsonFromResponse<{ clusters: ClusterModelOutput[] }>(text)
  if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
    throw new Error('Model response missing "clusters" array')
  }

  // 5. Compute weighted convergence per cluster.
  //    weight lookup from the items we sent (those are the only valid ids).
  const idToItem = new Map(capped.map((it) => [it.id, it] as const))

  type ToInsert = {
    issue_id: string
    label: string
    item_ids: string[]
    convergence_score: number
    set_aside: boolean
  }
  const toInsert: ToInsert[] = []
  const topPreview: ClusterResult['topClusters'] = []
  let setAsideCount = 0

  for (const c of parsed.clusters) {
    const validIds = (c.item_ids ?? []).filter((id) => idToItem.has(id))
    if (validIds.length === 0) continue

    const uniqueSourceWeights = new Map<string, number>()
    for (const id of validIds) {
      const it = idToItem.get(id)!
      if (!uniqueSourceWeights.has(it.source)) {
        uniqueSourceWeights.set(it.source, it.weight)
      }
    }
    const convergence = Array.from(uniqueSourceWeights.values()).reduce((a, b) => a + b, 0)
    const setAside = Boolean(c.set_aside)
    if (setAside) setAsideCount++

    toInsert.push({
      issue_id: opts.issueId,
      label: c.label,
      item_ids: validIds,
      convergence_score: convergence,
      set_aside: setAside,
    })

    if (!setAside) {
      topPreview.push({
        label: c.label,
        size: validIds.length,
        convergence,
        sources: Array.from(uniqueSourceWeights.keys()),
      })
    }
  }

  // 6. Write clusters.
  const { error: insErr } = await supabase.from('clusters').insert(toInsert)
  if (insErr) throw new Error(`insert clusters: ${insErr.message}`)

  // 7. Update issue status + set_aside_count.
  const { error: updErr } = await supabase
    .from('issues')
    .update({ status: 'synthesizing', set_aside_count: setAsideCount })
    .eq('id', opts.issueId)
  if (updErr) throw new Error(`update issue status: ${updErr.message}`)

  topPreview.sort((a, b) => b.convergence - a.convergence)

  return {
    issueId: opts.issueId,
    itemsConsidered: items.length,
    itemsSentToModel: capped.length,
    clustersWritten: toInsert.length,
    setAsideCount,
    topClusters: topPreview.slice(0, 10),
  }
}
