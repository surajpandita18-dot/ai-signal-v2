// Deep-dive email — Figr design v3 (2026-06-13).
// Teaser: title + subtitle + cold open + the assumption pull-quote + lime CTA.
// Long-form essay lives on the web.

import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { DeepDivePayload } from '../../db/types/database'

const BATCH_SIZE = 100

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
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-signal-v2.vercel.app'
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
    .pad { padding-left:20px !important; padding-right:20px !important; }
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
      LONG-FORM &nbsp;·&nbsp; ${payload.primary_audience === 'cross-cutting' ? 'FOR EVERYONE SHIPPING AI' : 'FOR ' + esc(payload.primary_audience.toUpperCase()) + 'S'}
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
        <p class="opener" style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.7;color:${CREAM_DIM};">
          ${esc(payload.cold_open)}
        </p>
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
          ${esc(mondayFirst)}
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
      You&rsquo;re getting this because you subscribed at <a class="footer-link" href="${siteUrl()}" style="color:${FG_SUBTLE};text-decoration:underline;">ai-signal-v2.vercel.app</a>
    </p>
    <p style="margin:14px 0 0 0;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;color:${FG_SUBTLE};text-align:center;">
      <a class="footer-link" href="${url}" style="color:${FG_SUBTLE};text-decoration:underline;">VIEW IN BROWSER</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a class="footer-link" href="${siteUrl()}/unsubscribe?issue=${encodeURIComponent(issueId)}" style="color:${FG_SUBTLE};text-decoration:underline;">UNSUBSCRIBE</a>
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

THE ASSUMPTION
"${payload.assumption ?? ''}"

${mondayFirst ? `ONE THING TO DO MONDAY\n${mondayFirst}\n\n` : ''}Read the full essay: ${url}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipients: Array<{ email: string; token: string }> = (subs ?? []).map((s: any) => ({
    email: s.email,
    token: s.unsubscribe_token,
  }))
  if (recipients.length === 0) return result

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
