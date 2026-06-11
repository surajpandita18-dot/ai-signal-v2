// HTML email template — locked design system.
//
// Constraints (from research):
// - Mobile-first single column, 600px max width
// - System fonts only (Georgia body, system-sans heading, system-mono meta)
// - Inline CSS (no <link>, no @import — Outlook/Apple Mail kill them)
// - Total HTML+CSS <95KB (Gmail clips at 102KB)
// - prefers-color-scheme: dark override for paper/ink swap
// - Off-white paper + near-black ink — NEVER pure #FFFFFF/#000000
// - Tap targets >=44px
// - Multipart plain-text alternative always
//
// Returns { html, text } for Resend's `react`/`html` + `text` fields.

import type { Beat, ChosenCalls, IssuePayload } from '../../db/types/database'

// re-export so helpers below can name-shadow if needed
export type { IssuePayload }

const BEAT_LABEL: Record<Beat, string> = {
  'frontier-api': 'FRONTIER APIs',
  'india-infra': 'INDIA INFRA',
  regulation: 'REGULATION',
  'indic-models': 'INDIC MODELS',
  'talent-comp': 'TALENT &amp; COMP',
  'enterprise-deals': 'ENTERPRISE DEALS',
}

const BEAT_ORDER: readonly Beat[] = [
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals',
] as const

// Locked design tokens (inlined — email clients ignore CSS variables).
const PAPER = '#f5f1e8'
const INK = '#1a1a1a'
const ACCENT = '#1e3a8a'
const CLAY = '#9a3412'
const MUTED = '#6b6b6b'
const LINE = '#e6e0d2'

const FONT_BODY =
  'Georgia, "Iowan Old Style", "Times New Roman", serif'
const FONT_HEAD =
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
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Fallback if synthesizer didn't produce a headline yet — take first clause
// of throughline, cap at 8 words.
function deriveShortSubject(throughline: string | null | undefined): string {
  if (!throughline) return 'AI Signal · the brief'
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
  siteUrl?: string // defaults to https://getaisignal.org
}

export function renderEmailHtml(opts: EmailTemplateInput): {
  html: string
  text: string
  subject: string
  preheader: string
} {
  const site = opts.siteUrl ?? 'https://getaisignal.org'
  const issueUrl = `${site}/issue/${opts.issueId}`
  const issueNumberPadded = String(opts.issueNumber).padStart(3, '0')
  const dateStr = formatDate(opts.issueCreatedAt)

  // Subject = the catchy 5-8 word headline. NEVER the long throughline.
  const subject = opts.payload.headline ?? deriveShortSubject(opts.payload.throughline)
  // Preheader: extends the hook — never repeats subject. Short, complements it.
  const preheader = opts.payload.throughline ?? 'Monday brief · for Indian AI builders'

  const html = buildHtml(opts, issueUrl, issueNumberPadded, dateStr)
  const text = buildText(opts, issueUrl, issueNumberPadded, dateStr)

  return { html, text, subject, preheader }
}

function buildHtml(
  opts: EmailTemplateInput,
  issueUrl: string,
  issueNumberPadded: string,
  dateStr: string
): string {
  const { payload, chosen } = opts
  const preheader = `Monday brief · ${payload.persona?.archetype ?? 'For Indian AI builders'}`

  const orderedDiff = [...(payload.six_layer_diff ?? [])].sort(
    (a, b) => BEAT_ORDER.indexOf(a.beat) - BEAT_ORDER.indexOf(b.beat)
  )

  // Skim bullets: derive from top SHK candidates if available
  const skimBullets: string[] = []
  if (chosen?.ship?.label) skimBullets.push(`Ship: ${chosen.ship.label}`)
  else if (payload.shk_candidates?.ship?.[0]?.label) skimBullets.push(`Ship: ${payload.shk_candidates.ship[0].label}`)
  if (chosen?.kill?.label) skimBullets.push(`Kill: ${chosen.kill.label}`)
  else if (payload.shk_candidates?.kill?.[0]?.label) skimBullets.push(`Kill: ${payload.shk_candidates.kill[0].label}`)

  // Per-section helper: split bullet at first sentence boundary so we can
  // bold the lead claim and let the rest read as supporting body. Scannable.
  const splitLeadAndRest = (bullet: string): { lead: string; rest: string } => {
    const m = bullet.match(/^([^.!?]+[.!?])\s+([\s\S]+)$/)
    if (!m) return { lead: bullet, rest: '' }
    return { lead: m[1].trim(), rest: m[2].trim() }
  }

  const diffHtml = orderedDiff
    .map(
      (d, i) => {
        const { lead, rest } = splitLeadAndRest(d.bullet)
        return `
<tr><td class="pad pad-y" style="padding:36px 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td valign="top" class="diffnumcol" width="56" style="padding-right:16px;">
        <span class="diffnum" style="font-family:${FONT_MONO};font-size:34px;line-height:1;font-weight:300;color:${ACCENT};">
          ${String(i + 1).padStart(2, '0')}
        </span>
      </td>
      <td valign="top">
        <p class="meta-row" style="margin:6px 0 10px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">
          ${BEAT_LABEL[d.beat]}
        </p>
        <p class="lead-bold" style="margin:0;font-family:${FONT_BODY};font-size:18px;line-height:1.45;color:${INK};font-weight:700;">
          ${esc(lead)}
        </p>
        ${rest
          ? `<p class="lead-rest" style="margin:10px 0 0 0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${INK};">${esc(rest)}</p>`
          : ''}
      </td>
    </tr>
  </table>
</td></tr>`
      }
    )
    .join('')

  const personaHtml = payload.persona
    ? `
<tr><td class="pad" style="padding:40px 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};border:1px solid ${LINE};border-radius:6px;">
    <tr><td class="card" style="padding:24px;">
      <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">
        What this means for you
      </p>
      <p style="margin:8px 0 0 0;font-family:${FONT_HEAD};font-size:14px;font-weight:600;color:${INK};">
        ${esc(payload.persona.archetype)}
      </p>
      <p class="body-prose" style="margin:18px 0 0 0;font-family:${FONT_BODY};font-size:17px;line-height:1.55;color:${INK};white-space:pre-line;">
        ${esc(payload.persona.translation)}
      </p>
      ${payload.persona.inr_math
        ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid ${LINE};">
            <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">The math</p>
            <pre style="margin:8px 0 0 0;font-family:${FONT_MONO};font-size:13px;line-height:1.55;color:${INK};white-space:pre-wrap;overflow-x:auto;">${esc(payload.persona.inr_math)}</pre>
          </div>`
        : ''}
    </td></tr>
  </table>
</td></tr>`
    : ''

  const shkHtml = chosen
    ? `
<tr><td class="pad" style="padding:40px 24px 0 24px;">
  <p class="meta-row" style="margin:0 0 20px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">
    Ship / Hold / Kill &middot; this week
  </p>
  ${(['ship', 'hold', 'kill'] as const)
    .map((kind) => {
      const c = chosen[kind]
      if (!c) return ''
      return `
  <div style="border-left:3px solid ${ACCENT};padding-left:16px;margin-bottom:22px;">
    <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};font-weight:600;">${kind.toUpperCase()}</p>
    <p class="shk-label" style="margin:6px 0 0 0;font-family:${FONT_HEAD};font-size:17px;font-weight:600;line-height:1.35;color:${INK};">${esc(c.label)}</p>
    <p class="shk-body" style="margin:8px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${INK};">${esc(c.rationale)}</p>
  </div>`
    })
    .join('')}
</td></tr>`
    : ''

  const keepSkipHtml =
    payload.keep_skip?.keep?.length || payload.keep_skip?.skip?.length
      ? `
<tr><td class="pad" style="padding:40px 24px 0 24px;">
  <p class="meta-row" style="margin:0 0 20px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">
    Keep / Skip
  </p>
  ${payload.keep_skip?.keep?.length
    ? `<p style="margin:0 0 10px 0;font-family:${FONT_HEAD};font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${INK};">Keep</p>
       <ul style="margin:0 0 20px 0;padding:0 0 0 4px;list-style:none;">
         ${payload.keep_skip.keep
           .map(
             (k) =>
               `<li class="ks-item" style="margin:0 0 8px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.55;color:${INK};"><span style="color:${ACCENT};font-weight:600;">+ </span>${esc(k)}</li>`
           )
           .join('')}
       </ul>`
    : ''}
  ${payload.keep_skip?.skip?.length
    ? `<p style="margin:0 0 10px 0;font-family:${FONT_HEAD};font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${INK};">Skip</p>
       <ul style="margin:0;padding:0 0 0 4px;list-style:none;">
         ${payload.keep_skip.skip
           .map(
             (s) =>
               `<li class="ks-item" style="margin:0 0 8px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.55;color:${INK};"><span style="color:${CLAY};font-weight:600;">− </span>${esc(s)}</li>`
           )
           .join('')}
       </ul>`
    : ''}
</td></tr>`
      : ''

  const skimHtml = skimBullets.length
    ? `
<tr><td class="pad" style="padding:0 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};border:1px solid ${LINE};border-radius:6px;">
    <tr><td class="card" style="padding:18px 20px;">
      <p class="meta-row" style="margin:0 0 12px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">
        What changed this week
      </p>
      ${skimBullets
        .map(
          (b) =>
            `<p class="ks-item" style="margin:0 0 8px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.5;color:${INK};"><span style="color:${ACCENT};font-family:${FONT_MONO};font-weight:600;">→ </span>${esc(b)}</p>`
        )
        .join('')}
    </td></tr>
  </table>
</td></tr>`
    : ''

  const waText = `${payload.throughline} — AI Signal Issue #${issueNumberPadded}: ${issueUrl}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(payload.throughline)}</title>
<style>
  /* Dark mode override — Gmail/Apple Mail honor this */
  @media (prefers-color-scheme: dark) {
    body, .paper { background:#1a1a1a !important; color:#f5f1e8 !important; }
    .ink-text { color:#f5f1e8 !important; }
    .panel { background:#1a1a1a !important; border-color:#2a2a2a !important; }
    .accent { color:#93c5fd !important; }
  }
  /* Mobile (≤480px iPhone/Android) — tighter padding, smaller heads, narrower
     number column. Outlook ignores; Gmail/Apple Mail honor. */
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .pad { padding-left:16px !important; padding-right:16px !important; }
    .pad-y { padding-top:24px !important; padding-bottom:0 !important; }
    .card { padding:18px !important; }
    .hed { font-size:28px !important; line-height:1.15 !important; }
    .dek { font-size:16px !important; }
    .diffnum { font-size:26px !important; }
    .diffnumcol { width:42px !important; padding-right:12px !important; }
    .lead-bold { font-size:17px !important; }
    .lead-rest { font-size:15px !important; }
    .body-prose { font-size:16px !important; }
    .shk-label { font-size:16px !important; }
    .shk-body { font-size:14px !important; }
    .ks-item { font-size:15px !important; }
    .meta-row { font-size:10px !important; letter-spacing:0.12em !important; }
    .cta-btn { padding:12px 16px !important; font-size:13px !important; }
  }
  a { color:${ACCENT}; }
</style>
</head>
<body class="paper" style="margin:0;padding:0;background:${PAPER};">
<!-- Preheader (hidden from layout, shown in inbox preview) -->
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(preheader)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:30px 0;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};max-width:600px;">

  <!-- Masthead + meta -->
  <tr><td class="pad" style="padding:8px 24px 8px 24px;">
    <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;color:${MUTED};">
      <span style="color:${ACCENT};font-weight:600;">AI SIGNAL</span> &middot; ISSUE&nbsp;#${issueNumberPadded}${dateStr ? ` &middot; ${dateStr.toUpperCase()}` : ''}
    </p>
  </td></tr>

  <!-- Headline — the catchy 5-word title -->
  <tr><td class="pad" style="padding:24px 24px 16px 24px;">
    <h1 class="ink-text hed" style="margin:0;font-family:${FONT_HEAD};font-size:36px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;color:${INK};">
      ${esc(headline(payload))}
    </h1>
  </td></tr>

  <!-- Throughline = italic dek under headline (small + restrained) -->
  ${payload.throughline && payload.throughline !== headline(payload)
    ? `<tr><td class="pad" style="padding:0 24px 28px 24px;">
        <p class="dek" style="margin:0;font-family:${FONT_BODY};font-style:italic;font-size:17px;line-height:1.5;color:${INK};opacity:0.85;">${esc(payload.throughline)}</p>
      </td></tr>`
    : ''}

  <!-- Read on web link, small + low key -->
  <tr><td class="pad" style="padding:0 24px 32px 24px;">
    <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.10em;color:${MUTED};">
      ${readTime(payload)} MIN READ &middot;
      <a href="${issueUrl}" style="color:${MUTED};text-decoration:underline;">Open on web</a>
    </p>
  </td></tr>

  <!-- Executive skim -->
  ${skimHtml}

  <!-- 6-layer diff -->
  ${diffHtml}

  <!-- Persona translation -->
  ${personaHtml}

  <!-- Ship / Hold / Kill -->
  ${shkHtml}

  <!-- Keep / Skip -->
  ${keepSkipHtml}

  <!-- Closure -->
  <tr><td class="pad" style="padding:40px 24px 16px 24px;border-top:1px solid ${LINE};">
    <p class="dek" style="margin:0;font-family:${FONT_BODY};font-style:italic;font-size:17px;line-height:1.55;color:${INK};">
      —— That&rsquo;s the shift. You&rsquo;re caught up.
    </p>
  </td></tr>

  <!-- Forward CTA -->
  <tr><td class="pad" style="padding:16px 24px 24px 24px;">
    <p class="meta-row" style="margin:0 0 12px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">
      Forward to one builder
    </p>
    <p class="ks-item" style="margin:0 0 18px 0;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${INK};">
      If this lands for someone you work with — co-founder, PM, the engineer thinking about migration — send them the link.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <a href="${waHref}" target="_blank" class="cta-btn" style="display:inline-block;padding:13px 20px;margin-right:8px;margin-bottom:8px;background:${INK};color:${PAPER};font-family:${FONT_HEAD};font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">Share on WhatsApp</a>
          <a href="${issueUrl}" class="cta-btn" style="display:inline-block;padding:13px 20px;margin-bottom:8px;border:1px solid ${INK};color:${INK};font-family:${FONT_HEAD};font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">Copy link</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td class="pad" style="padding:36px 24px;border-top:1px solid ${LINE};">
    <p style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.06em;color:${MUTED};">
      AI SIGNAL &middot; The India AI Builder&rsquo;s Brief
    </p>
    <p style="margin:6px 0 0 0;font-family:${FONT_MONO};font-size:11px;color:${MUTED};">
      <a href="${site(opts)}" style="color:${MUTED};text-decoration:underline;">getaisignal.org</a> &middot;
      <a href="${site(opts)}/unsubscribe?issue=${encodeURIComponent(opts.issueId)}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function site(opts: EmailTemplateInput): string {
  return opts.siteUrl ?? 'https://getaisignal.org'
}

function headline(p: IssuePayload): string {
  if (p.headline) return p.headline
  const firstClause = (p.throughline ?? '').split(/[—,]/)[0].trim()
  const words = firstClause.split(/\s+/)
  return words.length <= 9 ? firstClause : words.slice(0, 8).join(' ') + '…'
}

function readTime(p: IssuePayload): number {
  const words = [
    p.throughline_lead ?? '',
    ...(p.six_layer_diff ?? []).map((d) => d.bullet),
    p.persona?.translation ?? '',
    p.persona?.inr_math ?? '',
    ...(p.keep_skip?.keep ?? []),
    ...(p.keep_skip?.skip ?? []),
  ]
    .join(' ')
    .trim()
    .split(/\s+/).length
  return Math.max(3, Math.round(words / 200))
}

function buildText(
  opts: EmailTemplateInput,
  issueUrl: string,
  issueNumberPadded: string,
  dateStr: string
): string {
  const { payload, chosen } = opts
  const lines: string[] = []

  lines.push(
    `AI SIGNAL · ISSUE #${issueNumberPadded}${dateStr ? ` · ${dateStr.toUpperCase()}` : ''}`
  )
  lines.push(`Read on web: ${issueUrl}`)
  lines.push('')
  lines.push(payload.throughline)
  lines.push('='.repeat(Math.min(payload.throughline.length, 70)))
  if (payload.throughline_lead) {
    lines.push('')
    lines.push(payload.throughline_lead)
  }

  if (payload.six_layer_diff?.length) {
    lines.push('')
    lines.push('— THE DIFF —')
    const ordered = [...payload.six_layer_diff].sort(
      (a, b) => BEAT_ORDER.indexOf(a.beat) - BEAT_ORDER.indexOf(b.beat)
    )
    for (const [i, d] of ordered.entries()) {
      lines.push('')
      lines.push(`${String(i + 1).padStart(2, '0')} · ${BEAT_LABEL[d.beat]}`)
      lines.push(d.bullet)
    }
  }

  if (payload.persona) {
    lines.push('')
    lines.push(`— WHAT THIS MEANS FOR YOU —`)
    lines.push(payload.persona.archetype)
    lines.push('')
    lines.push(payload.persona.translation)
    if (payload.persona.inr_math) {
      lines.push('')
      lines.push('The math:')
      lines.push(payload.persona.inr_math)
    }
  }

  if (chosen) {
    lines.push('')
    lines.push('— SHIP / HOLD / KILL —')
    for (const kind of ['ship', 'hold', 'kill'] as const) {
      const c = chosen[kind]
      if (!c) continue
      lines.push('')
      lines.push(`${kind.toUpperCase()}: ${c.label}`)
      lines.push(c.rationale)
    }
  }

  if (payload.keep_skip?.keep?.length || payload.keep_skip?.skip?.length) {
    lines.push('')
    lines.push('— KEEP / SKIP —')
    if (payload.keep_skip.keep?.length) {
      lines.push('')
      lines.push('Keep:')
      for (const k of payload.keep_skip.keep) lines.push(`+ ${k}`)
    }
    if (payload.keep_skip.skip?.length) {
      lines.push('')
      lines.push('Skip:')
      for (const s of payload.keep_skip.skip) lines.push(`- ${s}`)
    }
  }

  lines.push('')
  lines.push(`—— That's the shift. You're caught up.`)
  lines.push('')
  lines.push(`Forward to one builder: ${issueUrl}`)
  lines.push('')
  lines.push('AI SIGNAL — The India AI Builder’s Brief — getaisignal.org')

  return lines.join('\n')
}
