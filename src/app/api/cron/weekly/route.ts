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
import { sendIssueToSubscribers } from '@/lib/email-send'

// Quality thresholds:
//   AUTO_SEND_FLOOR — minimum score in EVERY dimension to auto-send to
//     subscribers without any human click. Set high (9) so only confidently
//     strong issues ship blind.
//   AUTO_DRAFT_FLOOR — minimum score to draft + auto-pick SHK; owner can
//     one-click send from /review. 8 matches the pass threshold inside QA.
//   Below AUTO_DRAFT_FLOOR — status='awaiting_human', owner edits required.
const AUTO_SEND_FLOOR = 9
const AUTO_DRAFT_FLOOR = 8

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

type Outcome = 'auto_sent' | 'drafted' | 'awaiting_human'

async function notifyOwner(opts: {
  issueId: string
  headline: string
  noSignal: boolean
  noSignalReason?: string | null
  qa?: QualityVerdict | null
  outcome?: Outcome
  sendStats?: { attempted: number; sent: number; failed: number } | null
}) {
  const key = process.env.RESEND_API_KEY
  const to = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
  const from = process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getaisignal.org'
  if (!key) return
  const resend = new Resend(key)
  const reviewUrl = `${site}/review/${opts.issueId}`
  const issueUrl = `${site}/issue/${opts.issueId}`

  const scoresLine = opts.qa
    ? Object.entries(opts.qa.scores)
        .map(([k, v]) => `${k}:${v}`)
        .join(' · ')
    : ''

  // Subject reflects what actually happened, not what was ready
  const subject = opts.noSignal
    ? `AI Signal · No signal this week`
    : opts.outcome === 'auto_sent'
      ? `AI Signal · Sent ✓ "${opts.headline}" (${opts.sendStats?.sent ?? 0} subscribers)`
      : opts.outcome === 'awaiting_human'
        ? `AI Signal · Needs your eyes: "${opts.headline}"`
        : `AI Signal · Ready to send: "${opts.headline}"`

  const accent = opts.outcome === 'auto_sent' ? '#0f4c3a' : opts.outcome === 'awaiting_human' ? '#d4622a' : '#8a7968'

  const qaBlock = opts.qa
    ? `<p style="margin:18px 0;padding:14px 16px;background:#efe8da;border-left:4px solid ${accent};font-family:monospace;font-size:13px;line-height:1.55;">
         Editorial QA &mdash; <strong>${opts.outcome === 'auto_sent' ? 'AUTO-SENT (all ≥9)' : opts.outcome === 'drafted' ? 'DRAFTED (8-8.99 — your one click sends)' : 'BLOCKED (some &lt;8)'}</strong><br/>
         ${scoresLine}<br/>
         ${opts.qa.regenerated.length ? `Regenerated: ${opts.qa.regenerated.join(', ')}<br/>` : ''}
         <em>${opts.qa.diagnosis}</em>
       </p>`
    : ''

  const actionBlock =
    opts.outcome === 'auto_sent'
      ? `<p><strong>This week's issue is already in your subscribers' inboxes.</strong></p>
         <p>Read what they got: <a href="${issueUrl}">${issueUrl}</a></p>
         <p>If something feels off after reading, tell me — that's the post-mortem signal we use to tighten the rubric.</p>
         <p>Recall this issue (pulls future-week deliveries — past sends can't be unsent): <a href="${reviewUrl}">${reviewUrl}</a></p>`
      : opts.outcome === 'awaiting_human'
        ? `<p>Open <a href="${reviewUrl}">${reviewUrl}</a> to fix the flagged sections + send.</p>`
        : `<p>SHK is auto-picked. One click to send from <a href="${reviewUrl}">${reviewUrl}</a>.</p>`

  const html = opts.noSignal
    ? `<p>The synthesizer found no genuine non-obvious shift this week.</p><p><em>${opts.noSignalReason ?? ''}</em></p><p>Review at <a href="${reviewUrl}">${reviewUrl}</a> if you want to override.</p>`
    : `<p>This week's brief: <strong>${opts.headline}</strong></p>${qaBlock}${actionBlock}`
  const text = opts.noSignal
    ? `No signal this week.\n${opts.noSignalReason ?? ''}\nReview: ${reviewUrl}`
    : `${opts.outcome === 'auto_sent' ? 'AUTO-SENT' : opts.outcome === 'awaiting_human' ? 'NEEDS YOUR EYES' : 'DRAFTED'}\n${opts.headline}\n${scoresLine}\n${opts.qa?.diagnosis ?? ''}\nView: ${issueUrl}\nReview: ${reviewUrl}`
  await resend.emails.send({ from, to, subject, html, text })
}

async function runPipeline(): Promise<{
  ok: boolean
  issueId: string
  noSignal: boolean
  headline?: string
  outcome?: Outcome
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

    // 6. Quality gate — three tiers based on minimum score across dimensions.
    const minScore = Math.min(...Object.values(qa.scores))
    let outcome: 'auto_sent' | 'drafted' | 'awaiting_human'
    let sendStats: { attempted: number; sent: number; failed: number } | null = null

    if (minScore >= AUTO_SEND_FLOOR) {
      // ALL ≥9 — confident enough to auto-send. Per CLAUDE.md rule #1, SHK
      // is meant to be human-picked; user has explicitly authorized auto-send
      // when QA gates pass at 9+. Auto-pick first SHK candidate and send.
      const { data: postQA } = await supabase
        .from('issues')
        .select('payload')
        .eq('id', issueId)
        .single()
      const p = postQA?.payload
      // Tag every cron-auto-promoted pick with source='ai' so the renderer can
      // refuse the Ship-tier bright-lime treatment (CLAUDE.md rule #1 reserves
      // that for human picks — the tiered auto-send path is still authorized
      // but the visual signal must be honest).
      const aiPick = (
        v: { label: string; rationale: string } | undefined
      ) => (v ? { ...v, source: 'ai' as const } : null)
      const chosenCalls = p?.shk_candidates
        ? {
            ship: aiPick(p.shk_candidates.ship?.[0]),
            hold: aiPick(p.shk_candidates.hold?.[0]),
            kill: aiPick(p.shk_candidates.kill?.[0]),
          }
        : { ship: null, hold: null, kill: null }
      await supabase
        .from('issues')
        .update({ status: 'drafted', chosen_calls: chosenCalls })
        .eq('id', issueId)

      // Number this issue for the email template
      const { count } = await supabase
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .in('status', ['drafted', 'awaiting_human'])
        .lte('created_at', new Date().toISOString())
      try {
        const send = await sendIssueToSubscribers({
          issueId,
          issueNumber: count ?? 1,
          issueCreatedAt: new Date().toISOString(),
          payload: p!,
          chosen: chosenCalls,
        })
        sendStats = { attempted: send.attempted, sent: send.sent, failed: send.failed }
        outcome = 'auto_sent'
      } catch (err) {
        // Send failed — downgrade to drafted so owner can retry from /review.
        console.warn('auto-send failed:', err)
        outcome = 'drafted'
      }
    } else if (minScore >= AUTO_DRAFT_FLOOR) {
      // 8-8.99 — draft + auto-pick SHK + owner one-click to send.
      const { data: postQA } = await supabase
        .from('issues')
        .select('payload')
        .eq('id', issueId)
        .single()
      const p = postQA?.payload
      if (p?.shk_candidates) {
        const aiPick = (
          v: { label: string; rationale: string } | undefined
        ) => (v ? { ...v, source: 'ai' as const } : null)
        await supabase
          .from('issues')
          .update({
            status: 'drafted',
            chosen_calls: {
              ship: aiPick(p.shk_candidates.ship?.[0]),
              hold: aiPick(p.shk_candidates.hold?.[0]),
              kill: aiPick(p.shk_candidates.kill?.[0]),
            },
          })
          .eq('id', issueId)
      }
      outcome = 'drafted'
    } else {
      // <8 — quality gate failed, requires human edits.
      await supabase
        .from('issues')
        .update({ status: 'awaiting_human' })
        .eq('id', issueId)
      outcome = 'awaiting_human'
    }

    // 7. Re-read payload to grab headline for notification
    const { data: issue } = await supabase
      .from('issues')
      .select('payload')
      .eq('id', issueId)
      .single()
    const headline = issue?.payload?.headline ?? issue?.payload?.throughline ?? ''

    // 8. Notify owner — different message per outcome
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
      outcome,
      sendStats,
    })

    return { ok: true, issueId, noSignal: false, headline, outcome }
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
