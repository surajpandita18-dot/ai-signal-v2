// Smoke test: create an issue, run Stage 2 clustering against existing raw_items.
// Usage:  pnpm smoke:cluster
// Assumes Stage 1 has been run recently (raw_items table is populated).

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { runStageCluster } from '../inngest/stages/cluster'

loadDotenv({ path: '.env.local', override: true })

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

async function main() {
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

  // Create a fresh issue row to claim items into.
  const { data: issue, error: createErr } = await supabase
    .from('issues')
    .insert({ status: 'clustering' })
    .select('id')
    .single()
  if (createErr || !issue) {
    console.error('Failed to create issue:', createErr)
    process.exit(1)
  }
  console.log(`Created issue ${issue.id}. Clustering...\n`)

  const t0 = Date.now()
  let result
  try {
    result = await runStageCluster({ issueId: issue.id })
  } catch (err) {
    await supabase
      .from('issues')
      .update({ status: 'failed', failure_reason: err instanceof Error ? err.message : String(err) })
      .eq('id', issue.id)
    throw err
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`Items considered (in window):   ${result.itemsConsidered}`)
  console.log(`Items sent to model:            ${result.itemsSentToModel}`)
  console.log(`Clusters written:               ${result.clustersWritten}`)
  console.log(`Set-aside clusters:             ${result.setAsideCount}`)
  console.log(`Active clusters:                ${result.clustersWritten - result.setAsideCount}`)
  console.log(`Elapsed:                        ${elapsed}s`)
  console.log()
  console.log('TOP CLUSTERS (by weighted convergence):')
  console.log('-'.repeat(80))

  const head = `${pad('CONV', 5)} ${pad('SIZE', 5)} LABEL`
  console.log(head)
  console.log('-'.repeat(80))
  for (const c of result.topClusters) {
    console.log(`${pad(String(c.convergence), 5)} ${pad(String(c.size), 5)} ${c.label}`)
    console.log(`            sources: ${c.sources.join(', ')}`)
  }

  console.log()
  console.log(`Issue id: ${result.issueId}`)
  console.log(`Inspect in Supabase:`)
  console.log(`  Table Editor → clusters → filter issue_id = ${result.issueId}`)
  console.log(`  Table Editor → raw_items → filter issue_id = ${result.issueId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
