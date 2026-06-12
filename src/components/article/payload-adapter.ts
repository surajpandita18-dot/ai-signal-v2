// Adapter — turns our existing IssuePayload (weekly brief) and DeepDivePayload
// (long-form essay) into the Figr block-based chapter shape.
//
// The synthesizer prompts still produce the original payload shapes; we don't
// rewrite the writer agents. The rendering layer reshapes for the new design.

import type {
  IssuePayload,
  ChosenCalls,
  DeepDivePayload,
  Beat,
} from '../../../db/types/database'
import type { Block } from './blocks'

export interface Chapter {
  id: string
  label: string // short — for nav
  kicker: string // long — "AT A GLANCE"
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
function paraToHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Parse the synth's INR math block into Math block rows.
// Each "Label: value" line becomes a row; the trailing interpretation is dropped
// (it's surfaced as a sub paragraph instead).
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
    const idx = line.indexOf(':')
    if (idx > 0 && idx < 90) {
      const label = line.slice(0, idx).trim()
      const value = line
        .slice(idx + 1)
        .trim()
        .replace(/\.$/, '')
      if (/[₹$%]|\b\d+(\.\d+)?\b/.test(value)) {
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

  // CH01 — At a glance (Ship · Hold · Kill summary)
  const glanceItems: string[] = []
  for (const k of ['ship', 'hold', 'kill'] as const) {
    const label = chosen?.[k]?.label ?? payload.shk_candidates?.[k]?.[0]?.label
    if (label) {
      const verb = k[0].toUpperCase() + k.slice(1)
      glanceItems.push(`<strong>${verb}</strong> — ${escapeHtml(label)}`)
    }
  }
  if (glanceItems.length) {
    chapters.push({
      id: 'ch-glance',
      label: 'Glance',
      kicker: 'AT A GLANCE',
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
      kicker: 'WHAT MOVED',
      heading: 'The six layers',
      sub: 'Frontier APIs · India infra · regulation · Indic models · talent · enterprise.',
      blocks: [
        {
          type: 'layers',
          items: orderedDiff.map((d) => ({
            t: BEAT_LABEL[d.beat],
            d: escapeHtml(d.bullet),
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
          .map((p) => escapeHtml(p.trim()))
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
        personaBlocks.push({ type: 'prose', html: `<p>${escapeHtml(conclusion)}</p>` })
      }
    }
    if (payload.also_for?.length) {
      personaBlocks.push({
        type: 'sectionhead',
        text: 'Also reading',
        sub: 'Adjacent archetypes still get value from this shift.',
      })
      for (const b of payload.also_for) {
        personaBlocks.push({
          type: 'archetype',
          quote: b.archetype,
          paras: [escapeHtml(b.take)],
        })
      }
    }
    chapters.push({
      id: 'ch-foryou',
      label: 'For you',
      kicker: 'FOR YOU',
      heading: 'Written for this week',
      sub: 'One archetype, deep. Adjacent ones get a paragraph.',
      blocks: personaBlocks,
    })
  }

  // CH04 — Steal this (production hack)
  if (payload.production_hack) {
    chapters.push({
      id: 'ch-steal',
      label: 'Steal',
      kicker: 'STEAL THIS',
      heading: payload.production_hack.title,
      sub: 'One technique from the literature. Ship Monday.',
      blocks: [
        {
          type: 'steal',
          kicker: 'FROM THE LITERATURE',
          body: `<strong>Why it matters.</strong> ${escapeHtml(payload.production_hack.why_it_matters)}<br/><br/><strong>How to apply.</strong> ${escapeHtml(payload.production_hack.how_to_apply)}<br/><br/>Source: <a href="${escapeHtml(payload.production_hack.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.production_hack.source_label)}</a>`,
          chips: [],
        },
      ],
    })
  }

  // CH05 — The calls (Ship · Hold · Kill in full)
  if (chosen) {
    const callItems: Array<{ c: 'HIGH' | 'MED' | 'LOW'; t: string }> = []
    if (chosen.ship)
      callItems.push({ c: 'HIGH', t: `${chosen.ship.label}. ${chosen.ship.rationale}` })
    if (chosen.hold)
      callItems.push({ c: 'MED', t: `${chosen.hold.label}. ${chosen.hold.rationale}` })
    if (chosen.kill)
      callItems.push({ c: 'LOW', t: `${chosen.kill.label}. ${chosen.kill.rationale}` })
    if (callItems.length) {
      chapters.push({
        id: 'ch-calls',
        label: 'Calls',
        kicker: 'THE CALLS',
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
      kicker: 'YOUR READING LIST',
      heading: 'What to read · what to skip',
      sub: 'Three pieces worth your half-hour. Five everyone is loud about that you can ignore.',
      blocks: [
        {
          type: 'readskip',
          read: (payload.keep_skip?.keep ?? []).map(escapeHtml),
          skip: (payload.keep_skip?.skip ?? []).map(escapeHtml),
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
      kicker: 'THE ASSUMPTION',
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
      kicker: `EVIDENCE 0${idx + 1}`,
      heading: section.heading,
      blocks: [{ type: 'prose', html: mdToHtml(section.body) }],
    })
  })

  // India twist
  if (payload.india_twist) {
    chapters.push({
      id: 'ch-twist',
      label: 'India',
      kicker: 'INDIAN-CONTEXT WEDGE',
      heading: 'What changes when you re-run this for India',
      blocks: [{ type: 'prose', html: mdToHtml(payload.india_twist) }],
    })
  }

  // Monday actions
  if (payload.monday_actions?.length) {
    chapters.push({
      id: 'ch-monday',
      label: 'Monday',
      kicker: 'WHAT TO DO MONDAY',
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
      kicker: 'WHAT I MIGHT BE WRONG ABOUT',
      heading: 'The steel-manned counter',
      blocks: payload.counter_positions.map((cp) => ({
        type: 'prose' as const,
        html: `<p><strong>${escapeHtml(cp.claim)}</strong></p><p>${escapeHtml(cp.steel_man)} <a href="${escapeHtml(cp.best_link)}" target="_blank" rel="noopener noreferrer">[link]</a></p>`,
      })),
    })
  }

  // Further reading
  if (payload.further_reading?.length) {
    chapters.push({
      id: 'ch-reading',
      label: 'More',
      kicker: 'FURTHER READING',
      heading: 'Where to go deeper',
      blocks: [
        {
          type: 'prose',
          html: `<ol>${payload.further_reading.map((r) => `<li><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.annotation)}</a></li>`).join('')}</ol>`,
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
  }
}

// Tiny markdown → HTML for inline [text](url), _em_, **strong**, and paragraph splits.
function mdToHtml(src: string): string {
  const paras = src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return paras
    .map((p) => `<p>${inline(p)}</p>`)
    .join('')
}

function inline(s: string): string {
  const escaped = escapeHtml(s)
  return escaped
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}
