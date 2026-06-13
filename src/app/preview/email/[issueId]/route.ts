// GET /preview/email/[issueId] — returns the rendered HTML email for browser preview.
// Use this to see exactly what subscribers will receive without firing Resend.
// Add ?format=text to see the plaintext multipart alternative.

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { renderEmailHtml } from '@/lib/email-template'
import { renderTeaserHtml } from '@/lib/deep-dive-email'
import type {
  DeepDivePayload,
  IssueType,
} from '../../../../../db/types/database'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params
  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'html'

  const supabase = createAdminSupabaseClient()
  const { data: issue, error } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single()
  if (error || !issue) {
    return new NextResponse('Issue not found', { status: 404 })
  }
  if (!issue.payload) {
    return new NextResponse('Issue has no payload — run Stage 3 first.', {
      status: 400,
    })
  }

  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .in('status', ['drafted', 'awaiting_human'])
    .lte('created_at', issue.created_at)

  const issueType: IssueType = (issue.issue_type as IssueType) ?? 'weekly_brief'
  const rendered =
    issueType === 'deep_dive'
      ? renderTeaserHtml({
          issueId,
          payload: issue.payload as unknown as DeepDivePayload,
          issueCreatedAt: issue.created_at,
        })
      : renderEmailHtml({
          issueId,
          issueNumber: count ?? 1,
          issueCreatedAt: issue.created_at,
          payload: issue.payload,
          chosen: issue.chosen_calls,
        })

  if (format === 'text') {
    return new NextResponse(rendered.text, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  if (format === 'json') {
    return NextResponse.json(rendered)
  }
  return new NextResponse(rendered.html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
