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
  // The renderer emits a `__UNSUB_TOKEN__` placeholder in the visible footer
  // UNSUBSCRIBE link so the batch sender can substitute a real per-recipient
  // token. Test sends bypass the batch path, so the placeholder would ship
  // verbatim — preview the link with a synthetic token and fail loudly if the
  // placeholder is left over (the batch discipline mirror).
  const html = opts.html.replaceAll('__UNSUB_TOKEN__', 'preview')
  if (html.includes('__UNSUB_TOKEN__')) {
    throw new Error('sendTestEmail: __UNSUB_TOKEN__ placeholder leaked into rendered HTML')
  }
  const res = await resend.emails.send({
    from: getFrom(),
    to: opts.to,
    subject: opts.subject,
    html,
    text: opts.text,
    headers: {
      // Test sends use the mailto-only fallback so an owner preview can be
      // unsubscribed via reply. RFC 8058 one-click POST requires an HTTPS URI;
      // pairing it with a mailto-only List-Unsubscribe is non-conforming and
      // triggers Gmail/Yahoo bulk-sender mis-classification, so the
      // List-Unsubscribe-Post header is deliberately omitted on the test path.
      'List-Unsubscribe': `<mailto:unsubscribe@${siteHost()}?subject=unsubscribe>`,
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
  // NOTE: the door-throw on missing chosen.ship was removed because the cron
  // route (src/app/api/cron/weekly/route.ts) explicitly auto-sends ≥9-score
  // issues by copying shk_candidates into chosen_calls — that path is authorized
  // per the tiered-send model. The TRUE rule-#1 enforcement needs a provenance
  // field on ChosenCall (`source: 'human' | 'ai'`) plus a renderer that demotes
  // visual Ship-tier treatment for `'ai'` rows even when chosen is populated.
  // Tracked as task #104 (added below). For now, isHumanPick on the Glance row
  // can falsely return true on cron-auto-picks — a temporary correctness gap.

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
  // RFC 8058 compliance: drop tokenless recipients so the List-Unsubscribe URL
  // never renders as `?token=undefined`. Record the skip for backfill visibility.
  const all: Array<{ email: string; token: string | null | undefined }> = (subs ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => ({ email: s.email, token: s.unsubscribe_token })
  )
  const recipients: Array<{ email: string; token: string }> = []
  for (const r of all) {
    if (!r.token) {
      result.failed += 1
      result.errors.push({ email: r.email, error: 'missing unsubscribe_token' })
      continue
    }
    recipients.push({ email: r.email, token: r.token })
  }
  if (recipients.length === 0) {
    return result
  }

  // Batch by BATCH_SIZE
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    const emails = chunk.map((r) => {
      // Single encoded form for both body link + List-Unsubscribe header — RFC 8058
      // requires Gmail's one-click POST and the visible footer link to resolve to
      // the same record.
      const safeToken = encodeURIComponent(r.token)
      const unsubUrl = `${siteUrl()}/unsubscribe?token=${safeToken}`
      return {
        from: getFrom(),
        to: r.email,
        subject: rendered.subject,
        html: rendered.html.replaceAll('__UNSUB_TOKEN__', safeToken),
        text: rendered.text,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })
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
    // Per-recipient accounting: Resend can return per-message errors inside
    // batchRes.data even when the batch as a whole reports no top-level error.
    // Walking the entries pairs each one back to its recipient.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = ((batchRes.data as any)?.data ?? []) as Array<{
      id?: string
      error?: { message?: string } | string
    }>
    for (let idx = 0; idx < chunk.length; idx += 1) {
      const r = chunk[idx]
      const entry = entries[idx]
      const rawErr = entry?.error
      const entryErr: string | undefined =
        rawErr == null
          ? undefined
          : typeof rawErr === 'string'
            ? rawErr
            : (rawErr.message ?? 'unknown error')
      if (!entry || !entry.id || entryErr) {
        result.failed += 1
        result.errors.push({
          email: r.email,
          error: entryErr ?? 'no id returned',
        })
      } else {
        result.sent += 1
      }
    }
  }

  return result
}
