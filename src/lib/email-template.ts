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
//
// ARCHITECTURAL DEBT (flagged 2026-06-14 by architecture-critic):
// This template reads IssuePayload directly instead of consuming RenderableIssue
// from src/components/article/payload-adapter.ts. That means every new Block
// variant added on the web side has to be hand-twinned here. To enforce parity,
// EMAIL_RENDERS_BLOCKS below names every Block type the email understands as
// teaser content. A compile-time check at the bottom catches new Block variants
// that arrive without an email decision. The right long-term fix is a shared
// surface-agnostic renderer; until that lands, this check is the guard rail.

import type { ChosenCalls, IssuePayload } from '../../db/types/database'
import type { Block } from '../components/article/blocks'
import { BLOCK_TYPES } from '../components/article/blocks'
import {
  weeklyToRenderable,
  type RenderableIssue,
} from '../components/article/payload-adapter'
import {
  renderEmailGlance,
  renderEmailSteal,
} from '../components/article/email-blocks'
import { inline, paraInline } from './safe-html'

// Find the first block of the requested type across all chapters. The email
// teaser only renders a subset of blocks; this lets us pick them out of the
// adapter's output without re-implementing the data plumbing.
function findBlock<T extends Block['type']>(
  issue: RenderableIssue,
  type: T
): Extract<Block, { type: T }> | undefined {
  for (const ch of issue.chapters) {
    for (const b of ch.blocks) {
      if (b.type === type) return b as Extract<Block, { type: T }>
    }
  }
  return undefined
}

export type { IssuePayload }

// Email teaser intentionally renders only this subset of blocks. The remainder
// stay on the web read. If the synthesizer emits a new block variant, this list
// must be updated with an explicit decision (teaser or web-only).
//
// Const-asserted tuples (not Sets!) so the union type below is derived from
// the actual tuple contents, not from a declared Set<...> type parameter. A
// missing classification produces a non-`never` Exclude<> and breaks compile.
const EMAIL_RENDERS_BLOCKS = [
  'glance', // Ship/Hold/Kill — renderEmailGlance() in email-blocks.ts
  'steal', // STEAL THIS WEEK card — renderEmailSteal() in email-blocks.ts
] as const
const EMAIL_SKIPS_BLOCKS = [
  'prose',
  'sectionhead',
  'layers',
  'math',
  // persona archetype info is surfaced directly as "For the <archetype>." line
  // (not via the Archetype block treatment), so the block itself is skipped.
  'archetype',
  'calls',
  'readskip',
  'pullquote',
  'stat',
  'note',
  'chart',
] as const
type _EmailClassified =
  | (typeof EMAIL_RENDERS_BLOCKS)[number]
  | (typeof EMAIL_SKIPS_BLOCKS)[number]
type _EmailUnclassified = Exclude<(typeof BLOCK_TYPES)[number], _EmailClassified>
// Constraint trick: _Assert<T> requires T to extend never. When _EmailUnclassified
// is never (all variants classified), the constraint passes. When it's a non-empty
// union (e.g. 'timeline'), 'timeline' extends never is false → compile error.
type _AssertNever<T extends never> = T
type _EmailExhaustive = _AssertNever<_EmailUnclassified>
const _emailExhaustive: _EmailExhaustive | undefined = undefined
void _emailExhaustive

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

// Multi-word font names use SINGLE quotes — these constants get interpolated
// into `style="..."` attributes (double-quoted). Embedding `"Segoe UI"` would
// close the style attribute early and silently break the entire email's
// styling (Gmail web shows white bg, fonts fall back, layout collapses).
const FONT_DISPLAY =
  "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
const FONT_BODY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const FONT_MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

// Must stay in sync with escapeHtml() in src/components/article/payload-adapter.ts
// — all five XML/HTML special characters covered. The single-quote escape isn't
// exploitable today (every attribute here uses double quotes), but the moment a
// single-quoted attribute or inline JSON lands, an un-escaped apostrophe in
// synthesizer output becomes an attribute-context XSS sink.
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
  // Throughlines that start with `—` or `,` produce an empty first clause —
  // never let that propagate to a blank subject + blank <title>.
  if (!firstClause) return 'AI Signal · this week'
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
  // Canonical site URL: Vercel deployment (getaisignal.org domain dropped
  // 2026-06-16 — DNS never moved off Namecheap parking). `||` not `??` —
  // empty-string env vars are real values that `??` would let through.
  const site = opts.siteUrl || 'https://ai-signal-v2.vercel.app'
  const siteHost = site.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const issueUrl = `${site}/issue/${opts.issueId}`
  const issueNumberPadded = String(opts.issueNumber).padStart(3, '0')
  const dateStr = formatDate(opts.issueCreatedAt)

  const title =
    opts.payload.headline ?? deriveShortSubject(opts.payload.throughline)
  const dek = opts.payload.throughline ?? ''
  const subject = `Issue ${issueNumberPadded} · ${title}`
  const preheader = dek || 'Monday brief · for Indian AI builders'

  // Route through the same RenderableIssue the web /issue/[id] page consumes —
  // so Ship/Hold/Kill provenance tagging, verb-echo stripping, and inline()
  // markdown rendering are computed in ONE place (payload-adapter), and the
  // email teaser just picks the blocks it wants to surface.
  const renderable = weeklyToRenderable(opts.payload, opts.chosen ?? null, {
    no: issueNumberPadded,
    createdAt: opts.issueCreatedAt,
  })
  const glanceBlock = findBlock(renderable, 'glance')
  const stealBlock = findBlock(renderable, 'steal')

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
        <td style="font-family:${FONT_DISPLAY};font-size:18px;font-weight:700;letter-spacing:-0.005em;color:${BG};">
          AI Signal
        </td>
        <td align="right" style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:rgba(11,13,10,0.6);">
          № ${issueNumberPadded}
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero — meta line + headline + italic dek -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${LIME_SOFT};">
      ${dateStr ? esc(dateStr) + ' &nbsp;·&nbsp; ' : ''}6 MIN READ
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
        ${paraInline(
          throughlineLead,
          `margin:0 0 16px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.7;color:${CREAM_DIM};`,
          'body-text'
        )}
      </td></tr>`
    : ''}

  ${personaArchetype
    ? `<tr><td class="pad" style="padding:24px 32px 0 32px;">
        <p style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:400;font-size:17px;line-height:1.5;color:${CREAM_DIM};">
          For the ${esc(personaArchetype)}.
        </p>
      </td></tr>`
    : ''}

  ${glanceBlock && glanceBlock.items.length
    ? `<tr><td class="pad" style="padding:36px 32px 0 32px;">
        <div style="height:1px;background:${LINE_STRONG};line-height:1px;font-size:1px;margin-bottom:20px;">&nbsp;</div>
        <p style="margin:0 0 16px 0;font-family:${FONT_DISPLAY};font-size:15px;color:${CREAM_DIM};">
          <em style="font-style:italic;">If you only read this</em>
        </p>
        ${renderEmailGlance(glanceBlock.items)}
      </td></tr>`
    : ''}

  ${stealBlock
    ? `<tr><td class="pad" style="padding:40px 32px 0 32px;">
        <div style="height:1px;background:${LINE};line-height:1px;font-size:1px;margin-bottom:32px;">&nbsp;</div>
        ${renderEmailSteal(stealBlock)}
      </td></tr>`
    : ''}

  <!-- Closure — brand sign-off (CLAUDE.md spec rule #6). -->
  <tr><td class="pad" style="padding:40px 32px 0 32px;">
    <p style="margin:0;font-family:${FONT_DISPLAY};font-size:17px;line-height:1.45;color:${FG};">
      <span style="color:${LIME};">——</span> That&rsquo;s the shift. You&rsquo;re caught up.
    </p>
    <p style="margin:14px 0 0 0;font-family:${FONT_DISPLAY};font-size:14px;font-style:italic;color:${FG_MUTED};">
      — Suraj, Bengaluru
    </p>
  </td></tr>

  <!-- CTA — bulletproof lime button (table + bgcolor + inline color) -->
  <tr><td class="pad" style="padding:28px 32px 0 32px;">
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
      You&rsquo;re getting this because you subscribed at <a class="footer-link" href="${site}" style="color:${FG_SUBTLE};text-decoration:underline;">${siteHost}</a>
    </p>
    <p style="margin:14px 0 0 0;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.14em;color:${FG_SUBTLE};text-align:center;">
      <a class="footer-link" href="${issueUrl}" style="color:${FG_SUBTLE};text-decoration:underline;">VIEW IN BROWSER</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a class="footer-link" href="${site}/unsubscribe?token=__UNSUB_TOKEN__" style="color:${FG_SUBTLE};text-decoration:underline;">UNSUBSCRIBE</a>
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
    // Defensive: Math.min(undefined, 60) is NaN and String.repeat(NaN) throws.
    // A future code path that passes an empty title would silently crash mid-send.
    const ruleWidth = Math.max(0, Math.min(title?.length ?? 0, 60))
    if (ruleWidth > 0) lines.push('-'.repeat(ruleWidth))
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
