// GET /api/cron/deep-dive-discover — fortnightly discovery cron.
// Vercel cron fires every Monday 18:00 IST (12:30 UTC) per vercel.json.
// We enforce "alternate weeks" inside the handler: skip if a discovery
// run already happened within the past 10 days.
//
// Discovery agent reads 60 days of long-form raw_items and proposes 5
// assumption candidates for /review/deep-dive. The owner picks ONE — the
// human gate per CLAUDE.md rule #1 stays for the deep-dive track.

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { runStageDeepDiveDiscover } from '@/inngest/stages/deep-dive-discover'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const MIN_DAYS_BETWEEN_RUNS = 10

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true // dev mode
  return req.headers.get('authorization') === `Bearer ${expected}`
}

async function notifyOwner(opts: {
  candidatesWritten: number
  reviewUrl: string
  skipped?: boolean
  skipReason?: string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const to = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
  const from = process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
  const resend = new Resend(key)
  const subject = opts.skipped
    ? 'AI Signal · Deep-dive discovery skipped'
    : `AI Signal · ${opts.candidatesWritten} new deep-dive candidates`
  const html = opts.skipped
    ? `<p>Discovery cron skipped: ${opts.skipReason}</p>`
    : `<p>${opts.candidatesWritten} new candidates in the queue.</p><p>Pick one at <a href="${opts.reviewUrl}">${opts.reviewUrl}</a> — the chosen assumption kicks off research + draft + QA for the next deep-dive.</p>`
  const text = opts.skipped
    ? `Discovery skipped: ${opts.skipReason}`
    : `${opts.candidatesWritten} candidates. Review: ${opts.reviewUrl}`
  await resend.emails.send({ from, to, subject, html, text })
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-signal-v2.vercel.app'
  const reviewUrl = `${site}/review/deep-dive`

  // Skip if a discovery batch already exists within the past N days.
  const cutoff = new Date(
    Date.now() - MIN_DAYS_BETWEEN_RUNS * 24 * 60 * 60 * 1000
  ).toISOString()
  const supabase = createAdminSupabaseClient()
  const { count } = await supabase
    .from('deep_dive_candidates')
    .select('id', { count: 'exact', head: true })
    .gte('discovered_at', cutoff)
  if ((count ?? 0) > 0) {
    await notifyOwner({
      candidatesWritten: 0,
      reviewUrl,
      skipped: true,
      skipReason: `${count} candidates already discovered within the last ${MIN_DAYS_BETWEEN_RUNS} days`,
    })
    return NextResponse.json({ skipped: true, recentCount: count })
  }

  try {
    const result = await runStageDeepDiveDiscover()
    await notifyOwner({
      candidatesWritten: result.candidatesWritten,
      reviewUrl,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try {
      await notifyOwner({
        candidatesWritten: 0,
        reviewUrl,
        skipped: true,
        skipReason: `Pipeline error: ${msg}`,
      })
    } catch {
      /* ignore */
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export const POST = GET
