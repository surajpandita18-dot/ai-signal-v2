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
          <p className="font-mono text-[12px] tracking-label text-fg-muted">
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

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav subscribed={subscribed} />
      <ArticleRenderer issue={renderable} />
      <SiteFooter />
    </div>
  )
}
