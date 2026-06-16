// Adapter — turns our existing IssuePayload (weekly brief) and DeepDivePayload
// (long-form essay) into the Figr block-based chapter shape.
//
// The synthesizer prompts still produce the original payload shapes; we don't
// rewrite the writer agents. The rendering layer reshapes for the new design.

import type {
  AppendixPack,
  IssuePayload,
  ChosenCalls,
  DeepDivePayload,
  Beat,
} from '../../../db/types/database'
import type { Block } from './blocks'
import { escapeHtml, safeUrl, inline } from '../../lib/safe-html'

export interface Chapter {
  id: string
  label: string // short — for any future TOC; chapter eyebrow is intentionally not rendered
  heading: string
  sub?: string
  blocks: Block[]
}

export interface RenderableIssue {
  kind: 'BRIEF' | 'DEEP DIVE'
  no: string
  heroDate: string
  read: string
  title: string
  dek: string
  lede: string
  chapters: Chapter[]
  appendix?: AppendixPack | null
  // Editorial framework v2 — direct passthroughs from IssuePayload. Each is
  // optional; the renderer only paints the section when present.
  signal_of_the_week?: string | null
  explained_simply?: {
    concept: string
    explanation: string
  } | null
  production_questions?: string[] | null
}

const BEAT_LABEL: Record<Beat, string> = {
  'frontier-api': 'Frontier APIs',
  'india-infra': 'India Infra',
  regulation: 'Regulation',
  'indic-models': 'Indic Models',
  'talent-comp': 'Talent & Comp',
  'enterprise-deals': 'Enterprise Deals',
}

const BEAT_ORDER: readonly Beat[] = [
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals',
]

function fmtDate(iso: string | null): string {
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

// Convert plaintext (with \n\n paragraphs) into HTML for the editorial class.
// Uses inline() so any synthesizer-emitted markdown links / bold / italic in
// the throughline_lead or deep-dive cold_open render as real anchors and
// emphasis rather than as literal `[text](url)` / `**bold**` source.
function paraToHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .split(/\n\s*\n/)
    .map((p) => `<p>${inline(p.trim())}</p>`)
    .join('')
}

// escapeHtml / safeUrl / inline live in src/lib/safe-html.ts — single source of
// truth so web + email surfaces can't drift on escape rules, URL allow-list,
// or markdown rendering. Imported above.

// Parse the synth's INR math block into Math block rows.
// Each "Label: value" line becomes a row; the trailing interpretation is dropped
// (it's surfaced as a sub paragraph instead).
// Match "metric — value", "metric–value" (no spaces, common in Indic typography),
// "metric - value", or "metric: value".
// - Em/en dashes match with optional surrounding spaces — Indic outputs often
//   write "Tokens—₹50" with no spaces.
// - ASCII hyphen still requires spaces on both sides to avoid matching
//   hyphenated metric names like "open-source-cost".
// - Colon split is gated to require a non-digit AFTER the colon — avoids times
//   like "7:30 AM" being interpreted as a metric/value pair while still
//   accepting metric labels that end in a digit (e.g. "A100: ₹200/hr",
//   "GPT-4: ₹6/Mtok", "H100: $25K").
const METRIC_VALUE_RE = /^(.{1,90}?)\s*(?:\s*[—–]\s*|\s-\s|:(?!\d)\s?)\s*(.+)$/

function parseInrMath(raw: string): {
  rows: Array<{ metric: string; a: string; b: string; delta: string }>
  conclusion: string
} {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const rows: Array<{ metric: string; a: string; b: string; delta: string }> = []
  const tail: string[] = []
  for (const line of lines) {
    const m = METRIC_VALUE_RE.exec(line)
    if (m) {
      const label = m[1].trim()
      const value = m[2].trim().replace(/\.$/, '')
      if (label && /[₹$%]|\b\d+(\.\d+)?\b/.test(value)) {
        rows.push({ metric: label, a: '—', b: value, delta: '' })
        continue
      }
    }
    tail.push(line)
  }
  return { rows, conclusion: tail.join(' ').trim() }
}

export function weeklyToRenderable(
  payload: IssuePayload,
  chosen: ChosenCalls | null,
  meta: { no: string; createdAt: string | null }
): RenderableIssue {
  const chapters: Chapter[] = []

  // CH01 — At a glance (Ship · Hold · Kill summary).
  // CLAUDE.md rule #1: track human-pick provenance per row so the Glance
  // renderer can refuse the affirmative Ship-tier treatment for any row that
  // wasn't actually picked by the human editor.
  const glanceItems: { verb: string; body: string; isHumanPick: boolean }[] = []
  for (const k of ['ship', 'hold', 'kill'] as const) {
    const chosenCall = chosen?.[k]
    const aiFallback = payload.shk_candidates?.[k]?.[0]
    const call = chosenCall ?? aiFallback
    if (call?.label) {
      const verb = k[0].toUpperCase() + k.slice(1)
      // Strip leading verb echo plus separator chars; escape verb for regex.
      const escapedVerb = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const stripped = call.label.replace(
        new RegExp(`^${escapedVerb}[\\s:—–-]+`, 'i'),
        ''
      )
      // CLAUDE.md rule #1: bright-lime Ship-tier treatment requires a human
      // pick. New writes carry an explicit `source` ('human' from /review,
      // 'ai' from cron). Legacy rows written before the source field existed
      // are treated as 'human' since the /review path was the only writer
      // (the cron auto-promotion path that motivates the AI flag landed in
      // the same change). New 'ai'-tagged rows render demoted.
      const isHumanPick = chosenCall
        ? (chosenCall.source ?? 'human') === 'human'
        : false
      glanceItems.push({ verb, body: inline(stripped), isHumanPick })
    }
  }
  if (glanceItems.length) {
    chapters.push({
      id: 'ch-glance',
      label: 'Glance',
      heading: 'If you only read this',
      sub: 'The three moves to walk away with.',
      blocks: [{ type: 'glance', items: glanceItems }],
    })
  }

  // CH02 — What moved (6-layer diff)
  const orderedDiff = [...(payload.six_layer_diff ?? [])].sort(
    (a, b) => BEAT_ORDER.indexOf(a.beat) - BEAT_ORDER.indexOf(b.beat)
  )
  if (orderedDiff.length) {
    chapters.push({
      id: 'ch-moved',
      label: 'Moved',
      heading: 'The six layers',
      sub: 'Frontier APIs · India infra · regulation · Indic models · talent · enterprise.',
      blocks: [
        {
          type: 'layers',
          items: orderedDiff.map((d) => ({
            t: BEAT_LABEL[d.beat],
            d: inline(d.bullet),
          })),
        },
      ],
    })
  }

  // CH03 — For you (persona)
  if (payload.persona) {
    const personaBlocks: Block[] = [
      {
        type: 'archetype',
        quote: payload.persona.archetype,
        paras: payload.persona.translation
          .split(/\n\s*\n/)
          .map((p) => inline(p.trim()))
          .filter(Boolean),
      },
    ]
    if (payload.persona.inr_math) {
      const { rows, conclusion } = parseInrMath(payload.persona.inr_math)
      if (rows.length) {
        personaBlocks.push({
          type: 'math',
          caption: 'THE MATH',
          cols: ['METRIC', 'TODAY', 'PROJECTED'],
          rows,
        })
      }
      if (conclusion) {
        personaBlocks.push({ type: 'prose', html: `<p>${inline(conclusion)}</p>` })
      }
    }
    // `also_for` is intentionally NOT rendered. Fresh-model audit + CLAUDE.md
    // rule #2 flagged it as equal-weight failure mode: a watered-down
    // paragraph per adjacent archetype signals the writer couldn't commit
    // to one persona. Better: one archetype, deep — reader self-translates.
    // Synthesizer Round 2 will stop generating it; until then we just
    // suppress the render here.
    chapters.push({
      id: 'ch-foryou',
      label: 'For you',
      heading: 'Written for this week',
      sub: 'One archetype. Deep. No watered-down adjacents.',
      blocks: personaBlocks,
    })
  }

  // CH04 — Steal this (production hack)
  if (payload.production_hack) {
    chapters.push({
      id: 'ch-steal',
      label: 'Steal',
      heading: payload.production_hack.title,
      sub: 'One technique from the literature. Ship Monday.',
      blocks: [
        {
          type: 'steal',
          body: `<strong>Why it matters.</strong> ${inline(payload.production_hack.why_it_matters)}<br/><br/><strong>How to apply.</strong> ${inline(payload.production_hack.how_to_apply)}<br/><br/>Source: <a href="${escapeHtml(safeUrl(payload.production_hack.source_url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.production_hack.source_label)}</a>`,
          chips: [],
        },
      ],
    })
  }

  // CH05 — The calls (Ship · Hold · Kill in full). The synthesizer freely
  // emits markdown in rationale text, so we route through inline() (which
  // escapes first) and the renderer dangerouslySetInnerHTMLs the result.
  if (chosen) {
    const callItems: Array<{ c: 'HIGH' | 'MED' | 'LOW'; t: string }> = []
    if (chosen.ship)
      callItems.push({ c: 'HIGH', t: inline(`${chosen.ship.label}. ${chosen.ship.rationale}`) })
    if (chosen.hold)
      callItems.push({ c: 'MED', t: inline(`${chosen.hold.label}. ${chosen.hold.rationale}`) })
    if (chosen.kill)
      callItems.push({ c: 'LOW', t: inline(`${chosen.kill.label}. ${chosen.kill.rationale}`) })
    if (callItems.length) {
      chapters.push({
        id: 'ch-calls',
        label: 'Calls',
        heading: 'Three moves this week',
        sub: 'One to ship. One to wait on. One to kill.',
        blocks: [{ type: 'calls', items: callItems }],
      })
    }
  }

  // CH06 — Your reading list (keep · skip)
  if (payload.keep_skip?.keep?.length || payload.keep_skip?.skip?.length) {
    chapters.push({
      id: 'ch-reading',
      label: 'Reading',
      heading: 'What to read · what to skip',
      sub: 'Three pieces worth your half-hour. Five everyone is loud about that you can ignore.',
      blocks: [
        {
          type: 'readskip',
          read: (payload.keep_skip?.keep ?? []).map((s) => inline(s)),
          skip: (payload.keep_skip?.skip ?? []).map((s) => inline(s)),
        },
      ],
    })
  }

  return {
    kind: 'BRIEF',
    no: meta.no,
    heroDate: fmtDate(meta.createdAt),
    read: '6 MIN',
    title: payload.headline ?? payload.throughline ?? '—',
    dek: payload.throughline ?? '',
    lede: paraToHtml(payload.throughline_lead),
    chapters,
    appendix: payload.appendix ?? null,
    signal_of_the_week: payload.signal_of_the_week ?? null,
    explained_simply: payload.explained_simply ?? null,
    production_questions: payload.production_questions ?? null,
  }
}

export function deepDiveToRenderable(
  payload: DeepDivePayload,
  meta: { no: string; createdAt: string | null }
): RenderableIssue {
  const chapters: Chapter[] = []

  // CH01 — The assumption
  if (payload.assumption) {
    chapters.push({
      id: 'ch-assumption',
      label: 'Belief',
      heading: 'Here’s what everyone thinks',
      blocks: [
        {
          type: 'pullquote',
          text: payload.assumption,
        },
      ],
    })
  }

  // CH02..N — Evidence sections
  payload.evidence_sections?.forEach((section, idx) => {
    chapters.push({
      id: `ch-ev-${idx + 1}`,
      label: section.heading.split(' ').slice(0, 2).join(' '),
      heading: section.heading,
      blocks: [{ type: 'prose', html: mdToHtml(section.body) }],
    })
  })

  // India twist
  if (payload.india_twist) {
    chapters.push({
      id: 'ch-twist',
      label: 'India',
      heading: 'What changes when you re-run this for India',
      blocks: [{ type: 'prose', html: mdToHtml(payload.india_twist) }],
    })
  }

  // Monday actions
  if (payload.monday_actions?.length) {
    chapters.push({
      id: 'ch-monday',
      label: 'Monday',
      heading: 'Three moves to make this sprint',
      blocks: [
        {
          type: 'calls',
          items: payload.monday_actions.map((a) => ({
            c: 'HIGH' as const,
            t: a.action,
          })),
        },
      ],
    })
  }

  // Counter-positions
  if (payload.counter_positions?.length) {
    chapters.push({
      id: 'ch-counter',
      label: 'Wrong?',
      heading: 'The steel-manned counter',
      blocks: payload.counter_positions.map((cp) => ({
        type: 'prose' as const,
        html: `<p><strong>${inline(cp.claim)}</strong></p><p>${inline(cp.steel_man)} <a href="${escapeHtml(safeUrl(cp.best_link))}" target="_blank" rel="noopener noreferrer">[link]</a></p>`,
      })),
    })
  }

  // Further reading
  if (payload.further_reading?.length) {
    chapters.push({
      id: 'ch-reading',
      label: 'More',
      heading: 'Where to go deeper',
      blocks: [
        {
          type: 'prose',
          html: `<ol>${payload.further_reading.map((r) => `<li><a href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.annotation)}</a></li>`).join('')}</ol>`,
        },
      ],
    })
  }

  // Compute read time
  const words = payload.evidence_sections
    ?.map((s) => s.body)
    .join(' ')
    .split(/\s+/).length ?? 0
  const readMin = Math.max(8, Math.round(words / 200))

  return {
    kind: 'DEEP DIVE',
    no: meta.no,
    heroDate: fmtDate(meta.createdAt),
    read: `${readMin} MIN`,
    title: payload.title,
    dek: payload.subtitle,
    lede: paraToHtml(payload.cold_open),
    chapters,
    appendix:
      (payload as DeepDivePayload & { appendix?: AppendixPack | null }).appendix ?? null,
  }
}

// Tiny markdown → HTML for inline [text](url), _em_, **strong**, and paragraph splits.
function mdToHtml(src: string): string {
  const paras = src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return paras
    .map((p) => `<p>${inline(p)}</p>`)
    .join('')
}

