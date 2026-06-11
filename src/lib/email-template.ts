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

// v2 design tokens — Indian Editorial palette (inlined: email clients ignore vars)
const PAPER = '#f4efe6'        // warm paper
const PAPER_ELEV = '#efe8da'   // tinted panel
const INK = '#121212'           // sophisticated black
const BODY = '#2a2926'          // warm dark body
const ACCENT = '#0f4c3a'        // peacock green
const ACCENT2 = '#d4622a'       // restrained terracotta
const MUTED = '#8a7968'         // warm taupe
const LINE = '#e3dccc'          // hairline

// System fonts only — Outlook/Apple Mail strip @font-face. The display feel
// comes from typography hierarchy + voice, not loaded custom fonts.
const FONT_DISPLAY =
  'Georgia, "Iowan Old Style", "Times New Roman", serif'      // for headlines
const FONT_BODY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' // for body (Inter-like)
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

// Parse the synthesizer's free-form INR math block into structured rows.
// Lines like "Label: ~₹250/M output tokens." → row { label, value }.
// Lines without a numeric/currency RHS roll up into a single conclusion paragraph.
function parseInrMath(raw: string): {
  rows: Array<{ label: string; value: string }>
  conclusion: string | null
} {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const rows: Array<{ label: string; value: string }> = []
  const tail: string[] = []
  const numRe = /[₹$%]|\b\d+(\.\d+)?\b|×|x\b/i
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx > 0 && idx < 90) {
      const label = line.slice(0, idx).trim()
      const value = line
        .slice(idx + 1)
        .trim()
        .replace(/\.$/, '')
      if (numRe.test(value) && value.length < 60) {
        rows.push({ label, value })
        continue
      }
    }
    tail.push(line)
  }
  return { rows, conclusion: tail.join(' ').trim() || null }
}

// Split persona translation into paragraphs (blank-line separated).
function paragraphs(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

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

  // Skim bullets: 3 lines — Ship, Hold, Kill — derived from chosen calls if present
  // and falling back to the top synth candidate.
  const skimBullets: string[] = []
  for (const kind of ['ship', 'hold', 'kill'] as const) {
    const label =
      chosen?.[kind]?.label ?? payload.shk_candidates?.[kind]?.[0]?.label
    if (label) {
      const verb = kind[0].toUpperCase() + kind.slice(1)
      skimBullets.push(`${verb} — ${label}`)
    }
  }

  // Per-section helper: split bullet at first sentence boundary so we can
  // bold the lead claim and let the rest read as supporting body. Scannable.
  const splitLeadAndRest = (bullet: string): { lead: string; rest: string } => {
    const m = bullet.match(/^([^.!?]+[.!?])\s+([\s\S]+)$/)
    if (!m) return { lead: bullet, rest: '' }
    return { lead: m[1].trim(), rest: m[2].trim() }
  }

  // Section accent rotation — peacock for spine layers, terracotta for India/enterprise warmth
  const sectionAccent = (beat: Beat): string => {
    if (beat === 'india-infra' || beat === 'indic-models' || beat === 'enterprise-deals') {
      return ACCENT2
    }
    return ACCENT
  }

  // Reusable editorial section opener — chapter kicker + big display title + dek.
  // Creates breathing room between cards and a magazine-table-of-contents rhythm.
  const sectionHeader = (chapter: string, title: string, dek?: string): string => `
<tr><td class="pad" style="padding:52px 24px 26px 24px;">
  <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT};font-weight:600;">
    ${esc(chapter)}
  </p>
  <h2 class="hed-2" style="margin:10px 0 ${dek ? '12px' : '0'} 0;font-family:${FONT_DISPLAY};font-size:30px;font-weight:700;line-height:1.18;letter-spacing:-0.01em;color:${INK};">
    ${esc(title)}
  </h2>
  ${dek
    ? `<p class="dek-sm" style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${BODY};max-width:480px;">${esc(dek)}</p>`
    : ''}
</td></tr>`

  const diffHeaderHtml = orderedDiff.length
    ? sectionHeader(
        'Chapter 02 — What moved',
        'The six layers',
        'Frontier APIs · India infra · regulation · Indic models · talent · enterprise. Card colour signals the layer.'
      )
    : ''

  const diffHtml = orderedDiff
    .map((d, i) => {
      const { lead, rest } = splitLeadAndRest(d.bullet)
      const sa = sectionAccent(d.beat)
      return `
<tr><td class="pad" style="padding:24px 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${sa};border-radius:4px;">
    <tr><td class="card" style="padding:28px 26px;">
      <p class="meta-row" style="margin:0 0 4px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${sa};font-weight:600;">
        ${BEAT_LABEL[d.beat]}
      </p>
      <p style="margin:0 0 18px 0;font-family:${FONT_MONO};font-size:40px;line-height:1;font-weight:300;color:${sa};">
        ${String(i + 1).padStart(2, '0')}
      </p>
      <p class="lead-bold" style="margin:0;font-family:${FONT_BODY};font-size:18px;line-height:1.4;color:${INK};font-weight:700;letter-spacing:-0.005em;">
        ${esc(lead)}
      </p>
      ${rest
        ? `<p class="lead-rest" style="margin:14px 0 0 0;font-family:${FONT_BODY};font-size:16px;line-height:1.65;color:${BODY};">${esc(rest)}</p>`
        : ''}
    </td></tr>
  </table>
</td></tr>`
    })
    .join('')

  const personaHtml = payload.persona
    ? (() => {
        const persona = payload.persona
        const paras = paragraphs(persona.translation)
        const math = persona.inr_math ? parseInrMath(persona.inr_math) : null

        const paragraphsHtml = paras
          .map((p, i) => {
            const isLead = i === 0
            return `
      <p class="body-prose" style="margin:${i === 0 ? '24px' : '14px'} 0 0 0;font-family:${FONT_BODY};font-size:${isLead ? '18' : '17'}px;line-height:1.6;color:${INK};${isLead ? 'font-weight:500;' : ''}">
        ${esc(p)}
      </p>`
          })
          .join('')

        const mathRowsHtml =
          math && math.rows.length
            ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:0;">
        ${math.rows
          .map(
            (r, i) => `
        <tr>
          <td class="math-label" style="padding:${i === 0 ? '0' : '10px'} 14px 10px 0;vertical-align:top;font-family:${FONT_BODY};font-size:15px;line-height:1.45;color:${BODY};border-bottom:1px solid ${LINE};">
            ${esc(r.label)}
          </td>
          <td class="math-value" style="padding:${i === 0 ? '0' : '10px'} 0 10px 14px;text-align:right;vertical-align:top;font-family:${FONT_MONO};font-size:15px;line-height:1.4;color:${ACCENT};font-weight:600;white-space:nowrap;border-bottom:1px solid ${LINE};">
            ${esc(r.value)}
          </td>
        </tr>`
          )
          .join('')}
      </table>`
            : ''

        const mathConclusionHtml =
          math && math.conclusion
            ? `
      <p class="lead-rest" style="margin:16px 0 0 0;font-family:${FONT_BODY};font-style:italic;font-size:15px;line-height:1.6;color:${INK};">
        ${esc(math.conclusion)}
      </p>`
            : ''

        const mathBlockHtml =
          math && (math.rows.length || math.conclusion)
            ? `
      <div style="margin-top:28px;padding:20px 0 0 0;border-top:1px dashed ${MUTED};">
        <p class="meta-row" style="margin:0 0 14px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT2};font-weight:600;">
          §&nbsp;&nbsp;The math
        </p>
        ${mathRowsHtml}
        ${mathConclusionHtml}
      </div>`
            : ''

        return `
${sectionHeader('Chapter 03 — For you', 'Written for this week', `One archetype, deep. Two more get a paragraph each below.`)}
<tr><td class="pad" style="padding:0 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${ACCENT};border-radius:4px;">
    <tr><td class="card" style="padding:28px;">
      <p style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-size:19px;line-height:1.3;color:${INK};letter-spacing:-0.005em;">
        ${esc(persona.archetype)}
      </p>
      ${paragraphsHtml}
      ${mathBlockHtml}
    </td></tr>
  </table>
</td></tr>`
      })()
    : ''

  const alsoForHtml = payload.also_for?.length
    ? `
<tr><td class="pad" style="padding:28px 24px 0 24px;">
  <p class="meta-row" style="margin:0 0 14px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${ACCENT2};font-weight:600;">
    Also reading &middot; other builders
  </p>
  ${payload.also_for
    .map(
      (b) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:3px solid ${ACCENT2};border-radius:4px;margin-bottom:12px;">
    <tr><td class="card" style="padding:20px 22px;">
      <p style="margin:0 0 10px 0;font-family:${FONT_DISPLAY};font-style:italic;font-size:15px;color:${INK};line-height:1.35;">
        ${esc(b.archetype)}
      </p>
      <p class="lead-rest" style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.6;color:${BODY};">
        ${esc(b.take)}
      </p>
    </td></tr>
  </table>`
    )
    .join('')}
</td></tr>`
    : ''

  // Production hack — the weekly "steal this" technique pulled from the literature
  const productionHackHtml = payload.production_hack
    ? `
${sectionHeader('Chapter 04 — Steal this', 'Production hack of the week', 'One technique from the literature. Ship it Monday.')}
<tr><td class="pad" style="padding:0 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${ACCENT};border-right:4px solid ${ACCENT2};border-radius:4px;">
    <tr><td class="card" style="padding:28px 26px;">
      <p class="meta-row" style="margin:0 0 8px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT2};font-weight:600;">
        From the literature
      </p>
      <p style="margin:0;font-family:${FONT_DISPLAY};font-size:22px;font-weight:700;line-height:1.2;letter-spacing:-0.01em;color:${INK};">
        ${esc(payload.production_hack.title)}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
        <tr><td style="padding:0 0 6px 0;">
          <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};font-weight:600;">
            Why it matters
          </p>
        </td></tr>
        <tr><td style="padding:0 0 18px 0;">
          <p class="body-prose" style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${INK};">
            ${esc(payload.production_hack.why_it_matters)}
          </p>
        </td></tr>
        <tr><td style="padding:0 0 6px 0;">
          <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};font-weight:600;">
            How to apply
          </p>
        </td></tr>
        <tr><td style="padding:0;">
          <p class="body-prose" style="margin:0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${INK};">
            ${esc(payload.production_hack.how_to_apply)}
          </p>
        </td></tr>
      </table>
      <div style="margin-top:22px;padding-top:14px;border-top:1px dashed ${MUTED};">
        <p style="margin:0;font-family:${FONT_MONO};font-size:12px;line-height:1.5;color:${MUTED};">
          Source: <a href="${esc(payload.production_hack.source_url)}" style="color:${ACCENT};text-decoration:underline;">${esc(payload.production_hack.source_label)}</a>
        </p>
      </div>
    </td></tr>
  </table>
</td></tr>`
    : ''

  // SHK kind-specific accent: peacock for Ship (move forward), muted for Hold, terracotta for Kill
  const shkAccent = { ship: ACCENT, hold: MUTED, kill: ACCENT2 } as const
  const shkVerb = { ship: 'Ship', hold: 'Hold', kill: 'Kill' } as const
  const shkHtml = chosen
    ? `
${sectionHeader('Chapter 05 — The calls', 'Three moves this week', 'One to ship. One to wait on. One to kill.')}
${(['ship', 'hold', 'kill'] as const)
  .map((kind) => {
    const c = chosen[kind]
    if (!c) return ''
    const sa = shkAccent[kind]
    return `
<tr><td class="pad" style="padding:0 24px 14px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${sa};border-radius:4px;">
    <tr><td class="card" style="padding:22px 24px;">
      <p class="meta-row" style="margin:0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${sa};font-weight:600;">
        ${shkVerb[kind]}
      </p>
      <p class="shk-label" style="margin:8px 0 0 0;font-family:${FONT_DISPLAY};font-size:18px;font-weight:600;line-height:1.3;color:${INK};letter-spacing:-0.005em;">
        ${esc(c.label)}
      </p>
      <p class="shk-body" style="margin:12px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.6;color:${BODY};">
        ${esc(c.rationale)}
      </p>
    </td></tr>
  </table>
</td></tr>`
  })
  .join('')}`
    : ''

  const keepSkipHtml =
    payload.keep_skip?.keep?.length || payload.keep_skip?.skip?.length
      ? `
${sectionHeader('Chapter 06 — Your reading list', 'What to read · What to skip', 'Three pieces worth your half-hour. Five everyone is talking about that you can safely ignore.')}
${payload.keep_skip?.keep?.length
  ? `<tr><td class="pad" style="padding:0 24px 16px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${ACCENT};border-radius:4px;">
        <tr><td class="card" style="padding:22px 24px;">
          <p class="meta-row" style="margin:0 0 14px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT};font-weight:600;">
            Read this week &mdash; signal we didn't have room for
          </p>
          ${payload.keep_skip.keep
            .map(
              (k) =>
                `<p class="ks-item" style="margin:0 0 10px 0;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${INK};"><span style="color:${ACCENT};font-family:${FONT_MONO};font-weight:600;">+&nbsp;</span>${esc(k)}</p>`
            )
            .join('')}
        </td></tr>
      </table>
    </td></tr>`
  : ''}
${payload.keep_skip?.skip?.length
  ? `<tr><td class="pad" style="padding:0 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${ACCENT2};border-radius:4px;">
        <tr><td class="card" style="padding:22px 24px;">
          <p class="meta-row" style="margin:0 0 14px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT2};font-weight:600;">
            Skip this week &mdash; loud, but not yours to act on
          </p>
          ${payload.keep_skip.skip
            .map(
              (s) =>
                `<p class="ks-item" style="margin:0 0 10px 0;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${BODY};"><span style="color:${ACCENT2};font-family:${FONT_MONO};font-weight:600;">−&nbsp;</span>${esc(s)}</p>`
            )
            .join('')}
        </td></tr>
      </table>
    </td></tr>`
  : ''}`
      : ''

  const skimHtml = skimBullets.length
    ? `
${sectionHeader('Chapter 01 — At a glance', 'If you only read this', 'The three moves you should walk away with.')}
<tr><td class="pad" style="padding:0 24px 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_ELEV};border-left:4px solid ${ACCENT};border-radius:4px;">
    <tr><td class="card" style="padding:24px 26px;">
      ${skimBullets
        .map(
          (b, i) =>
            `<p class="ks-item" style="margin:${i === 0 ? '0' : '12px'} 0 0 0;font-family:${FONT_BODY};font-size:16px;line-height:1.55;color:${INK};"><span style="color:${ACCENT};font-family:${FONT_MONO};font-weight:600;">→&nbsp;</span>${esc(b)}</p>`
        )
        .join('')}
    </td></tr>
  </table>
</td></tr>`
    : ''

  const waText = `${headline(payload)} — AI Signal #${issueNumberPadded}: ${issueUrl}`
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
    body, .paper { background:#16140f !important; color:#e8e2d4 !important; }
    .ink-text { color:#f4efe6 !important; }
    .panel { background:#1f1c16 !important; border-color:#2a2620 !important; }
    .accent { color:#4fa685 !important; }
  }
  /* Mobile (≤480px iPhone/Android) — tighter padding, smaller heads, narrower
     number column. Outlook ignores; Gmail/Apple Mail honor. */
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .pad { padding-left:16px !important; padding-right:16px !important; }
    .pad-y { padding-top:24px !important; padding-bottom:0 !important; }
    .card { padding:18px !important; }
    .hed { font-size:28px !important; line-height:1.15 !important; }
    .hed-2 { font-size:24px !important; line-height:1.2 !important; }
    .dek { font-size:16px !important; }
    .dek-sm { font-size:14px !important; }
    .diffnum { font-size:26px !important; }
    .diffnumcol { width:42px !important; padding-right:12px !important; }
    .lead-bold { font-size:17px !important; }
    .lead-rest { font-size:15px !important; }
    .body-prose { font-size:16px !important; }
    .shk-label { font-size:16px !important; }
    .shk-body { font-size:14px !important; }
    .ks-item { font-size:15px !important; }
    .meta-row { font-size:10px !important; letter-spacing:0.12em !important; }
    .math-label { font-size:14px !important; padding-right:10px !important; }
    .math-value { font-size:14px !important; padding-left:10px !important; }
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
    <h1 class="ink-text hed" style="margin:0;font-family:${FONT_DISPLAY};font-size:36px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;color:${INK};">
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
  ${diffHeaderHtml}
  ${diffHtml}

  <!-- Persona translation -->
  ${personaHtml}

  <!-- Also for other builders -->
  ${alsoForHtml}

  <!-- Production hack of the week -->
  ${productionHackHtml}

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
          <a href="${waHref}" target="_blank" class="cta-btn" style="display:inline-block;padding:13px 20px;margin-right:8px;margin-bottom:8px;background:${INK};color:${PAPER};font-family:${FONT_DISPLAY};font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">Share on WhatsApp</a>
          <a href="${issueUrl}" class="cta-btn" style="display:inline-block;padding:13px 20px;margin-bottom:8px;border:1px solid ${INK};color:${INK};font-family:${FONT_DISPLAY};font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;">Copy link</a>
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

  if (payload.also_for?.length) {
    lines.push('')
    lines.push('— ALSO FOR OTHER BUILDERS —')
    for (const b of payload.also_for) {
      lines.push('')
      lines.push(b.archetype)
      lines.push(b.take)
    }
  }

  if (payload.production_hack) {
    lines.push('')
    lines.push('— STEAL THIS · PRODUCTION HACK —')
    lines.push(payload.production_hack.title)
    lines.push('')
    lines.push('Why it matters: ' + payload.production_hack.why_it_matters)
    lines.push('')
    lines.push('How to apply: ' + payload.production_hack.how_to_apply)
    lines.push('')
    lines.push(
      'Source: ' +
        payload.production_hack.source_label +
        ' — ' +
        payload.production_hack.source_url
    )
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
