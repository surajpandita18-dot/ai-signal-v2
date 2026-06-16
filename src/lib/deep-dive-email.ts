// Deep-dive email — Figr design v3 (2026-06-13).
// Teaser: title + subtitle + cold open + the assumption pull-quote + lime CTA.
// Long-form essay lives on the web.
//
// ARCHITECTURAL DEBT (flagged 2026-06-14): like email-template.ts, this file
// hand-builds HTML from DeepDivePayload instead of consuming RenderableIssue
// from payload-adapter.ts. The DEEPDIVE_RENDERS_BLOCKS coverage set below
// forces a compile-time decision when a new Block variant lands. The right
// long-term fix is to route both emails through a shared surface-agnostic
// block renderer; until then, the coverage check is the guard rail.

import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { DeepDivePayload } from '../../db/types/database'
import { BLOCK_TYPES } from '../components/article/blocks'
import { inline, paraInline } from './safe-html'

const BATCH_SIZE = 100

// Deep-dive teaser intentionally renders ONLY these blocks. Anything else
// stays on the web read. New Block variants force this list to be updated.
//
// Const-asserted tuples (not Sets) so the union below is derived from the
// actual contents, not from a declared Set<...> type parameter that would
// resolve to the full BLOCK_TYPES union and pass the check vacuously.
const DEEPDIVE_RENDERS_BLOCKS = [
  'archetype', // assumption pull-quote
  'note', // "one thing to do Monday" callout
] as const
const DEEPDIVE_SKIPS_BLOCKS = [
  'prose',
  'sectionhead',
  'glance',
  'layers',
  'math',
  'steal',
  'calls',
  'readskip',
  'pullquote',
  'stat',
  'chart',
] as const
type _DeepDiveClassified =
  | (typeof DEEPDIVE_RENDERS_BLOCKS)[number]
  | (typeof DEEPDIVE_SKIPS_BLOCKS)[number]
type _DeepDiveUnclassified = Exclude<(typeof BLOCK_TYPES)[number], _DeepDiveClassified>
type _AssertNever<T extends never> = T
type _DeepDiveExhaustive = _AssertNever<_DeepDiveUnclassified>
const _deepDiveExhaustive: _DeepDiveExhaustive | undefined = undefined
void _deepDiveExhaustive

// Figr palette
const BG = '#0b0d0a'
const BG_RAISED = '#0e110c'
const LINE = '#20241c'
const CREAM = '#ece7dd'
const CREAM_DIM = '#cfc9bd'
const LIME = '#c2f53d'
const LIME_SOFT = '#9fd44a'
const DANGER = '#e5675a'
const FG = '#f4f2ec'
const FG_MUTED = '#8b8f86'
const FG_SUBTLE = '#6b7062'

const FONT_DISPLAY = 'Georgia, "Iowan Old Style", "Times New Roman", serif'
const FONT_BODY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY missing')
  return new Resend(key)
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? 'AI Signal <onboarding@resend.dev>'
}

function siteUrl(): string {
  // CLAUDE.md spec rule #5: sender domain is getaisignal.org. ALWAYS.
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getaisignal.org'
}

function siteHost(): string {
  return siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

// Must stay in sync with escapeHtml() in src/components/article/payload-adapter.ts
// and esc() in src/lib/email-template.ts — all five XML/HTML special chars.
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface DeepDiveEmailInput {
  issueId: string
  payload: DeepDivePayload
  issueCreatedAt: string | null
}

export function renderTeaserHtml(input: DeepDiveEmailInput): {
  html: string
  text: string
  subject: string
  preheader: string
} {
  const { payload, issueId } = input
  const url = `${siteUrl()}/issue/${issueId}`
  const subject = `Deep-dive · ${payload.title}`
  const preheader = payload.subtitle
  const mondayFirst = payload.monday_actions?.[0]?.action ?? ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(payload.title)}</title>
<style>
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .hed { font-size:30px !important; line-height:1.06 !important; }
    .dek { font-size:17px !important; line-height:1.5 !important; }
    .opener { font-size:15px !important; line-height:1.7 !important; }
  }
  body a.body-link { color:${LIME} !important; }
  body a.cta-btn { color:${BG} !important; text-decoration:none !important; }
  body a.footer-link { color:${FG_SUBTLE} !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};color:${FG};font-family:${FONT_BODY};">
<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background:${BG};max-width:600px;">

  <!-- Cream masthead -->
  <tr><td class="pad" style="background:${CREAM};padding:18px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:${FONT_MONO};font-size:13px;font-weight:600;letter-spacing:0.12em;color:${BG};">
          ▌▍▎ AI SIGNAL
        </td>
        <td align="right" style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;color:rgba(11,13,10,0.6);">
          DEEP DIVE
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero — kicker + title + dek -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
      LONG-FORM &nbsp;·&nbsp; ${(() => {
        // Normalize case so 'Cross-Cutting' / 'CROSS-CUTTING' / 'cross-cutting'
        // all route through the cross-cutting humanization, not into a literal
        // "FOR THE CROSS-CUTTING" kicker.
        const aud = (payload.primary_audience ?? '').trim().toLowerCase()
        // Empty/null audience defaults to the cross-cutting humanization so the
        // kicker never ships as "FOR THE " (empty noun) — a synthesizer that
        // omits this field shouldn't break the masthead.
        return aud === 'cross-cutting' || aud === ''
          ? 'FOR EVERYONE SHIPPING AI'
          : 'FOR THE ' + esc(aud.toUpperCase())
      })()}
    </p>
    <h1 class="hed" style="margin:20px 0 0 0;font-family:${FONT_DISPLAY};font-size:38px;font-weight:700;line-height:1.04;letter-spacing:-0.012em;color:${FG};">
      ${esc(payload.title)}
    </h1>
    <p class="dek" style="margin:24px 0 0 0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:400;font-size:21px;line-height:1.45;color:${CREAM_DIM};max-width:520px;">
      ${esc(payload.subtitle)}
    </p>
  </td></tr>

  <!-- Divider -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <div style="height:1px;background:${LINE};line-height:1px;font-size:1px;">&nbsp;</div>
  </td></tr>

  <!-- Cold open -->
  ${payload.cold_open
    ? `<tr><td class="pad" style="padding:32px 32px 0 32px;">
        <p style="margin:0 0 16px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
          OPENING SCENE
        </p>
        ${paraInline(
          payload.cold_open,
          `margin:0 0 16px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.7;color:${CREAM_DIM};`,
          'opener'
        )}
      </td></tr>`
    : ''}

  <!-- The assumption pull-quote -->
  ${payload.assumption
    ? `<tr><td class="pad" style="padding:32px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:2px solid ${LIME};">
          <tr><td style="padding:6px 0 6px 22px;">
            <p style="margin:0 0 10px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
              THE ASSUMPTION
            </p>
            <p style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:500;font-size:19px;line-height:1.4;color:${FG};">
              &ldquo;${esc(payload.assumption)}&rdquo;
            </p>
          </td></tr>
        </table>
      </td></tr>`
    : ''}

  <!-- One Monday action -->
  ${mondayFirst
    ? `<tr><td class="pad" style="padding:32px 32px 0 32px;">
        <p style="margin:0 0 14px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${DANGER};">
          ONE THING TO DO MONDAY
        </p>
        <p style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${FG};">
          ${inline(mondayFirst)}
        </p>
      </td></tr>`
    : ''}

  <!-- CTA — bulletproof lime button -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" bgcolor="${LIME}" style="background-color:${LIME};padding:0;">
        <a class="cta-btn" href="${url}" style="display:block;background-color:${LIME};color:${BG};font-family:${FONT_MONO};font-size:13px;font-weight:700;letter-spacing:0.04em;text-decoration:none;text-align:center;padding:16px 24px;">
          READ THE FULL ESSAY →
        </a>
      </td></tr>
    </table>
    <p style="margin:18px 0 0 0;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${FG_SUBTLE};text-align:center;">
      Argue back at me by replying to this email.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td class="pad" style="padding:40px 32px 36px 32px;">
    <div style="height:1px;background:${LINE};line-height:1px;font-size:1px;margin-bottom:20px;">&nbsp;</div>
    <p style="margin:0;font-family:${FONT_MONO};font-size:10px;line-height:1.65;letter-spacing:0.08em;color:${FG_SUBTLE};text-align:center;">
      AI SIGNAL · MADE IN BENGALURU<br/>
      You&rsquo;re getting this because you subscribed at <a class="footer-link" href="${siteUrl()}" style="color:${FG_SUBTLE};text-decoration:underline;">${siteHost()}</a>
    </p>
    <p style="margin:14px 0 0 0;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;color:${FG_SUBTLE};text-align:center;">
      <a class="footer-link" href="${url}" style="color:${FG_SUBTLE};text-decoration:underline;">VIEW IN BROWSER</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a class="footer-link" href="${siteUrl()}/unsubscribe?token=__UNSUB_TOKEN__" style="color:${FG_SUBTLE};text-decoration:underline;">UNSUBSCRIBE</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const text = `AI SIGNAL · DEEP DIVE

${payload.title}
${payload.subtitle}

${payload.cold_open ?? ''}

${payload.assumption ? `THE ASSUMPTION\n"${payload.assumption}"\n\n` : ''}${mondayFirst ? `ONE THING TO DO MONDAY\n${mondayFirst}\n\n` : ''}Read the full essay: ${url}

Argue back at me by replying to this email.

—— AI Signal · Made in Bengaluru`

  return { html, text, subject, preheader }
}

export interface DeepDiveSendResult {
  attempted: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

// Test-send a deep-dive teaser to a single recipient (owner preview).
// Mirrors src/lib/email-send.ts sendTestEmail discipline: substitutes the
// __UNSUB_TOKEN__ placeholder with a synthetic 'preview' token so the visible
// UNSUBSCRIBE link lands on a valid /unsubscribe page (instead of shipping the
// literal placeholder string), asserts no leakage, and uses a mailto-only
// List-Unsubscribe header WITHOUT the one-click POST claim (RFC 8058 one-click
// requires HTTPS; pairing it with mailto-only triggers Gmail/Yahoo bulk-sender
// mis-classification on the preview).
export async function sendDeepDiveTestEmail(opts: {
  to: string
  input: DeepDiveEmailInput
}): Promise<{ id: string }> {
  const resend = getResend()
  const rendered = renderTeaserHtml(opts.input)
  const html = rendered.html.replaceAll('__UNSUB_TOKEN__', 'preview')
  if (html.includes('__UNSUB_TOKEN__')) {
    throw new Error(
      'sendDeepDiveTestEmail: __UNSUB_TOKEN__ placeholder leaked into rendered HTML'
    )
  }
  const res = await resend.emails.send({
    from: getFrom(),
    to: opts.to,
    subject: `[TEST] ${rendered.subject}`,
    html,
    text: rendered.text,
    headers: {
      'List-Unsubscribe': `<mailto:unsubscribe@${siteHost()}?subject=unsubscribe>`,
    },
  })
  if (res.error) throw new Error(`Resend: ${res.error.message}`)
  return { id: res.data?.id ?? '' }
}

export async function sendDeepDiveToSubscribers(
  input: DeepDiveEmailInput
): Promise<DeepDiveSendResult> {
  const supabase = createAdminSupabaseClient()
  const resend = getResend()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs, error } = await (supabase.from('subscribers' as any) as any)
    .select('email, unsubscribe_token')
    .eq('status', 'active')
  if (error) throw new Error(`load subscribers: ${error.message}`)

  const rendered = renderTeaserHtml(input)
  const result: DeepDiveSendResult = { attempted: 0, sent: 0, failed: 0, errors: [] }
  // RFC 8058 compliance: a missing unsubscribe_token would render the
  // List-Unsubscribe URL as `?token=undefined`, breaking one-click unsub and
  // risking Gmail/Yahoo spam-folder placement. Drop tokenless recipients and
  // record the skip so backfill can pick them up.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: Array<{ email: string; token: string | null | undefined }> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (subs ?? []).map((s: any) => ({
      email: s.email,
      token: s.unsubscribe_token,
    }))
  const recipients: Array<{ email: string; token: string }> = []
  for (const r of all) {
    if (!r.token) {
      result.failed += 1
      result.errors.push({ email: r.email, error: 'missing unsubscribe_token' })
      continue
    }
    recipients.push({ email: r.email, token: r.token })
  }
  if (recipients.length === 0) return result

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE)
    const emails = chunk.map((r) => {
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
      // Batch itself failed — every recipient in this chunk is a failure.
      for (const r of chunk) {
        result.failed += 1
        result.errors.push({ email: r.email, error: batchRes.error.message })
      }
      continue
    }
    // Per-recipient accounting: Resend's batch API can return per-message errors
    // inside batchRes.data even when the batch "succeeded". An entry missing
    // an `id` (or carrying an `error` field) is a silent partial failure that
    // would otherwise be counted as sent.
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
