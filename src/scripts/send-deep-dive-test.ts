// Send a deep-dive essay as a TEST email to NEWSLETTER_OWNER_EMAIL only.
// Routes through sendDeepDiveTestEmail() so the substitution + leak-assertion +
// RFC-8058-safe header discipline is inherited automatically. No duplication.
//
// Usage: npx tsx src/scripts/send-deep-dive-test.ts <issueId>

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { sendDeepDiveTestEmail } from '../lib/deep-dive-email'
import type { DeepDivePayload } from '../../db/types/database'

loadDotenv({ path: '.env.local', override: true })

async function main() {
  const issueId = process.argv[2]
  if (!issueId) {
    console.error('Usage: npx tsx src/scripts/send-deep-dive-test.ts <issueId>')
    process.exit(1)
  }
  const missing = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
  ].filter((k) => !process.env[k])
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  const supabase = createAdminSupabaseClient()
  const { data: issue, error } = await supabase
    .from('issues')
    .select('id, payload, created_at, issue_type')
    .eq('id', issueId)
    .single()
  if (error || !issue) {
    console.error('Issue not found:', error?.message)
    process.exit(1)
  }
  if (issue.issue_type !== 'deep_dive') {
    console.error(`Issue is type "${issue.issue_type}", not deep_dive`)
    process.exit(1)
  }
  const payload = issue.payload as unknown as DeepDivePayload | null
  if (!payload || !payload.evidence_sections) {
    console.error('Deep-dive payload missing or incomplete — pipeline not done?')
    process.exit(1)
  }

  const owner = process.env.NEWSLETTER_OWNER_EMAIL ?? 'suraj.pandita18@gmail.com'
  try {
    const res = await sendDeepDiveTestEmail({
      to: owner,
      input: {
        issueId,
        payload,
        issueCreatedAt: issue.created_at,
      },
    })
    console.log(`✓ Sent test deep-dive to ${owner}`)
    console.log(`  id: ${res.id}`)
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'
    console.log(`  url: ${site}/issue/${issueId}`)
  } catch (e) {
    console.error('send failed:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
