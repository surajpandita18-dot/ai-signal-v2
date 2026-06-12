// Email renderer for deep-dive essays. NOT a full essay-in-email — we
// send a teaser (title + subtitle + cold open + one Monday action) plus
// a single big "Read the full essay" CTA. Long-form on phone is a web
// read; the email's job is to drive the click.
//
// Mirrors the structure of email-template.ts but renders DeepDivePayload.

import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { DeepDivePayload } from '../../db/types/database'

const BATCH_SIZE = 100

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

const PAPER = '#f4efe6'
const PAPER_ELEV = '#efe8da'
const INK = '#121212'
const BODY = '#2a2926'
const ACCENT = '#0f4c3a'
const ACCENT2 = '#d4622a'
const MUTED = '#8a7968'
const LINE = '#e3dccc'

const FONT_DISPLAY = 'Georgia, "Iowan Old Style", "Times New Roman", serif'
const FONT_BODY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

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
  const monday1 = payload.monday_actions?.[0]
  const monday1Text =
    monday1 && typeof monday1 === 'object' && 'action' in monday1
      ? (monday1 as { action: string }).action
      : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(payload.title)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    body, .paper { background:#16140f !important; color:#e8e2d4 !important; }
    .ink-text { color:#f4efe6 !important; }
    .panel { background:#1f1c16 !important; border-color:#2a2620 !important; }
  }
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .pad { padding-left:20px !important; padding-right:20px !important; }
    .hed { font-size:30px !important; line-height:1.15 !important; }
    .dek { font-size:18px !important; line-height:1.45 !important; }
    .opener { font-size:16px !important; line-height:1.7 !important; }
  }
  a { color:${ACCENT}; }
</style>
</head>
<body class="paper" style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:32px 0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};max-width:600px;">

  <!-- Masthead -->
  <tr><td class="pad" style="padding:8px 24px 24px 24px;">
    <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;color:${MUTED};">
      <span style="color:${ACCENT};font-weight:700;">AI SIGNAL · DEEP-DIVE</span>
    </p>
  </td></tr>

  <!-- Title -->
  <tr><td class="pad" style="padding:0 24px 14px 24px;">
    <h1 class="hed ink-text" style="margin:0;font-family:${FONT_DISPLAY};font-size:38px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;color:${INK};">
      ${esc(payload.title)}
    </h1>
  </td></tr>

  <!-- Subtitle -->
  <tr><td class="pad" style="padding:0 24px 32px 24px;">
    <p class="dek" style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:400;font-size:22px;line-height:1.4;color:${INK};opacity:0.75;">
      ${esc(payload.subtitle)}
    </p>
  </td></tr>

  <!-- Cold open teaser -->
  <tr><td class="pad" style="padding:0 24px 28px 24px;">
    <p class="opener" style="margin:0;font-family:${FONT_DISPLAY};font-size:17px;line-height:1.75;color:${INK};">
      ${esc(payload.cold_open ?? '')}
    </p>
  </td></tr>

  <!-- The assumption (pull quote style) -->
  ${payload.assumption
    ? `<tr><td class="pad" style="padding:0 24px 28px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid ${ACCENT2};">
          <tr><td style="padding:6px 0 6px 18px;">
            <p style="margin:0 0 6px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${ACCENT2};font-weight:700;">The assumption</p>
            <p style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-size:18px;line-height:1.5;color:${INK};">
              ${esc(payload.assumption)}
            </p>
          </td></tr>
        </table>
      </td></tr>`
    : ''}

  <!-- One Monday action teaser -->
  ${monday1Text
    ? `<tr><td class="pad" style="padding:0 24px 28px 24px;">
        <p style="margin:0 0 6px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${ACCENT};font-weight:700;">One thing to do Monday</p>
        <p style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${INK};">${esc(monday1Text)}</p>
      </td></tr>`
    : ''}

  <!-- CTA -->
  <tr><td class="pad" style="padding:8px 24px 36px 24px;">
    <a href="${url}" style="display:inline-block;padding:14px 26px;background:${INK};color:${PAPER};font-family:${FONT_DISPLAY};font-size:15px;font-weight:700;text-decoration:none;border-radius:4px;">
      Read the full essay →
    </a>
    <p style="margin:14px 0 0 0;font-family:${FONT_MONO};font-size:11px;color:${MUTED};">
      ~${Math.max(8, Math.ceil((payload.evidence_sections?.reduce((acc, s) => acc + (s.body?.split(/\s+/).length ?? 0), 0) ?? 1200) / 200))} min read · single-column serif
    </p>
  </td></tr>

  <!-- Closure -->
  <tr><td class="pad" style="padding:0 24px 24px 24px;border-top:1px solid ${LINE};">
    <p style="margin:18px 0 0 0;font-family:${FONT_DISPLAY};font-style:italic;font-size:16px;line-height:1.55;color:${INK};">
      —— Argue back at me. Reply to this email.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td class="pad" style="padding:24px 24px;border-top:1px solid ${LINE};">
    <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.06em;color:${MUTED};">
      AI SIGNAL &middot; The India AI Builder&rsquo;s Brief
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const text = `AI SIGNAL · DEEP-DIVE

${payload.title}
${payload.subtitle}

${payload.cold_open ?? ''}

THE ASSUMPTION
${payload.assumption ?? ''}

${monday1Text ? `ONE THING TO DO MONDAY\n${monday1Text}\n\n` : ''}Read the full essay: ${url}

—— Argue back at me. Reply to this email.

AI SIGNAL — The India AI Builder's Brief`

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
