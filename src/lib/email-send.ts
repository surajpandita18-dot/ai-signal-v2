// Resend sending utilities. Reads RESEND_API_KEY at call time so test routes
// can stub it. Batches at 100 recipients per call (Resend cap).

import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { renderEmailHtml, type EmailTemplateInput } from '@/lib/email-template'

const BATCH_SIZE = 100

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  return new Resend(key)
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getaisignal.org'
}

export interface SendResult {
  attempted: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

/**
 * Send a single test email to a specific address — used for owner preview
 * and dev smoke tests. Does NOT touch the subscribers table.
 */
export async function sendTestEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
  preheader?: string
}): Promise<{ id: string }> {
  const resend = getResend()
  const res = await resend.emails.send({
    from: getFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: {
      // RFC 8058 one-click unsubscribe — Gmail/Yahoo bulk-sender requirement
      'List-Unsubscribe': `<mailto:unsubscribe@${siteHost()}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  if (res.error) throw new Error(`Resend: ${res.error.message}`)
  return { id: res.data?.id ?? '' }
}

function siteHost(): string {
  try {
    return new URL(siteUrl()).host
  } catch {
    return 'getaisignal.org'
  }
}

/**
 * Send an issue to all active subscribers. Idempotent: if issue already has
 * `markdown_path` populated and was sent before, we re-send (overwrites prior
 * delivery — Phase 4 we'll dedupe via a `deliveries` table).
 */
export async function sendIssueToSubscribers(input: EmailTemplateInput): Promise<SendResult> {
  const supabase = createAdminSupabaseClient()
  const resend = getResend()

  // Fetch active subscribers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs, error } = await (supabase.from('subscribers' as any) as any)
    .select('email, unsubscribe_token')
    .eq('status', 'active')
  if (error) throw new Error(`load subscribers: ${error.message}`)

  // Pre-render once — same HTML/text body for everyone.
  const rendered = renderEmailHtml({ ...input, siteUrl: siteUrl() })

  const result: SendResult = { attempted: 0, sent: 0, failed: 0, errors: [] }
  const recipients: Array<{ email: string; token: string }> = (subs ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => ({ email: s.email, token: s.unsubscribe_token })
  )
  if (recipients.length === 0) {
    return result
  }

  // Batch by BATCH_SIZE
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    const emails = chunk.map((r) => ({
      from: getFrom(),
      to: r.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        'List-Unsubscribe': `<${siteUrl()}/unsubscribe?token=${r.token}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }))
    result.attempted += chunk.length
    const batchRes = await resend.batch.send(emails)
    if (batchRes.error) {
      // Entire batch failed — record per-recipient
      for (const r of chunk) {
        result.failed += 1
        result.errors.push({ email: r.email, error: batchRes.error.message })
      }
      continue
    }
    result.sent += chunk.length
  }

  return result
}
