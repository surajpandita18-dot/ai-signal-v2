// POST /api/send-issue { issueId, testOnly? }
// Renders the issue's HTML email and sends it.
//   testOnly=true → sends ONLY to NEWSLETTER_OWNER_EMAIL (default Suraj).
//                   Use this to preview the actual delivered email.
//   testOnly=false → sends to all `active` subscribers.

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  renderEmailHtml,
} from '@/lib/email-template'
import { sendIssueToSubscribers, sendTestEmail } from '@/lib/email-send'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { issueId?: string; testOnly?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const { issueId, testOnly } = body
  if (!issueId) return NextResponse.json({ error: 'issueId required' }, { status: 400 })
  // Safety: a missing or coerced `testOnly` must NOT silently default to a
  // blast to all subscribers. Require an explicit boolean — a typo on the
  // caller's side should fail closed, not blast prod.
  if (typeof testOnly !== 'boolean') {
    return NextResponse.json(
      { error: 'testOnly must be an explicit boolean (true to preview, false to blast all subscribers)' },
      { status: 400 }
    )
  }

  const supabase = createAdminSupabaseClient()
  const { data: issue, error } = await supabase
    .from('issues')
    .select('id, payload, chosen_calls, status, created_at, markdown_path')
    .eq('id', issueId)
    .single()
  if (error || !issue) return NextResponse.json({ error: 'issue not found' }, { status: 404 })
  if (!issue.payload) {
    return NextResponse.json({ error: 'issue has no payload — synthesize first' }, { status: 400 })
  }

  // Compute issue number (consistent with drafter)
  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .in('status', ['drafted', 'awaiting_human'])
    .lte('created_at', issue.created_at)

  const inputBase = {
    issueId: issue.id,
    issueNumber: count ?? 1,
    issueCreatedAt: issue.created_at,
    payload: issue.payload,
    chosen: issue.chosen_calls,
  }

  if (testOnly === true) {
    const owner = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
    const rendered = renderEmailHtml({
      ...inputBase,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    })
    try {
      const res = await sendTestEmail({
        to: owner,
        subject: `[TEST] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
        preheader: rendered.preheader,
      })
      return NextResponse.json({ ok: true, testOnly: true, to: owner, id: res.id })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      )
    }
  }

  // Real send to all active subscribers
  try {
    const result = await sendIssueToSubscribers(inputBase)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
