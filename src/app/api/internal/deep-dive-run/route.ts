// POST /api/internal/deep-dive-run { issueId, candidateId }
//
// Internal route that runs research → write → QA in sequence for a chosen
// deep-dive candidate. Called fire-and-forget from chooseCandidate() so the
// human pick at /review/deep-dive feels autonomous.
//
// Auth via CRON_SECRET (same scheme as /api/cron/weekly).

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { runStageDeepDiveResearch } from '@/inngest/stages/deep-dive-research'
import { runStageDeepDiveWrite } from '@/inngest/stages/deep-dive-write'
import { runStageDeepDiveQA } from '@/inngest/stages/deep-dive-qa'

// Long pipeline: research ~40s + write ~120s + QA up to ~140s with 2 retries.
// Pro tier max is 300s; budget accordingly.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true // dev mode
  const got = req.headers.get('authorization') ?? ''
  // Allow either the bearer token or x-internal-secret header (server-to-server).
  return got === `Bearer ${expected}` || req.headers.get('x-internal-secret') === expected
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { issueId?: string; candidateId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const { issueId, candidateId } = body
  if (!issueId || !candidateId) {
    return NextResponse.json(
      { error: 'issueId and candidateId required' },
      { status: 400 }
    )
  }

  const supabase = createAdminSupabaseClient()

  try {
    // 1. Research.
    await supabase.from('issues').update({ status: 'sourcing' }).eq('id', issueId)
    const research = await runStageDeepDiveResearch({ issueId, candidateId })

    // 2. Write.
    await supabase.from('issues').update({ status: 'drafting' }).eq('id', issueId)
    const write = await runStageDeepDiveWrite({ issueId })

    // 3. QA (auto-regenerate failing sections).
    const qa = await runStageDeepDiveQA({ issueId, maxRetries: 2 })

    // 4. Set final status. Per CLAUDE.md rule #1 (refined for deep-dive track),
    // the human gate sits at the candidate pick. The factual essay can ship
    // without a second human pass — but if QA fails, hold for review.
    const finalStatus = qa.finalPass ? 'drafted' : 'awaiting_human'
    await supabase.from('issues').update({ status: finalStatus }).eq('id', issueId)

    return NextResponse.json({
      ok: true,
      issueId,
      research,
      write,
      qa,
      finalStatus,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('issues')
      .update({ status: 'failed', failure_reason: msg })
      .eq('id', issueId)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

// GET allowed for manual triggers (curl) — same auth.
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(req.url)
  const issueId = url.searchParams.get('issueId')
  const candidateId = url.searchParams.get('candidateId')
  if (!issueId || !candidateId) {
    return NextResponse.json(
      { error: 'issueId and candidateId query params required' },
      { status: 400 }
    )
  }
  // Forward to POST body shape.
  return POST(
    new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ issueId, candidateId }),
    })
  )
}
