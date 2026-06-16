// Dynamic sitemap — lists every public route + every published issue.
// Read by Google / Bing / DuckDuckGo crawlers + Resend-Inbox preview
// scrapers. Re-renders on each request (force-dynamic) so newly
// published issues appear within seconds, not after a redeploy.

import type { MetadataRoute } from 'next'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/subscribe`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/watchlist`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]

  // Issue pages — include both weekly + deep-dive with payload.
  const supabase = createAdminSupabaseClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('id, created_at, issue_type')
    .in('status', ['drafted', 'awaiting_human'])
    .not('payload', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  const issueRoutes: MetadataRoute.Sitemap = (issues ?? []).map((it) => ({
    url: `${base}/issue/${it.id}`,
    lastModified: it.created_at ? new Date(it.created_at) : now,
    changeFrequency: 'yearly' as const,
    priority: 0.85,
  }))

  return [...staticRoutes, ...issueRoutes]
}
