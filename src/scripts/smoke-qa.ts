// Smoke test: run Stage 3.5 (Editorial QA) against an existing issue's payload.
// Usage: npx tsx src/scripts/smoke-qa.ts <issueId> [--retries N]

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { runStageEditorialQA } from '../inngest/stages/editorial-qa'

loadDotenv({ path: '.env.local', override: true })

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function scoreBar(score: number): string {
  const filled = '█'.repeat(score)
  const empty = '░'.repeat(10 - score)
  return filled + empty
}

async function main() {
  const issueId = process.argv[2]
  if (!issueId) {
    console.error('Usage: npx tsx src/scripts/smoke-qa.ts <issueId> [--retries N]')
    process.exit(1)
  }
  const retriesArg = process.argv.indexOf('--retries')
  const maxRetries =
    retriesArg !== -1 && process.argv[retriesArg + 1]
      ? Number(process.argv[retriesArg + 1])
      : 2

  const missing = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
  ].filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  console.log(`Running Editorial QA on issue ${issueId} (maxRetries=${maxRetries})...\n`)

  const t0 = Date.now()
  const result = await runStageEditorialQA({ issueId, maxRetries })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('═══ SCORES ═══')
  for (const [dim, score] of Object.entries(result.scores)) {
    const status = score >= 8 ? '✓' : '✗'
    console.log(`${status} ${pad(dim, 12)} ${scoreBar(score)} ${score}/10`)
  }

  console.log('')
  console.log(`Final pass: ${result.finalPass ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`Attempts: ${result.attempts}`)
  if (result.regenerated.length) {
    console.log(`Regenerated: ${result.regenerated.join(', ')}`)
  }
  console.log(`Diagnosis: ${result.overallDiagnosis}`)

  console.log('')
  console.log(`Elapsed: ${elapsed}s`)
  console.log(
    `Usage: input=${result.cacheUsage.inputTokens}  cache_write=${result.cacheUsage.cacheCreationInputTokens}  cache_read=${result.cacheUsage.cacheReadInputTokens}  output=${result.cacheUsage.outputTokens}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
