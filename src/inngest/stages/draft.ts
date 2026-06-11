// Stage 4 — Draft (deterministic template renderer).
//
// Takes the synthesizer-generated payload + the human-picked SHK calls and
// renders the locked 6-section markdown.
//
// Design decision: pure-template, no Anthropic call. The synthesizer already
// produced final prose for throughline / diff / persona / keep-skip. The
// drafter's job is to assemble + add the closure + write to disk.
// Benefits: zero cost, instant render, predictable structure, easier to debug.
// LLM polish layer can be added in Phase 4 if reader test demands it.

import { promises as fs } from 'fs'
import path from 'path'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { Beat, ChosenCalls, IssuePayload } from '../../../db/types/database'

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'issues')

const BEAT_HEADING: Record<Beat, string> = {
  'frontier-api': 'Frontier APIs',
  'india-infra': 'India Infra',
  regulation: 'Regulation',
  'indic-models': 'Indic Models',
  'talent-comp': 'Talent & Comp',
  'enterprise-deals': 'Enterprise Deals',
}

const BEAT_ORDER: Beat[] = [
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals',
]

export interface DraftResult {
  issueId: string
  issueNumber: number
  markdownPath: string
  wordCount: number
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

async function getNextIssueNumber(): Promise<number> {
  const supabase = createAdminSupabaseClient()
  const { count, error } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .in('status', ['drafted', 'awaiting_human'])
  if (error) throw new Error(`count issues: ${error.message}`)
  return (count ?? 0) + 1
}

function renderDiffSection(payload: IssuePayload): string {
  const ordered = [...payload.six_layer_diff].sort(
    (a, b) => BEAT_ORDER.indexOf(a.beat) - BEAT_ORDER.indexOf(b.beat)
  )
  if (ordered.length === 0) return ''
  return ordered
    .map((d) => `### ${BEAT_HEADING[d.beat] ?? d.beat}\n\n${d.bullet}`)
    .join('\n\n')
}

function renderShkSection(chosen: ChosenCalls): string {
  const block = (kind: 'ship' | 'hold' | 'kill'): string => {
    const c = chosen[kind]
    const label = `**${kind.toUpperCase()}**`
    if (!c) return `${label}: _(no call this week)_`
    return `${label} — ${c.label}\n\n${c.rationale}`
  }
  return [block('ship'), block('hold'), block('kill')].join('\n\n')
}

function renderKeepSkip(payload: IssuePayload): string {
  const keep = payload.keep_skip?.keep ?? []
  const skip = payload.keep_skip?.skip ?? []
  let out = ''
  if (keep.length > 0) {
    out += '**Keep**\n\n'
    for (const k of keep) out += `- ${k}\n`
    out += '\n'
  }
  if (skip.length > 0) {
    out += '**Skip**\n\n'
    for (const s of skip) out += `- ${s}\n`
  }
  return out.trim()
}

export function renderMarkdown(
  issueNumber: number,
  payload: IssuePayload,
  chosen: ChosenCalls,
  meta: { issueId: string; drafted_at?: string }
): { markdown: string; title: string } {
  const title = payload.throughline
  const header = `<!--
issue: ${issueNumber}
issue_id: ${meta.issueId}
drafted_at: ${meta.drafted_at ?? new Date().toISOString()}
-->\n\n`

  const sections: string[] = []

  // Title
  sections.push(`# ${title}\n\n${payload.throughline_lead}`)

  // 6-Layer Diff
  const diff = renderDiffSection(payload)
  if (diff) {
    sections.push(`## The 6-layer diff\n\n${diff}`)
  }

  // Persona translation
  if (payload.persona?.translation) {
    sections.push(
      `## What this means for you\n\n_${payload.persona.archetype}_\n\n${payload.persona.translation}\n\n**The math:**\n\n${payload.persona.inr_math}`
    )
  }

  // Ship / Hold / Kill (human picks)
  sections.push(`## Ship / Hold / Kill — this week\n\n${renderShkSection(chosen)}`)

  // Keep / Skip
  const ks = renderKeepSkip(payload)
  if (ks) sections.push(`## What to internalise vs. safely ignore\n\n${ks}`)

  // Set-aside observation (only if present and notable)
  if (payload.set_aside_observation) {
    sections.push(
      `## What dominated the noise\n\n${payload.set_aside_observation}`
    )
  }

  // Closure (locked phrase)
  sections.push(`_—— That's the shift. You're caught up._`)

  return {
    title,
    markdown: header + sections.join('\n\n'),
  }
}

export async function runStageDraft(opts: {
  issueId: string
}): Promise<DraftResult> {
  const supabase = createAdminSupabaseClient()

  // 1. Mark drafting.
  await supabase.from('issues').update({ status: 'drafting' }).eq('id', opts.issueId)

  // 2. Load issue + payload + chosen_calls.
  const { data: issue, error: iErr } = await supabase
    .from('issues')
    .select('id, payload, chosen_calls')
    .eq('id', opts.issueId)
    .single()
  if (iErr || !issue) throw new Error(`load issue: ${iErr?.message ?? 'not found'}`)
  if (!issue.payload) {
    throw new Error('Issue has no payload — run Stage 3 (synthesize) first.')
  }
  if (!issue.chosen_calls) {
    throw new Error(
      'Issue has no chosen_calls — pick Ship/Hold/Kill at /review/<issueId> first.'
    )
  }

  // 3. Render.
  const issueNumber = await getNextIssueNumber()
  const { markdown, title } = renderMarkdown(
    issueNumber,
    issue.payload,
    issue.chosen_calls,
    { issueId: opts.issueId }
  )

  // 4. Write file.
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const filename = `issue-${String(issueNumber).padStart(3, '0')}.md`
  const fullPath = path.join(OUTPUT_DIR, filename)
  const relPath = path.relative(process.cwd(), fullPath)
  await fs.writeFile(fullPath, markdown, 'utf-8')

  // 5. Update issue.
  await supabase
    .from('issues')
    .update({ status: 'drafted', markdown_path: relPath })
    .eq('id', opts.issueId)

  return {
    issueId: opts.issueId,
    issueNumber,
    markdownPath: relPath,
    wordCount: countWords(markdown),
  }
}

// Keep export name stable for any callers that imported the old (title, payload-less) signature.
export { renderMarkdown as renderIssueMarkdown }
