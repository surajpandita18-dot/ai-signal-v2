// Send a deep-dive essay as a TEST email to NEWSLETTER_OWNER_EMAIL only.
// Uses the same teaser renderer as sendDeepDiveToSubscribers but bypasses
// the subscribers table.
//
// Usage: npx tsx src/scripts/send-deep-dive-test.ts <issueId>

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { Resend } from 'resend'
import { createAdminSupabaseClient } from '../lib/supabase-admin'
import { renderTeaserHtml } from '../lib/deep-dive-email'
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
  const rendered = renderTeaserHtml({
    issueId,
    payload,
    issueCreatedAt: issue.created_at,
  })

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const res = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>',
    to: owner,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  })
  if (res.error) {
    console.error('send failed:', res.error.message)
    process.exit(1)
  }
  console.log(`✓ Sent test deep-dive to ${owner}`)
  console.log(`  id: ${res.data?.id}`)
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-signal-v2.vercel.app'
  console.log(`  url: ${site}/issue/${issueId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
