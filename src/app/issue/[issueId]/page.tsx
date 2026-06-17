// Public web reader — Figr design v3 (2026-06-13).
// Single layout for both content tracks. Renderer dispatches on issue_type →
// adapter → ArticleRenderer (chapters of editorial blocks).

import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { isSubscribed } from '@/lib/subscription'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import ArticleRenderer from '@/components/article/ArticleRenderer'
import {
  weeklyToRenderable,
  deepDiveToRenderable,
} from '@/components/article/payload-adapter'
import type {
  ChosenCalls,
  DeepDivePayload,
  IssuePayload,
  IssueType,
} from '../../../../db/types/database'

export const dynamic = 'force-dynamic'

// Per-issue metadata so Google + LinkedIn + Twitter cards get the right
// title + description + OG image. Without this every issue inherits the
// site-wide default and you lose 80% of the SEO surface area.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  const supabase = createAdminSupabaseClient()
  const { data: issue } = await supabase
    .from('issues')
    .select('payload, issue_type, created_at')
    .eq('id', issueId)
    .single()
  if (!issue || !issue.payload) return { title: 'AI Signal' }
  const isDD = issue.issue_type === 'deep_dive'
  const wb = isDD ? null : (issue.payload as IssuePayload)
  const dd = isDD ? (issue.payload as unknown as DeepDivePayload) : null
  const title = wb?.headline ?? dd?.title ?? 'AI Signal'
  const description = (wb?.throughline ?? dd?.subtitle ?? '').slice(0, 200)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'
  const canonical = `${siteUrl}/issue/${issueId}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: new Date(issue.created_at).toISOString(),
      siteName: 'AI Signal',
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
    },
  }
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  const supabase = createAdminSupabaseClient()
  const subscribed = await isSubscribed()

  const { data: issue } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single()
  if (!issue) notFound()

  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .in('status', ['drafted', 'awaiting_human'])
    .lte('created_at', issue.created_at)
  const num = String(count ?? 1).padStart(3, '0')
  const issueType: IssueType = (issue.issue_type as IssueType) ?? 'weekly_brief'

  if (!issue.payload) {
    return (
      <div className="min-h-screen bg-bg font-sans text-fg">
        <SiteNav subscribed={subscribed} />
        <div className="mx-auto max-w-read px-5 py-20 sm:px-8">
          <p className=" text-[12px] font-medium tracking-[0.08em] text-fg-muted">
            ISSUE DRAFT IN PROGRESS — CHECK BACK IN A FEW MINUTES.
          </p>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const renderable =
    issueType === 'deep_dive'
      ? deepDiveToRenderable(issue.payload as unknown as DeepDivePayload, {
          no: num,
          createdAt: issue.created_at,
        })
      : weeklyToRenderable(
          issue.payload as IssuePayload,
          (issue.chosen_calls ?? null) as ChosenCalls | null,
          { no: num, createdAt: issue.created_at }
        )

  // JSON-LD Article schema — feeds Google rich-snippet card + Bing news +
  // LinkedIn link preview. Schema.org NewsArticle works for both weekly
  // briefs and deep-dives; the `datePublished` + `headline` + `author` set
  // is what crawlers care about.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: renderable.title,
    description: renderable.dek,
    datePublished: new Date(issue.created_at).toISOString(),
    dateModified: new Date(issue.created_at).toISOString(),
    author: {
      '@type': 'Person',
      name: 'Suraj Pandita',
      url: `${siteUrl}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AI Signal',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/issue/${issueId}`,
    },
    articleSection: renderable.kind === 'DEEP DIVE' ? 'Deep Dive' : 'Weekly Brief',
    inLanguage: 'en',
  }
  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <SiteNav subscribed={subscribed} />
      <ArticleRenderer issue={renderable} issueId={issueId} />
      <SiteFooter />
    </div>
  )
}
