// HTML email template — Figr design v3 (2026-06-13).
//
// Teaser approach: cream masthead + 3-shift glance + lime steal box + lime CTA
// → drives clicks to web for the full read. Long-form body lives at /issue/[id].
//
// Constraints:
// - Mobile-first single column, 600px max width
// - System fonts only (no @font-face — Outlook strips it)
// - Inline CSS only (no <link>, no <style>)
// - HTML+CSS <95KB (Gmail clips at 102KB)
// - Multipart plain-text alternative always

import type { ChosenCalls, IssuePayload } from '../../db/types/database'

export type { IssuePayload }

// Figr palette inlined (email clients ignore CSS vars)
const BG = '#0b0d0a'
const BG_RAISED = '#0e110c'
const CARD = '#131712'
const LINE = '#20241c'
const LINE_STRONG = '#2c3127'
const CREAM = '#ece7dd'
const CREAM_DIM = '#cfc9bd'
const LIME = '#c2f53d'
const LIME_SOFT = '#9fd44a'
const FG = '#f4f2ec'
const FG_MUTED = '#8b8f86'
const FG_SUBTLE = '#6b7062'

const FONT_DISPLAY =
  'Georgia, "Iowan Old Style", "Times New Roman", serif'
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

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase()
}

function deriveShortSubject(throughline: string | null | undefined): string {
  if (!throughline) return 'AI Signal · this week'
  const firstClause = throughline.split(/[—,]/)[0].trim()
  const words = firstClause.split(/\s+/)
  return words.length <= 8 ? firstClause : words.slice(0, 7).join(' ') + '…'
}

export interface EmailTemplateInput {
  issueId: string
  issueNumber: number
  issueCreatedAt: string | null
  payload: IssuePayload
  chosen: ChosenCalls | null
  siteUrl?: string
}

export function renderEmailHtml(opts: EmailTemplateInput): {
  html: string
  text: string
  subject: string
  preheader: string
} {
  const site = opts.siteUrl ?? 'https://ai-signal-v2.vercel.app'
  const issueUrl = `${site}/issue/${opts.issueId}`
  const issueNumberPadded = String(opts.issueNumber).padStart(3, '0')
  const dateStr = formatDate(opts.issueCreatedAt)

  const title =
    opts.payload.headline ?? deriveShortSubject(opts.payload.throughline)
  const dek = opts.payload.throughline ?? ''
  const subject = `Issue ${issueNumberPadded} · ${title}`
  const preheader = dek || 'Monday brief · for Indian AI builders'

  const shifts: Array<{ verb: string; label: string }> = []
  for (const kind of ['ship', 'hold', 'kill'] as const) {
    const label =
      opts.chosen?.[kind]?.label ?? opts.payload.shk_candidates?.[kind]?.[0]?.label
    if (label) {
      shifts.push({ verb: kind.toUpperCase(), label })
    }
  }

  const hack = opts.payload.production_hack
  const personaArchetype = opts.payload.persona?.archetype ?? null
  const throughlineLead = opts.payload.throughline_lead ?? null

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(title)}</title>
<style>
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .pad { padding-left:20px !important; padding-right:20px !important; }
    .hed { font-size:30px !important; line-height:1.08 !important; }
    .dek { font-size:17px !important; line-height:1.5 !important; }
    .body-text { font-size:15px !important; }
  }
  /* Inline links color — scoped to body links, NOT the CTA button.
     The CTA button uses an explicit inline style + cta class to win. */
  body a.body-link { color:${LIME} !important; }
  body a.cta-btn { color:${BG} !important; text-decoration:none !important; }
  body a.footer-link { color:${FG_SUBTLE} !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};color:${FG};font-family:${FONT_BODY};">

<!-- Preheader (hidden from layout, shown in inbox preview) -->
<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(preheader)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background:${BG};max-width:600px;">

  <!-- Cream masthead band -->
  <tr><td style="background:${CREAM};padding:18px 24px;" class="pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-family:${FONT_MONO};font-size:13px;font-weight:600;letter-spacing:0.12em;color:${BG};">
          ▌▍▎ AI SIGNAL
        </td>
        <td align="right" style="font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;color:rgba(11,13,10,0.6);">
          ISSUE ${issueNumberPadded} · MON BRIEF
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero — meta line + headline + italic dek -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
      ${dateStr ? esc(dateStr.toUpperCase()) + ' &nbsp;·&nbsp; ' : ''}6 MIN READ
    </p>
    <h1 class="hed" style="margin:18px 0 0 0;font-family:${FONT_DISPLAY};font-size:38px;font-weight:700;line-height:1.05;letter-spacing:-0.012em;color:${FG};">
      ${esc(title)}
    </h1>
    ${dek
      ? `<p class="dek" style="margin:24px 0 0 0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:400;font-size:20px;line-height:1.5;color:${CREAM_DIM};max-width:520px;">
          ${esc(dek)}
        </p>`
      : ''}
  </td></tr>

  <!-- Divider -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <div style="height:1px;background:${LINE};line-height:1px;font-size:1px;">&nbsp;</div>
  </td></tr>

  ${throughlineLead
    ? `<tr><td class="pad" style="padding:32px 32px 0 32px;">
        <p style="margin:0 0 16px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
          THE SHIFT
        </p>
        <p style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.7;color:${CREAM_DIM};" class="body-text">
          ${esc(throughlineLead)}
        </p>
      </td></tr>`
    : ''}

  ${personaArchetype
    ? `<tr><td class="pad" style="padding:32px 32px 0 32px;">
        <p style="margin:0 0 12px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
          WRITTEN FOR
        </p>
        <p style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:400;font-size:18px;line-height:1.4;color:${FG};">
          ${esc(personaArchetype)}
        </p>
      </td></tr>`
    : ''}

  ${shifts.length
    ? `<tr><td class="pad" style="padding:32px 32px 0 32px;">
        <p style="margin:0 0 18px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
          DO MONDAY
        </p>
        ${shifts
          .map(
            (s, i) => `
        <p style="margin:${i === 0 ? '0' : '14px'} 0 0 0;font-family:${FONT_BODY};font-size:${i === 0 ? '16' : '15'}px;line-height:1.65;color:${i === 0 ? FG : FG_MUTED};" class="body-text">
          <span style="font-family:${FONT_MONO};font-size:11px;font-weight:700;letter-spacing:0.12em;color:${LIME};display:inline-block;width:42px;">${esc(s.verb)}</span>
          ${esc(s.label)}
        </p>`
          )
          .join('')}
      </td></tr>`
    : ''}

  ${hack
    ? `<tr><td class="pad" style="padding:40px 32px 0 32px;">
        <div style="height:1px;background:${LINE};line-height:1px;font-size:1px;margin-bottom:32px;">&nbsp;</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_RAISED};border-left:2px solid ${LIME};">
          <tr><td style="padding:24px 26px;">
            <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
              ⚡ &nbsp;STEAL THIS WEEK
            </p>
            <p style="margin:14px 0 0 0;font-family:${FONT_DISPLAY};font-size:19px;font-weight:600;line-height:1.25;letter-spacing:-0.005em;color:${FG};">
              ${esc(hack.title)}
            </p>
            <p style="margin:16px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${FG_MUTED};" class="body-text">
              ${esc(hack.why_it_matters)}
            </p>
          </td></tr>
        </table>
      </td></tr>`
    : ''}

  <!-- CTA — bulletproof lime button (table + bgcolor + inline color) -->
  <tr><td class="pad" style="padding:44px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" bgcolor="${LIME}" style="background-color:${LIME};padding:0;">
        <a class="cta-btn" href="${issueUrl}" style="display:block;background-color:${LIME};color:${BG};font-family:${FONT_MONO};font-size:13px;font-weight:700;letter-spacing:0.04em;text-decoration:none;text-align:center;padding:16px 24px;">
          READ THE FULL BRIEF →
        </a>
      </td></tr>
    </table>
    <p style="margin:18px 0 0 0;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${FG_SUBTLE};text-align:center;">
      Reply to this email — a human reads every one.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td class="pad" style="padding:40px 32px 36px 32px;">
    <div style="height:1px;background:${LINE};line-height:1px;font-size:1px;margin-bottom:20px;">&nbsp;</div>
    <p style="margin:0;font-family:${FONT_MONO};font-size:10px;line-height:1.65;letter-spacing:0.08em;color:${FG_SUBTLE};text-align:center;">
      AI SIGNAL · MADE IN BENGALURU<br/>
      You&rsquo;re getting this because you subscribed at <a class="footer-link" href="${site}" style="color:${FG_SUBTLE};text-decoration:underline;">ai-signal-v2.vercel.app</a>
    </p>
    <p style="margin:14px 0 0 0;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;color:${FG_SUBTLE};text-align:center;">
      <a class="footer-link" href="${issueUrl}" style="color:${FG_SUBTLE};text-decoration:underline;">VIEW IN BROWSER</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a class="footer-link" href="${site}/unsubscribe?issue=${encodeURIComponent(opts.issueId)}" style="color:${FG_SUBTLE};text-decoration:underline;">UNSUBSCRIBE</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const text = buildText(opts, issueUrl, issueNumberPadded, dateStr, title, dek)

  return { html, text, subject, preheader }
}

function buildText(
  opts: EmailTemplateInput,
  issueUrl: string,
  issueNumberPadded: string,
  dateStr: string,
  title: string,
  dek: string
): string {
  const lines: string[] = []
  lines.push(`AI SIGNAL · ISSUE ${issueNumberPadded}${dateStr ? ` · ${dateStr}` : ''}`)
  lines.push('')
  lines.push(title)
  if (dek) {
    lines.push('-'.repeat(Math.min(title.length, 60)))
    lines.push(dek)
  }
  lines.push('')

  // 3 shifts
  for (const kind of ['ship', 'hold', 'kill'] as const) {
    const label =
      opts.chosen?.[kind]?.label ?? opts.payload.shk_candidates?.[kind]?.[0]?.label
    if (label) {
      const verb = kind[0].toUpperCase() + kind.slice(1)
      lines.push(`${verb.toUpperCase()} — ${label}`)
    }
  }

  if (opts.payload.production_hack) {
    lines.push('')
    lines.push('STEAL THIS WEEK:')
    lines.push(opts.payload.production_hack.title)
    lines.push(opts.payload.production_hack.why_it_matters)
  }

  lines.push('')
  lines.push(`Read the full brief: ${issueUrl}`)
  lines.push('')
  lines.push('Reply to this email — a human reads every one.')
  lines.push('')
  lines.push('—— AI Signal · Made in Bengaluru')
  return lines.join('\n')
}
