// RSS feed — /feed.xml
// Referenced in every footer. Exposes the most recent ~20 issues.

import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type {
  DeepDivePayload,
  IssuePayload,
  IssueType,
} from '../../../db/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function siteUrl(): string {
  // `||` not `??` — Vercel can store empty strings; see blunder #002.
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'
}

export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('id, issue_type, payload, created_at, updated_at')
    .in('status', ['drafted', 'awaiting_human'])
    .order('created_at', { ascending: false })
    .limit(40)

  const site = siteUrl()
  const items = (issues ?? [])
    .map((it) => {
      const type: IssueType = (it.issue_type as IssueType) ?? 'weekly_brief'
      const wb = type === 'weekly_brief' ? (it.payload as IssuePayload | null) : null
      const dd =
        type === 'deep_dive' ? (it.payload as unknown as DeepDivePayload | null) : null
      const title =
        wb?.headline ?? dd?.title ?? '(untitled)'
      const dek = wb?.throughline ?? dd?.subtitle ?? ''
      const url = `${site}/issue/${it.id}`
      const kind = type === 'deep_dive' ? 'Deep Dive' : 'Weekly Brief'
      const pub = new Date(it.created_at).toUTCString()
      return `
    <item>
      <title>${esc(`${kind} · ${title}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(dek)}</description>
      <pubDate>${pub}</pubDate>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Signal — Weekly AI brief from Bangalore, for builders anywhere</title>
    <link>${site}</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Monday-morning AI synthesis for builders, PMs, founders worldwide. Frontier APIs + India regulation + INR math + Indic models — every issue.</description>
    <language>en</language>
    <generator>AI Signal v3</generator>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=600',
    },
  })
}
