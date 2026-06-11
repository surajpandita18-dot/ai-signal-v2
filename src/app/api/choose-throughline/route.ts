// POST /api/choose-throughline
// Body: { issueId, picks: { ship: ShkCall | null, hold: ShkCall | null, kill: ShkCall | null } }
// Stores the human's Ship/Hold/Kill picks on the issue, fires Stage 4 drafter,
// returns markdown path. Pure-deterministic drafter — no Anthropic latency at this step.
//
// Naming note: route kept as "choose-throughline" for URL stability. The picks
// are now Ship/Hold/Kill calls, not a throughline candidate id.

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { runStageDraft } from '@/inngest/stages/draft'
import type { ChosenCalls } from '../../../../db/types/database'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

interface ShkPick {
  label: string
  rationale: string
}

interface PostBody {
  issueId?: string
  picks?: {
    ship?: ShkPick | null
    hold?: ShkPick | null
    kill?: ShkPick | null
  }
}

function normalizePick(p: ShkPick | null | undefined): ShkPick | null {
  if (!p) return null
  const label = (p.label ?? '').trim()
  const rationale = (p.rationale ?? '').trim()
  if (!label) return null
  return { label, rationale }
}

export async function POST(req: Request) {
  let body: PostBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { issueId, picks } = body
  if (!issueId) return NextResponse.json({ error: 'issueId required' }, { status: 400 })
  if (!picks) return NextResponse.json({ error: 'picks required' }, { status: 400 })

  const chosen: ChosenCalls = {
    ship: normalizePick(picks.ship),
    hold: normalizePick(picks.hold),
    kill: normalizePick(picks.kill),
  }

  // Require at least one non-null pick.
  if (!chosen.ship && !chosen.hold && !chosen.kill) {
    return NextResponse.json(
      { error: 'at least one of ship/hold/kill must be picked or written' },
      { status: 400 }
    )
  }

  const supabase = createAdminSupabaseClient()

  const { error: updErr } = await supabase
    .from('issues')
    .update({ chosen_calls: chosen })
    .eq('id', issueId)
  if (updErr) return NextResponse.json({ error: `save picks: ${updErr.message}` }, { status: 500 })

  let result
  try {
    result = await runStageDraft({ issueId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('issues')
      .update({ status: 'failed', failure_reason: `draft failed: ${msg}` })
      .eq('id', issueId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    issueId: result.issueId,
    issueNumber: result.issueNumber,
    markdownPath: result.markdownPath,
    wordCount: result.wordCount,
  })
}
