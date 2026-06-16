// Email-surface renderers for each Block variant the email teasers actually use.
// Mirrors the web BlockRenderer in blocks.tsx but emits Outlook-safe HTML
// (tables, inline styles, no flex/grid) instead of React.
//
// The email surfaces (email-template.ts, deep-dive-email.ts) feed
// RenderableIssue.chapters[] from payload-adapter through these functions
// instead of hand-building HTML from IssuePayload — single source of truth
// for the data shape, even if the render layer is per-surface.

import { inline } from '../../lib/safe-html'
import type { Block } from './blocks'

// Email anchors must get `class="body-link"` so the email-template <style>
// rule (`body a.body-link { color:${LIME} !important; }`) wins over Gmail /
// Yahoo's default-blue link override. Web doesn't need this — its anchors
// inherit color via CSS variables.
//
// Adapter inline() output already emits `<a href="..." target="_blank" ...>`
// without a class — post-process the HTML so every email surface picks up the
// lime color in one place. The replacement only matches the exact adapter-
// emitted shape and won't double-class an already-classed anchor.
function withBodyLinkClass(html: string): string {
  return html.replace(
    /<a href="([^"]+)" target="_blank" rel="noopener noreferrer">/g,
    '<a href="$1" class="body-link" target="_blank" rel="noopener noreferrer">'
  )
}

// Figr palette inlined (matches email-template.ts / deep-dive-email.ts).
const BG_RAISED = '#0e110c'
const LINE_STRONG = '#2c3127'
const CREAM_DIM = '#cfc9bd'
const LIME = '#c2f53d'
const FG = '#f4f2ec'
const FG_MUTED = '#8b8f86'

// SINGLE quotes around multi-word font names — these interpolate into
// `style="..."` attributes; embedded `"Segoe UI"` closes the style early
// and silently nukes the email's entire CSS. See email-template.ts.
const FONT_DISPLAY = "Georgia, 'Iowan Old Style', 'Times New Roman', serif"
const FONT_BODY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

// Glance block as 3-row Ship/Hold/Kill list. Ship-pick gets the moat treatment
// (lime arrow + bright body + 17px, NO body-text class so mobile media query
// can't shrink it). Hold/Kill demoted to italic Georgia muted 15px.
//
// `items` shape mirrors blocks.tsx Glance: { verb, body, isHumanPick }.
// `body` is already inline()-processed HTML — emit verbatim, do not escape.
export function renderEmailGlance(
  items: Extract<Block, { type: 'glance' }>['items']
): string {
  return items
    .map((item, idx) => {
      const isShipPick = item.verb === 'Ship' && item.isHumanPick
      const verbSafe = item.verb.replace(/[<>&]/g, '')
      const body = withBodyLinkClass(item.body)
      if (isShipPick) {
        return `
        <p style="margin:${idx === 0 ? '0' : '14px'} 0 0 0;font-family:${FONT_BODY};font-size:17px;line-height:1.55;color:${FG};">
          <span style="color:${LIME};font-weight:700;margin-right:6px;">&rarr;</span><span style="font-family:${FONT_DISPLAY};font-weight:700;color:${FG};">${verbSafe}.</span> ${body}
        </p>`
      }
      return `
        <p style="margin:${idx === 0 ? '0' : '10px'} 0 0 0;font-family:${FONT_DISPLAY};font-style:italic;font-size:15px;line-height:1.55;color:${FG_MUTED};" class="body-text">
          <span style="font-weight:600;font-style:normal;color:${CREAM_DIM};">${verbSafe}.</span> ${body}
        </p>`
    })
    .join('')
}

// Steal block — production-hack callout with the editorial italic label.
// Web Steal parses the body for <strong>Why it matters.</strong> /
// <strong>How to apply.</strong> labels. Email uses a single quiet card.
export function renderEmailSteal(
  block: Extract<Block, { type: 'steal' }>
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_RAISED};border-left:2px solid ${LIME};">
      <tr><td style="padding:24px 26px;">
        <p style="margin:0;font-family:${FONT_DISPLAY};font-size:14px;font-style:italic;color:${CREAM_DIM};">
          Steal this week.
        </p>
        <div style="margin:14px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${FG_MUTED};">${withBodyLinkClass(block.body)}</div>
      </td></tr>
    </table>`
}

// Archetype pull-quote — deep-dive's "the assumption" treatment. The quote
// renders as a large italic Georgia pull, body paragraphs follow. inline()
// already ran on quote/paras through the adapter — emit verbatim.
export function renderEmailArchetypePullQuote(
  block: Extract<Block, { type: 'archetype' }>
): string {
  const parasHtml = block.paras
    .map(
      (p) =>
        `<p style="margin:16px 0 0 0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${FG_MUTED};">${p}</p>`
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:2px solid ${LIME};">
      <tr><td style="padding:6px 0 6px 22px;">
        <p style="margin:0;font-family:${FONT_DISPLAY};font-style:italic;font-weight:500;font-size:19px;line-height:1.4;color:${FG};">
          &ldquo;${block.quote}&rdquo;
        </p>
        ${parasHtml}
      </td></tr>
    </table>`
}

// Note block — deep-dive's "one thing to do Monday" callout. Smaller, ink body.
export function renderEmailNote(
  block: Extract<Block, { type: 'note' }>
): string {
  return `
    <p style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${FG};">
      ${inline(block.body)}
    </p>`
}

// 6-layer diff — the editorial substance of the weekly. Each row gets
// stronger per-beat shape so they don't read as identical grey blocks
// (fresh-model audit 2026-06-16): lime numeral pill, serif beat title,
// double-hairline rule above each beat (clearer break on mobile than the
// 1px single line). Body uses italic serif lede + sans body for visual
// variation between the title and the prose.
//
// `items[].d` is already inline()-processed HTML — emit verbatim.
export function renderEmailLayers(
  items: Extract<Block, { type: 'layers' }>['items']
): string {
  return items
    .map((l, i) => {
      const numeral = String(i + 1).padStart(2, '0')
      const titleSafe = l.t.replace(/[<>&]/g, (c) =>
        c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'
      )
      const body = withBodyLinkClass(l.d)
      const topPad = i === 0 ? '14px' : '26px'
      // Double-hairline above each beat (8px gap). Reads as a deliberate
      // section break on mobile where the eye otherwise skips between
      // identical-looking paragraphs.
      const rule =
        i === 0
          ? ''
          : `
        <div style="border-top:1px solid ${LINE_STRONG};line-height:1px;font-size:1px;">&nbsp;</div>
        <div style="height:3px;line-height:3px;font-size:1px;">&nbsp;</div>
        <div style="border-top:1px solid ${LINE_STRONG};line-height:1px;font-size:1px;margin-bottom:14px;">&nbsp;</div>`
      return `
        <div style="margin-top:${topPad};">
          ${rule}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <span style="display:inline-block;background:${LIME};color:${BG_RAISED};font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:0.08em;padding:3px 8px;">${numeral}</span>
              </td>
              <td style="vertical-align:middle;font-family:${FONT_DISPLAY};font-size:18px;font-weight:600;color:${FG};line-height:1.2;">
                ${titleSafe}
              </td>
            </tr>
          </table>
          <div style="margin:0;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${FG_MUTED};" class="body-text">${body}</div>
        </div>`
    })
    .join('')
}
