import Parser from 'rss-parser'
import { SOURCES, type Source, type ContentTrack } from '@/config/sources'

// Filter sources by which content track they feed. Default 'news' so
// existing call-sites (the weekly cron) get the same behavior as before.
function sourcesForTrack(track: ContentTrack): Source[] {
  return SOURCES.filter((s) => {
    const tracks = s.tracks ?? ['news']
    return tracks.includes(track)
  })
}
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { Beat } from '../../../db/types/database'

export interface SourceResult {
  source: string
  tier: Source['tier']
  weight: number
  fetched: number     // items returned by the feed
  inWindow: number    // items that passed the recency filter
  inserted: number    // items newly inserted into raw_items
  skipped: number     // duplicates (url already in raw_items)
  error?: string
}

interface NormalizedItem {
  source: string
  tier: Source['tier']
  weight: number
  beat: Beat
  url: string
  title: string
  excerpt: string | null
  published_at: string | null
}

const parser: Parser = new Parser({
  timeout: 30_000,
  headers: {
    // Some publishers (a16z, Cloudflare-fronted feeds) reject the default node UA.
    // Use a browser-like UA + an Accept header that explicitly asks for RSS/Atom.
    'User-Agent': 'Mozilla/5.0 (compatible; ai-signal-v2/0.1; +https://getaisignal.org)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
})

function stripHtml(html: string | undefined | null): string | null {
  if (!html) return null
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600) || null
}

async function fetchSource(source: Source, now: Date): Promise<NormalizedItem[]> {
  const cutoff = new Date(now.getTime() - source.windowHours * 60 * 60 * 1000)
  const feed = await parser.parseURL(source.feedUrl)

  const items: NormalizedItem[] = []
  for (const item of feed.items ?? []) {
    const url = item.link?.trim()
    const title = item.title?.trim()
    if (!url || !title) continue

    const publishedRaw = item.isoDate || item.pubDate
    const publishedAt = publishedRaw ? new Date(publishedRaw) : null
    if (publishedAt && !Number.isNaN(publishedAt.getTime()) && publishedAt < cutoff) {
      continue
    }

    items.push({
      source: source.id,
      tier: source.tier,
      weight: source.weight,
      beat: source.beat,
      url,
      title,
      excerpt: stripHtml(item.contentSnippet || item.content || item.summary),
      published_at: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
    })
  }
  return items
}

/**
 * Stage 1 — Source.
 * Pulls all configured feeds in parallel, normalizes, writes to raw_items.
 * Returns per-source counts. Errors on a single feed do NOT fail the whole stage.
 *
 * `issueId` is optional — when omitted (e.g. from the smoke test) items are stored
 * unattached and can be claimed by an issue later. When the orchestrator calls this,
 * it passes its issueId so the items belong to that run.
 */
export async function runStageSource(
  opts: { issueId?: string; now?: Date; track?: ContentTrack } = {}
): Promise<SourceResult[]> {
  const supabase = createAdminSupabaseClient()
  const now = opts.now ?? new Date()
  const activeSources = sourcesForTrack(opts.track ?? 'news')

  const settled = await Promise.allSettled(
    activeSources.map(async (s): Promise<SourceResult> => {
      try {
        const fetched = await fetchSource(s, now)
        if (fetched.length === 0) {
          return { source: s.id, tier: s.tier, weight: s.weight, fetched: 0, inWindow: 0, inserted: 0, skipped: 0 }
        }
        const { data, error } = await supabase
          .from('raw_items')
          .upsert(
            fetched.map((item) => ({ ...item, issue_id: opts.issueId ?? null })),
            { onConflict: 'url', ignoreDuplicates: true }
          )
          .select('id')
        if (error) throw error
        const inserted = data?.length ?? 0
        return {
          source: s.id,
          tier: s.tier,
          weight: s.weight,
          fetched: fetched.length,
          inWindow: fetched.length,
          inserted,
          skipped: fetched.length - inserted,
        }
      } catch (err) {
        return {
          source: s.id,
          tier: s.tier,
          weight: s.weight,
          fetched: 0,
          inWindow: 0,
          inserted: 0,
          skipped: 0,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    })
  )

  return settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          source: activeSources[i].id,
          tier: activeSources[i].tier,
          weight: activeSources[i].weight,
          fetched: 0,
          inWindow: 0,
          inserted: 0,
          skipped: 0,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        }
  )
}
