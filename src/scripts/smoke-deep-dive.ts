// Smoke test: run the deep-dive pipeline end-to-end against a chosen candidate.
//
// Usage: npx tsx src/scripts/smoke-deep-dive.ts <candidate_id>
//
// Steps:
//   1. Look up candidate; require it has chosen_issue_id (or create one)
//   2. runStageDeepDiveResearch
//   3. runStageDeepDiveWrite
//   4. runStageDeepDiveQA
//   5. Print scores + elapsed + render markdown to output/deep-dives/dd-<prefix>.md

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { promises as fs } from 'fs'
import path from 'path'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { runStageDeepDiveResearch } from '../inngest/stages/deep-dive-research'
import { runStageDeepDiveWrite } from '../inngest/stages/deep-dive-write'
import { runStageDeepDiveQA } from '../inngest/stages/deep-dive-qa'
import type { DeepDivePayload } from '../../db/types/database'

loadDotenv({ path: '.env.local', override: true })

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'deep-dives')

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function scoreBar(score: number): string {
  return '█'.repeat(score) + '░'.repeat(10 - score)
}

function renderDeepDiveMarkdown(payload: DeepDivePayload): string {
  const parts: string[] = []
  parts.push(`# ${payload.title}\n`)
  parts.push(`_${payload.subtitle}_\n`)
  parts.push(`---\n`)
  parts.push(payload.cold_open + '\n')
  parts.push(`## The assumption\n`)
  parts.push(payload.assumption + '\n')
  for (const s of payload.evidence_sections) {
    parts.push(`## ${s.heading}\n`)
    parts.push(s.body + '\n')
  }
  parts.push(`## The Indian-context twist\n`)
  parts.push(payload.india_twist + '\n')
  parts.push(`## What to do Monday\n`)
  for (const a of payload.monday_actions) {
    parts.push(`${a.number}. ${a.action}`)
  }
  parts.push('')
  parts.push(`## What I might be wrong about\n`)
  for (const c of payload.counter_positions) {
    parts.push(`**${c.claim}** ([source](${c.best_link}))`)
    parts.push('')
    parts.push(c.steel_man)
    parts.push('')
  }
  parts.push(`## Further reading\n`)
  for (const r of payload.further_reading) {
    parts.push(`- [${r.annotation}](${r.url})`)
  }
  return parts.join('\n')
}

async function main() {
  const candidateId = process.argv[2]
  if (!candidateId) {
    console.error('Usage: npx tsx src/scripts/smoke-deep-dive.ts <candidate_id>')
    process.exit(1)
  }
  const missing = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
  ].filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  const supabase = createAdminSupabaseClient()

  // 1. Load candidate; ensure it has an issue.
  const { data: candidate, error: candErr } = await supabase
    .from('deep_dive_candidates')
    .select('*')
    .eq('id', candidateId)
    .single()
  if (candErr || !candidate) {
    console.error(`Candidate ${candidateId} not found: ${candErr?.message}`)
    process.exit(1)
  }

  let issueId = candidate.chosen_issue_id
  if (!issueId) {
    console.log('No issue linked to this candidate yet — creating one...')
    const { data: created, error: createErr } = await supabase
      .from('issues')
      .insert({ status: 'sourcing', issue_type: 'deep_dive' })
      .select('id')
      .single()
    if (createErr || !created) {
      console.error(`create issue: ${createErr?.message}`)
      process.exit(1)
    }
    issueId = created.id
    await supabase
      .from('deep_dive_candidates')
      .update({ chosen: true, chosen_issue_id: issueId })
      .eq('id', candidateId)
  }

  console.log(`Candidate: ${candidate.assumption_challenged}`)
  console.log(`Issue: ${issueId}`)
  console.log('')

  const t0 = Date.now()

  // 2. Research.
  console.log('━━━ Stage 1/3 · Research ━━━')
  const r0 = Date.now()
  const research = await runStageDeepDiveResearch({ issueId, candidateId })
  console.log(
    `  ✓ ${research.evidenceTripleCount} triples · ${research.counterPositionCount} counters · ${research.indiaAnchorCount} India anchors  (${((Date.now() - r0) / 1000).toFixed(1)}s)`
  )

  // 3. Write.
  console.log('━━━ Stage 2/3 · Write ━━━')
  const w0 = Date.now()
  const write = await runStageDeepDiveWrite({ issueId })
  console.log(
    `  ✓ ${write.wordCount} words · ${write.sectionCount} evidence sections · audience=${write.primaryAudience}  (${((Date.now() - w0) / 1000).toFixed(1)}s)`
  )

  // 4. QA.
  console.log('━━━ Stage 3/3 · QA ━━━')
  const q0 = Date.now()
  const qa = await runStageDeepDiveQA({ issueId, maxRetries: 2 })
  console.log(`  Attempts: ${qa.attempts}  (${((Date.now() - q0) / 1000).toFixed(1)}s)`)
  console.log('')
  console.log('  Scores:')
  for (const [dim, score] of Object.entries(qa.scores)) {
    const mark = score >= 8 ? '✓' : '✗'
    console.log(`    ${mark} ${pad(dim, 28)} ${scoreBar(score)} ${score}/10`)
  }
  console.log('')
  console.log(`  Final pass: ${qa.finalPass ? '✓ PASS' : '✗ FAIL'}`)
  if (qa.regenerated.length) {
    console.log(`  Regenerated: ${qa.regenerated.join(', ')}`)
  }
  console.log(`  Diagnosis: ${qa.overallDiagnosis}`)

  // 5. Render markdown for human reading.
  const { data: issueAfter } = await supabase
    .from('issues')
    .select('payload')
    .eq('id', issueId)
    .single()
  const payload = issueAfter?.payload as DeepDivePayload | null
  if (payload) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    const filename = `dd-${issueId.slice(0, 8)}.md`
    const fullPath = path.join(OUTPUT_DIR, filename)
    await fs.writeFile(fullPath, renderDeepDiveMarkdown(payload), 'utf-8')
    console.log('')
    console.log(`  Markdown written: ${path.relative(process.cwd(), fullPath)}`)
    console.log('')
    console.log('━━━ ESSAY PREVIEW ━━━')
    console.log('')
    console.log(`# ${payload.title}`)
    console.log(`_${payload.subtitle}_`)
    console.log('')
    console.log(payload.cold_open)
    console.log('')
    console.log('— [truncated; full essay in file above] —')
  }

  console.log('')
  console.log('━'.repeat(80))
  console.log(`Total elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`Issue id: ${issueId}`)
  console.log(`Reader URL: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003'}/issue/${issueId}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
