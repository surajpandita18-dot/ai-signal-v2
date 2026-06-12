'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function chooseCandidate(candidateId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()

  // Create the deep-dive issue row. status='sourcing' kicks off the
  // research + writer + QA pipeline below.
  const { data: issue, error: createErr } = await supabase
    .from('issues')
    .insert({ status: 'sourcing', issue_type: 'deep_dive' })
    .select('id')
    .single()
  if (createErr || !issue) {
    throw new Error(`create deep-dive issue: ${createErr?.message ?? 'no row'}`)
  }

  // Mark the candidate as chosen, link to the new issue.
  const { error: updErr } = await supabase
    .from('deep_dive_candidates')
    .update({ chosen: true, chosen_issue_id: issue.id })
    .eq('id', candidateId)
  if (updErr) {
    throw new Error(`mark candidate chosen: ${updErr.message}`)
  }

  // Fire-and-forget: kick off research → write → QA on the internal route.
  // The chooseCandidate UX should return immediately so the human gate doesn't
  // block on a 3-5 min pipeline. Errors are persisted to issues.status='failed'
  // by the route itself and surface on next reload.
  triggerDeepDivePipeline(issue.id, candidateId).catch((err) => {
    console.warn(`deep-dive pipeline trigger failed: ${err?.message ?? err}`)
  })

  revalidatePath('/review/deep-dive')
}

async function triggerDeepDivePipeline(issueId: string, candidateId: string) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3003')
  const url = `${site}/api/internal/deep-dive-run`
  const secret = process.env.CRON_SECRET
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret) headers['x-internal-secret'] = secret
  // No await on res so the server action returns fast. The fetch promise
  // still has to resolve for Node to flush; we intentionally don't await.
  void fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ issueId, candidateId }),
    keepalive: true,
  }).catch((err) => {
    console.warn(`internal deep-dive-run fetch failed: ${err?.message ?? err}`)
  })
}

export async function rejectCandidate(
  candidateId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('deep_dive_candidates')
    .update({ rejection_reason: reason || 'rejected' })
    .eq('id', candidateId)
  if (error) {
    throw new Error(`reject candidate: ${error.message}`)
  }
  revalidatePath('/review/deep-dive')
}
