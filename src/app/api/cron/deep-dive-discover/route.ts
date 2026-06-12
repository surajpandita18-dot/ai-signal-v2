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
// Autonomy thresholds for picking-without-human.
// score ≥ 9 = the world is strongly converging on the assumption being wrong
// evidence_anchor_urls ≥ 4 = the dive has enough independent sources to cite
const AUTO_PICK_SCORE = 9
const AUTO_PICK_MIN_URLS = 4

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
  autoPicked?: {
    id: string
    assumption: string
    score: number | null
    issueId?: string
  } | null
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const to = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
  const from = process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-signal-v2.vercel.app'
  const resend = new Resend(key)

  const subject = opts.skipped
    ? 'AI Signal · Deep-dive discovery skipped'
    : opts.autoPicked
      ? `AI Signal · Auto-picked: "${opts.autoPicked.assumption}"`
      : `AI Signal · ${opts.candidatesWritten} new deep-dive candidates`

  const autoBlock = opts.autoPicked
    ? `<p style="margin:18px 0;padding:14px 16px;background:#efe8da;border-left:4px solid #0f4c3a;font-family:monospace;font-size:13px;line-height:1.55;">
         <strong>AUTO-PICKED ✓</strong> (score ${opts.autoPicked.score}/10)<br/>
         <em>${opts.autoPicked.assumption}</em><br/>
         Research → write → QA running now. If QA scores ≥ 9 across all
         dimensions the essay auto-sends to subscribers. If 8-8.99 it
         drafts for your one-click send. If &lt; 8 it queues for your edits.
         ${opts.autoPicked.issueId ? `<br/>Issue: <a href="${site}/issue/${opts.autoPicked.issueId}">${site}/issue/${opts.autoPicked.issueId}</a>` : ''}
       </p>`
    : ''

  const html = opts.skipped
    ? `<p>Discovery cron skipped: ${opts.skipReason}</p>`
    : opts.autoPicked
      ? `<p>${opts.candidatesWritten} candidates discovered. Auto-pick logic engaged.</p>${autoBlock}<p>Other candidates still in the queue at <a href="${opts.reviewUrl}">${opts.reviewUrl}</a> if you want to pick a second one manually.</p>`
      : `<p>${opts.candidatesWritten} new candidates in the queue. None cleared the auto-pick bar (score ≥9 + 4+ evidence URLs), so they're awaiting your pick at <a href="${opts.reviewUrl}">${opts.reviewUrl}</a>.</p>`
  const text = opts.skipped
    ? `Discovery skipped: ${opts.skipReason}`
    : opts.autoPicked
      ? `Auto-picked: ${opts.autoPicked.assumption}\nScore ${opts.autoPicked.score}/10\nPipeline running. Review queue: ${opts.reviewUrl}`
      : `${opts.candidatesWritten} candidates, none auto-pick eligible. Review: ${opts.reviewUrl}`
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

    // Auto-pick the strongest candidate if it clears the autonomy bar.
    // Owner explicitly authorized this on 2026-06-12 — see memory
    // feedback_human_gate_pressure.md (2026-06-12 update section).
    const { data: top } = await supabase
      .from('deep_dive_candidates')
      .select('id, assumption_challenged, score, evidence_anchor_urls, primary_audience')
      .eq('chosen', false)
      .is('rejection_reason', null)
      .order('score', { ascending: false })
      .order('discovered_at', { ascending: false })
      .limit(1)
      .single()

    let autoPicked: {
      id: string
      assumption: string
      score: number | null
      issueId?: string
    } | null = null

    if (
      top &&
      (top.score ?? 0) >= AUTO_PICK_SCORE &&
      Array.isArray(top.evidence_anchor_urls) &&
      (top.evidence_anchor_urls as unknown[]).length >= AUTO_PICK_MIN_URLS
    ) {
      // Create the deep-dive issue + mark candidate chosen.
      const { data: issue, error: createErr } = await supabase
        .from('issues')
        .insert({ status: 'sourcing', issue_type: 'deep_dive' })
        .select('id')
        .single()
      if (!createErr && issue) {
        await supabase
          .from('deep_dive_candidates')
          .update({ chosen: true, chosen_issue_id: issue.id })
          .eq('id', top.id)

        autoPicked = {
          id: top.id,
          assumption: top.assumption_challenged,
          score: top.score,
          issueId: issue.id,
        }

        // Fire-and-forget the pipeline (research → write → QA → maybe send).
        const internalUrl = `${site}/api/internal/deep-dive-run`
        const secret = process.env.CRON_SECRET
        const headers: Record<string, string> = { 'content-type': 'application/json' }
        if (secret) headers['x-internal-secret'] = secret
        void fetch(internalUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ issueId: issue.id, candidateId: top.id }),
          keepalive: true,
        }).catch((err) => {
          console.warn(`auto-pick pipeline trigger failed: ${err?.message ?? err}`)
        })
      }
    }

    await notifyOwner({
      candidatesWritten: result.candidatesWritten,
      reviewUrl,
      autoPicked,
    })
    return NextResponse.json({ ok: true, ...result, autoPicked })
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
