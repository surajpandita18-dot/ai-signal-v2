// GET /api/cron/weekly — fires from Vercel Cron every Monday early IST.
// Runs Stages 1-3 (source → cluster → synthesize) end-to-end, then emails the
// owner a link to /review/<issueId> so they can pick Ship/Hold/Kill and trigger
// send.
//
// Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`. Validate.

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { runStageSource } from '@/inngest/stages/source'
import { runStageCluster } from '@/inngest/stages/cluster'
import { runStageSynthesize } from '@/inngest/stages/synthesize'

// Long pipeline (source ~30s + cluster ~50s + synth ~100s). Pro plan = 300s.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  // In dev, allow unauthenticated for local testing.
  if (!expected) return true
  const got = req.headers.get('authorization') ?? ''
  return got === `Bearer ${expected}`
}

async function notifyOwner(opts: {
  issueId: string
  headline: string
  noSignal: boolean
  noSignalReason?: string | null
}) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
  const from = process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getaisignal.org'
  if (!key) return
  const resend = new Resend(key)
  const reviewUrl = `${site}/review/${opts.issueId}`
  const subject = opts.noSignal
    ? `AI Signal · No signal this week`
    : `AI Signal · Issue ready for your review: "${opts.headline}"`
  const html = opts.noSignal
    ? `<p>The synthesizer found no genuine non-obvious shift this week.</p><p><em>${opts.noSignalReason ?? ''}</em></p><p>Review at <a href="${reviewUrl}">${reviewUrl}</a> if you want to override.</p>`
    : `<p>This week's issue is generated and waiting for your Ship / Hold / Kill picks.</p><p><strong>${opts.headline}</strong></p><p><a href="${reviewUrl}">Open review →</a></p><p>Pick once, then it auto-drafts. Trigger send from the drafted screen.</p>`
  const text = opts.noSignal
    ? `No signal this week.\n${opts.noSignalReason ?? ''}\nReview: ${reviewUrl}`
    : `Issue ready for review.\n${opts.headline}\nReview: ${reviewUrl}`
  await resend.emails.send({ from, to, subject, html, text })
}

async function runPipeline(): Promise<{
  ok: boolean
  issueId: string
  noSignal: boolean
  headline?: string
  error?: string
}> {
  const supabase = createAdminSupabaseClient()

  // 1. Create issue row
  const { data: created, error: createErr } = await supabase
    .from('issues')
    .insert({ status: 'sourcing' })
    .select('id')
    .single()
  if (createErr || !created) {
    return { ok: false, issueId: '', noSignal: false, error: createErr?.message ?? 'create failed' }
  }
  const issueId = created.id

  try {
    // 2. Stage 1 — source
    await supabase.from('issues').update({ status: 'sourcing' }).eq('id', issueId)
    await runStageSource({ issueId })

    // 3. Stage 2 — cluster
    await supabase.from('issues').update({ status: 'clustering' }).eq('id', issueId)
    await runStageCluster({ issueId })

    // 4. Stage 3 — synthesize
    await supabase.from('issues').update({ status: 'synthesizing' }).eq('id', issueId)
    const result = await runStageSynthesize({ issueId })

    // 5. Re-read payload to grab headline for notification
    const { data: issue } = await supabase
      .from('issues')
      .select('payload')
      .eq('id', issueId)
      .single()
    const headline = issue?.payload?.headline ?? issue?.payload?.throughline ?? ''

    // 6. Notify owner
    await notifyOwner({
      issueId,
      headline,
      noSignal: result.noSignal,
      noSignalReason: null,
    })

    return { ok: true, issueId, noSignal: result.noSignal, headline }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('issues')
      .update({ status: 'failed', failure_reason: msg })
      .eq('id', issueId)
    try {
      await notifyOwner({ issueId, headline: 'Pipeline FAILED', noSignal: false, noSignalReason: msg })
    } catch {
      /* notify failure is non-fatal */
    }
    return { ok: false, issueId, noSignal: false, error: msg }
  }
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await runPipeline()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

// Vercel cron sometimes POSTs; accept both.
export const POST = GET
