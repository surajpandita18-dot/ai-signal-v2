'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function chooseCandidate(candidateId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()

  // Create the deep-dive issue row. status='sourcing' kicks off the
  // research + writer + QA pipeline (wired in PR #3).
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

  revalidatePath('/review/deep-dive')
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
