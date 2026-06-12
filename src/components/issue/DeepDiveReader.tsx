// DeepDiveReader — renders a DeepDivePayload as a single-column 680px essay.
//
// Layout follows the locked design system: warm paper bg, ink body, indigo
// accent for the H1 + section rules, terracotta clay for the assumption
// pull quote left border. Body is Merriweather serif at 18-19px / 1.7.
// Headings use the display font; eyebrows + Monday-action numbers use mono.
//
// Inline markdown links [text](url) are rendered as anchor tags. Paragraph
// breaks are derived from "\n\n" in the body strings. Other markdown
// (bold/italic/headings) inside body strings is rendered as plain markdown
// where it shows up, but the model is instructed to stick to plain prose +
// inline links so we keep the parser minimal.

import { ChapterNav, type ChapterNavItem } from '@/components/ChapterNav'
import type { DeepDivePayload } from '../../../db/types/database'

interface Props {
  payload: DeepDivePayload
  issueNumberPadded: string
  issueDate: string
}

// ─────────────────────────────────────────────────────────────────────
// Inline markdown renderer
// Supports:
//   [text](url)  → <a>
//   _text_        → <em>
//   *text*        → <em>
//   **text**      → <strong>
// Everything else is plain text.
// ─────────────────────────────────────────────────────────────────────

type Node =
  | { kind: 'text'; value: string }
  | { kind: 'link'; text: string; url: string }
  | { kind: 'em'; children: Node[] }
  | { kind: 'strong'; children: Node[] }

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/
const STRONG_RE = /\*\*([^*]+)\*\*/
const EM_STAR_RE = /\*([^*]+)\*/
const EM_UNDER_RE = /_([^_]+)_/

function parseInline(text: string): Node[] {
  // Try each regex in priority order. Return [pre, node, post] then recurse.
  const tryMatch = (
    re: RegExp,
    build: (m: RegExpMatchArray) => Node
  ): Node[] | null => {
    const m = text.match(re)
    if (!m || m.index === undefined) return null
    const pre = text.slice(0, m.index)
    const post = text.slice(m.index + m[0].length)
    const nodes: Node[] = []
    if (pre) nodes.push(...parseInline(pre))
    nodes.push(build(m))
    if (post) nodes.push(...parseInline(post))
    return nodes
  }

  return (
    tryMatch(LINK_RE, (m) => ({ kind: 'link', text: m[1], url: m[2] })) ??
    tryMatch(STRONG_RE, (m) => ({ kind: 'strong', children: parseInline(m[1]) })) ??
    tryMatch(EM_STAR_RE, (m) => ({ kind: 'em', children: parseInline(m[1]) })) ??
    tryMatch(EM_UNDER_RE, (m) => ({ kind: 'em', children: parseInline(m[1]) })) ?? [
      { kind: 'text', value: text },
    ]
  )
}

function renderNodes(nodes: Node[], keyPrefix = 'n'): React.ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`
    switch (n.kind) {
      case 'text':
        return <span key={key}>{n.value}</span>
      case 'link':
        return (
          <a
            key={key}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline decoration-accent/35 underline-offset-2 transition hover:decoration-accent"
          >
            {n.text}
          </a>
        )
      case 'em':
        return <em key={key}>{renderNodes(n.children, key)}</em>
      case 'strong':
        return <strong key={key}>{renderNodes(n.children, key)}</strong>
    }
  })
}

function splitParas(s: string): string[] {
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function Paragraphs({ source }: { source: string }) {
  return (
    <>
      {splitParas(source).map((p, i) => (
        <p
          key={i}
          className="font-serif text-[18px] leading-[1.7] text-ink sm:text-[19px]"
        >
          {renderNodes(parseInline(p))}
        </p>
      ))}
    </>
  )
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function estimateReadMinutes(payload: DeepDivePayload): number {
  const words = countWords(
    [
      payload.cold_open,
      payload.assumption,
      ...payload.evidence_sections.map((s) => s.body),
      payload.india_twist,
      ...payload.monday_actions.map((a) => a.action),
      ...payload.counter_positions.map((c) => c.steel_man),
    ].join(' ')
  )
  return Math.max(8, Math.round(words / 220))
}

// 2px indigo horizontal rule between sections.
function SectionRule() {
  return <hr className="my-12 h-[2px] w-16 border-0 bg-accent sm:my-14" />
}

export default function DeepDiveReader({
  payload,
  issueNumberPadded,
  issueDate,
}: Props) {
  const readMinutes = estimateReadMinutes(payload)

  // Slugify evidence section headings for sticky nav.
  const sectionAnchors = payload.evidence_sections.map((s, i) => ({
    id: `evidence-${i + 1}`,
    label: s.heading,
  }))

  const chapterList: ChapterNavItem[] = [
    { id: 'dd-open', num: '01', label: 'Open' },
    { id: 'dd-assumption', num: '02', label: 'Belief' },
    { id: 'dd-evidence', num: '03', label: 'Proof' },
    { id: 'dd-twist', num: '04', label: 'India' },
    { id: 'dd-monday', num: '05', label: 'Monday' },
    { id: 'dd-counter', num: '06', label: 'Wrong?' },
    { id: 'dd-reading', num: '07', label: 'More' },
  ]

  return (
    <article className="bg-paper">
      {/* Hero — issue meta + title + subtitle */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-[680px] px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent sm:text-[11px]">
              Deep Dive · {issueNumberPadded}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              {issueDate}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              · {readMinutes} min read
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              · for {payload.primary_audience}
            </span>
          </div>
          <h1 className="mt-5 font-display text-[28px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[40px] sm:leading-[1.05] lg:text-[52px] lg:leading-[1.04]">
            {payload.title}
          </h1>
          <p className="mt-6 max-w-[640px] font-display text-[19px] italic font-normal leading-[1.45] text-ink/75 sm:text-[22px] sm:leading-[1.4] lg:text-[24px]">
            {payload.subtitle}
          </p>
        </div>
      </header>

      <ChapterNav chapters={chapterList} />

      {/* Cold open */}
      <section id="dd-open" className="scroll-mt-16">
        <div className="mx-auto max-w-[680px] px-4 pt-12 sm:px-6 sm:pt-16">
          <Paragraphs source={payload.cold_open} />
        </div>
      </section>

      {/* The assumption — terracotta clay left border pull quote */}
      <section id="dd-assumption" className="scroll-mt-16">
        <div className="mx-auto max-w-[680px] px-4 sm:px-6">
          <SectionRule />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            The assumption
          </p>
          <div className="mt-5 border-l-[3px] border-accent-2 bg-paper-elev/60 px-6 py-6 sm:px-8 sm:py-7">
            <div className="space-y-4">
              <Paragraphs source={payload.assumption} />
            </div>
          </div>
        </div>
      </section>

      {/* Evidence stack */}
      <section id="dd-evidence" className="scroll-mt-16">
        <div className="mx-auto max-w-[680px] px-4 sm:px-6">
          <SectionRule />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            The evidence
          </p>
          {payload.evidence_sections.map((s, i) => (
            <div key={i} id={sectionAnchors[i].id} className="mt-10 scroll-mt-16 first:mt-6">
              <h2 className="font-display text-[24px] font-bold leading-[1.2] tracking-tight text-ink sm:text-[28px]">
                {s.heading}
              </h2>
              <div className="mt-5 space-y-5">
                <Paragraphs source={s.body} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* India twist */}
      <section id="dd-twist" className="scroll-mt-16">
        <div className="mx-auto max-w-[680px] px-4 sm:px-6">
          <SectionRule />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            The Indian-context twist
          </p>
          <h2 className="mt-4 font-display text-[24px] font-bold leading-[1.2] tracking-tight text-ink sm:text-[28px]">
            What changes when you re-run it for India
          </h2>
          <div className="mt-5 space-y-5">
            <Paragraphs source={payload.india_twist} />
          </div>
        </div>
      </section>

      {/* Monday actions */}
      <section id="dd-monday" className="scroll-mt-16">
        <div className="mx-auto max-w-[680px] px-4 sm:px-6">
          <SectionRule />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            What to do Monday
          </p>
          <h2 className="mt-4 font-display text-[24px] font-bold leading-[1.2] tracking-tight text-ink sm:text-[28px]">
            Three concrete moves
          </h2>
          <ol className="mt-6 space-y-6">
            {payload.monday_actions.map((a) => (
              <li key={a.number} className="flex gap-5">
                <span className="font-mono text-[28px] font-light leading-none text-accent sm:text-[32px]">
                  {String(a.number).padStart(2, '0')}
                </span>
                <p className="flex-1 font-serif text-[18px] leading-[1.7] text-ink sm:text-[19px]">
                  {renderNodes(parseInline(a.action))}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Counter positions */}
      {payload.counter_positions.length > 0 ? (
        <section id="dd-counter" className="scroll-mt-16">
          <div className="mx-auto max-w-[680px] px-4 sm:px-6">
            <SectionRule />
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-2">
              What I might be wrong about
            </p>
            <div className="mt-6 space-y-7">
              {payload.counter_positions.map((c, i) => (
                <div key={i} className="border-l-[3px] border-accent-2/70 pl-5">
                  <p className="font-display text-[17px] italic leading-snug text-ink sm:text-[18px]">
                    {c.claim}{' '}
                    <a
                      href={c.best_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] not-italic text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    >
                      [source]
                    </a>
                  </p>
                  <p className="mt-3 font-serif text-[16px] leading-[1.7] text-body sm:text-[17px]">
                    {renderNodes(parseInline(c.steel_man))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Further reading — footnotes-style */}
      {payload.further_reading.length > 0 ? (
        <section id="dd-reading" className="scroll-mt-16">
          <div className="mx-auto max-w-[680px] px-4 sm:px-6">
            <SectionRule />
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Further reading
            </p>
            <ol className="mt-6 space-y-4 border-t border-line pt-6">
              {payload.further_reading.map((r, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-mono text-[12px] font-semibold text-muted">
                    [{String(i + 1).padStart(2, '0')}]
                  </span>
                  <span className="flex-1 font-serif text-[15px] leading-[1.6] text-body sm:text-[16px]">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent underline decoration-accent/35 underline-offset-2 hover:decoration-accent"
                    >
                      {r.annotation}
                    </a>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* Closure — inline on paper, not a full-bleed dark band. Dark band looks
          like an empty void next to the dark Shell footer on phone (esp. dark
          mode). A bordered italic moment on paper reads as the editorial
          send-off without making the bottom feel cut off. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[680px] px-4 py-10 sm:px-6 sm:py-12">
          <p className="font-display text-[19px] italic leading-[1.5] text-ink/85 sm:text-[22px]">
            —— That&rsquo;s the dive. Argue back at me by replying to the email.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${payload.title} — AI Signal deep-dive`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded bg-ink px-5 py-2.5 font-display text-[13px] font-semibold text-paper transition hover:bg-accent"
            >
              Share on WhatsApp
            </a>
            <a
              href="/subscribe"
              className="inline-flex items-center rounded border border-line px-5 py-2.5 font-display text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              Get next deep-dive
            </a>
          </div>
        </div>
      </section>
    </article>
  )
}
