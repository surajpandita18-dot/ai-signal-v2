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
import { runStageEditorialQA } from '@/inngest/stages/editorial-qa'

// Long pipeline (source ~30s + cluster ~50s + synth ~150s + QA ~120s). Pro = 300s.
// QA may push us past 300s on retries; budget tightly.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  // In dev, allow unauthenticated for local testing.
  if (!expected) return true
  const got = req.headers.get('authorization') ?? ''
  return got === `Bearer ${expected}`
}

interface QualityVerdict {
  pass: boolean
  scores: Record<string, number>
  diagnosis: string
  regenerated: string[]
}

async function notifyOwner(opts: {
  issueId: string
  headline: string
  noSignal: boolean
  noSignalReason?: string | null
  qa?: QualityVerdict | null
}) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
  const from = process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getaisignal.org'
  if (!key) return
  const resend = new Resend(key)
  const reviewUrl = `${site}/review/${opts.issueId}`

  const scoresLine = opts.qa
    ? Object.entries(opts.qa.scores)
        .map(([k, v]) => `${k}:${v}`)
        .join(' · ')
    : ''
  const subject = opts.noSignal
    ? `AI Signal · No signal this week`
    : opts.qa?.pass === false
      ? `AI Signal · Needs your eyes: "${opts.headline}"`
      : opts.qa?.pass === true
        ? `AI Signal · Ready to send: "${opts.headline}"`
        : `AI Signal · Issue ready for your review: "${opts.headline}"`

  const qaBlock = opts.qa
    ? `<p style="margin:18px 0;padding:14px 16px;background:#efe8da;border-left:4px solid ${opts.qa.pass ? '#0f4c3a' : '#d4622a'};font-family:monospace;font-size:13px;line-height:1.55;">
         Editorial QA &mdash; ${opts.qa.pass ? '<strong>PASS ✓</strong>' : '<strong>FAIL ✗</strong>'}<br/>
         ${scoresLine}<br/>
         ${opts.qa.regenerated.length ? `Regenerated: ${opts.qa.regenerated.join(', ')}<br/>` : ''}
         <em>${opts.qa.diagnosis}</em>
       </p>`
    : ''

  const html = opts.noSignal
    ? `<p>The synthesizer found no genuine non-obvious shift this week.</p><p><em>${opts.noSignalReason ?? ''}</em></p><p>Review at <a href="${reviewUrl}">${reviewUrl}</a> if you want to override.</p>`
    : `<p>This week's issue is generated. <strong>${opts.headline}</strong></p>${qaBlock}<p><a href="${reviewUrl}">Open review →</a></p><p>${opts.qa?.pass === true ? 'All rubric dimensions scored ≥8. The SHK calls are auto-picked. One click in the review screen to send.' : opts.qa?.pass === false ? 'One or more rubric dimensions scored below 8. Tighten before sending — the diagnosis above tells you which sections to look at.' : 'Pick SHK in the review screen, then send.'}</p>`
  const text = opts.noSignal
    ? `No signal this week.\n${opts.noSignalReason ?? ''}\nReview: ${reviewUrl}`
    : `${opts.headline}\n${scoresLine}\n${opts.qa?.diagnosis ?? ''}\nReview: ${reviewUrl}`
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

    if (result.noSignal) {
      await notifyOwner({ issueId, headline: '', noSignal: true, noSignalReason: null })
      return { ok: true, issueId, noSignal: true }
    }

    // 5. Stage 3.5 — Editorial QA (auto-regenerate failing sections)
    const qa = await runStageEditorialQA({ issueId, maxRetries: 2 })

    // 6. Quality gate — auto-pick SHK only if QA passed all dimensions
    if (qa.finalPass) {
      const { data: postQA } = await supabase
        .from('issues')
        .select('payload')
        .eq('id', issueId)
        .single()
      const p = postQA?.payload
      if (p?.shk_candidates) {
        await supabase
          .from('issues')
          .update({
            status: 'drafted',
            chosen_calls: {
              ship: p.shk_candidates.ship?.[0] ?? null,
              hold: p.shk_candidates.hold?.[0] ?? null,
              kill: p.shk_candidates.kill?.[0] ?? null,
            },
          })
          .eq('id', issueId)
      }
    } else {
      // Failed quality gate — block auto-send; queue for human review.
      await supabase
        .from('issues')
        .update({ status: 'awaiting_human' })
        .eq('id', issueId)
    }

    // 7. Re-read payload to grab headline for notification
    const { data: issue } = await supabase
      .from('issues')
      .select('payload')
      .eq('id', issueId)
      .single()
    const headline = issue?.payload?.headline ?? issue?.payload?.throughline ?? ''

    // 8. Notify owner with quality verdict embedded
    await notifyOwner({
      issueId,
      headline,
      noSignal: false,
      noSignalReason: null,
      qa: {
        pass: qa.finalPass,
        scores: qa.scores,
        diagnosis: qa.overallDiagnosis,
        regenerated: qa.regenerated,
      },
    })

    return { ok: true, issueId, noSignal: false, headline }
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
