// Public web reader — locked design system, magazine-style layout.
// Mobile-first. Full-bleed dark masthead + big cover + breathing room between sections.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { isSubscribed } from '@/lib/subscription'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ChapterNav, type ChapterNavItem } from '@/components/ChapterNav'
import { ReadingProgress } from '@/components/ReadingProgress'
import { AnimatedValue } from '@/components/AnimatedValue'
import { SelectionShare } from '@/components/SelectionShare'
import type { Beat, ChosenCalls, IssuePayload } from '../../../../db/types/database'

export const dynamic = 'force-dynamic'

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
] as const

const KIND_LABEL = { ship: 'SHIP', hold: 'HOLD', kill: 'KILL' } as const
const KIND_ACCENT = {
  ship: 'border-accent',
  hold: 'border-muted',
  kill: 'border-accent-2',
} as const

function formatIssueDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()
}

function estimateReadTime(payload: IssuePayload, chosen: ChosenCalls | null): number {
  const words = [
    payload.headline ?? '',
    payload.throughline ?? '',
    payload.throughline_lead ?? '',
    ...(payload.six_layer_diff ?? []).map((d) => d.bullet),
    payload.persona?.archetype ?? '',
    payload.persona?.translation ?? '',
    payload.persona?.inr_math ?? '',
    ...(payload.also_for ?? []).flatMap((b) => [b.archetype, b.take]),
    payload.production_hack?.title ?? '',
    payload.production_hack?.why_it_matters ?? '',
    payload.production_hack?.how_to_apply ?? '',
    ...(chosen
      ? (['ship', 'hold', 'kill'] as const).flatMap((k) =>
          chosen[k] ? [chosen[k]!.label, chosen[k]!.rationale] : []
        )
      : []),
    ...(payload.keep_skip?.keep ?? []),
    ...(payload.keep_skip?.skip ?? []),
  ]
    .join(' ')
    .trim()
    .split(/\s+/).length
  return Math.max(3, Math.round(words / 200))
}

// Parse the synthesizer's free-form INR math block into structured rows.
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

function splitParagraphs(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

// Fallback: derive a short headline if synthesizer didn't produce one yet.
function deriveHeadline(payload: IssuePayload): string {
  if (payload.headline) return payload.headline
  // Best-effort: first clause of throughline (before em-dash or comma) capped at 9 words.
  const t = payload.throughline ?? ''
  const firstClause = t.split(/[—,]/)[0].trim()
  const words = firstClause.split(/\s+/)
  if (words.length <= 9) return firstClause
  return words.slice(0, 8).join(' ') + '…'
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  const supabase = createAdminSupabaseClient()
  const subscribed = await isSubscribed()

  const { data: issue } = await supabase.from('issues').select('*').eq('id', issueId).single()
  if (!issue) notFound()

  const payload: IssuePayload | null = issue.payload
  const chosen: ChosenCalls | null = issue.chosen_calls

  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .in('status', ['drafted', 'awaiting_human'])
    .lte('created_at', issue.created_at)
  const issueNumber = count ?? 1
  const issueNumberPadded = String(issueNumber).padStart(3, '0')
  const issueDate = formatIssueDate(issue.created_at)

  if (!payload) {
    return (
      <Shell subscribed={subscribed}>
        <div className="mx-auto max-w-reader px-5 py-16">
          <p className="meta">No payload yet.</p>
        </div>
      </Shell>
    )
  }

  const headline = deriveHeadline(payload)
  const readTime = estimateReadTime(payload, chosen)
  const orderedDiff = [...(payload.six_layer_diff ?? [])].sort(
    (a, b) => BEAT_ORDER.indexOf(a.beat) - BEAT_ORDER.indexOf(b.beat)
  )

  // TL;DR strip — Ship · Hold · Kill summary for skim readers
  const tldrItems: Array<{ verb: string; label: string }> = []
  for (const kind of ['ship', 'hold', 'kill'] as const) {
    const label = chosen?.[kind]?.label ?? payload.shk_candidates?.[kind]?.[0]?.label
    if (label) tldrItems.push({ verb: kind[0].toUpperCase() + kind.slice(1), label })
  }

  // Sticky chapter nav — skip 04 if production_hack is null.
  const chapterList: ChapterNavItem[] = [
    { id: 'chapter-01', num: '01', label: 'Glance' },
    { id: 'chapter-02', num: '02', label: 'Moved' },
    { id: 'chapter-03', num: '03', label: 'For you' },
    ...(payload.production_hack
      ? [{ id: 'chapter-04', num: '04', label: 'Steal' }]
      : []),
    { id: 'chapter-05', num: '05', label: 'Calls' },
    { id: 'chapter-06', num: '06', label: 'Reading' },
  ]

  return (
    <Shell subscribed={subscribed}>
      {/* COVER — magazine area, mobile-first scaling */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-reader px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-accent sm:text-[11px]">
              Issue {issueNumberPadded}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              {issueDate}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              · {readTime} min read
            </span>
          </div>

          {/* Catchy headline — scales 28 → 40 → 56 */}
          <h1 className="mt-5 font-display text-[28px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[40px] sm:leading-[1.05] lg:text-[56px] lg:leading-[1.02]">
            {headline}
          </h1>

          {/* Throughline as subhead / dek */}
          {payload.throughline && payload.throughline !== headline ? (
            <p className="mt-5 max-w-[600px] font-body text-[17px] italic leading-snug text-ink/80 sm:text-[20px] lg:text-[22px]">
              {payload.throughline}
            </p>
          ) : null}

          {/* Lead paragraph */}
          {payload.throughline_lead ? (
            <p className="mt-6 max-w-[640px] font-body text-[16px] leading-relaxed text-ink/90 sm:mt-8 sm:text-[18px]">
              {payload.throughline_lead}
            </p>
          ) : null}
        </div>
      </section>

      {/* STICKY CHAPTER NAV */}
      <ChapterNav chapters={chapterList} />

      {/* TL;DR — if you only read this */}
      {tldrItems.length > 0 ? (
        <section id="chapter-01" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <SectionOpener
              chapter="Chapter 01 — At a glance"
              title="If you only read this"
              dek="The three moves you should walk away with."
            />
            <div className="rounded-md border-l-4 border-accent bg-paper-elev px-6 py-7 sm:px-8 sm:py-8">
              <ul className="space-y-3">
                {tldrItems.map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-3 font-body text-[16px] leading-relaxed text-ink sm:text-[17px]"
                  >
                    <span className="font-mono font-semibold text-accent">→</span>
                    <span>
                      <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
                        {t.verb}
                      </span>
                      <span className="ml-2">{t.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* THE DIFF — card-style: PAPER_ELEV bg + section-colored left border */}
      {orderedDiff.length > 0 ? (
        <section id="chapter-02" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-reader px-4 py-12 sm:px-6 sm:py-16">
            <SectionOpener
              chapter="Chapter 02 — What moved"
              title="The six layers"
              dek="Frontier APIs · India infra · regulation · Indic models · talent · enterprise. Card colour signals the layer."
            />
            <div className="space-y-5 sm:space-y-6">
              {orderedDiff.map((d, i) => {
                const num = String(i + 1).padStart(2, '0')
                const sectionId = `diff-${d.beat}`
                const m = d.bullet.match(/^([^.!?]+[.!?])\s+([\s\S]+)$/)
                const lead = m ? m[1].trim() : d.bullet
                const rest = m ? m[2].trim() : ''
                const isWarm =
                  d.beat === 'india-infra' || d.beat === 'indic-models' || d.beat === 'enterprise-deals'
                const borderCls = isWarm ? 'border-accent-2' : 'border-accent'
                const accentCls = isWarm ? 'text-accent-2' : 'text-accent'
                return (
                  <article
                    key={sectionId}
                    id={sectionId}
                    className={`rounded-md border-l-4 ${borderCls} bg-paper-elev px-5 py-6 sm:px-7 sm:py-7`}
                  >
                    <p
                      className={`font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${accentCls} sm:text-[11px]`}
                    >
                      {BEAT_LABEL[d.beat]}
                    </p>
                    <p
                      className={`mt-1 font-mono text-[32px] font-light leading-none ${accentCls} sm:text-[40px]`}
                    >
                      {num}
                    </p>
                    <p className="mt-4 font-body text-[17px] font-bold leading-snug text-ink sm:text-[19px]">
                      {lead}
                    </p>
                    {rest ? (
                      <p className="mt-3 font-body text-[15px] leading-relaxed text-body sm:text-[16px]">
                        {rest}
                      </p>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* PERSONA — primary archetype card */}
      {payload.persona ? (
        <section id="chapter-03" className="scroll-mt-16 border-b border-line bg-paper/40">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <SectionOpener
              chapter="Chapter 03 — For you"
              title="Written for this week"
              dek="One archetype, deep. Two more get a paragraph each below."
            />
            <div className="rounded-md border-l-4 border-accent bg-paper-elev px-6 py-8 sm:px-9 sm:py-10">
              <p className="font-display text-[19px] italic leading-snug text-ink sm:text-[22px]">
                {payload.persona.archetype}
              </p>

              <div className="mt-6 max-w-[640px] space-y-4">
                {splitParagraphs(payload.persona.translation).map((para, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? 'font-body text-[17px] font-medium leading-relaxed text-ink sm:text-[18px]'
                        : 'font-body text-[16px] leading-relaxed text-ink/95 sm:text-[17px]'
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>

              {payload.persona.inr_math ? (() => {
                const math = parseInrMath(payload.persona.inr_math)
                if (!math.rows.length && !math.conclusion) return null
                return (
                  <div className="mt-8 border-t border-dashed border-muted/50 pt-6">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-2">
                      The math
                    </p>
                    {math.rows.length ? (
                      <dl className="mt-4 divide-y divide-line">
                        {math.rows.map((r, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-3"
                          >
                            <dt className="font-body text-[14px] leading-snug text-body sm:text-[15px]">
                              {r.label}
                            </dt>
                            <dd className="whitespace-nowrap font-mono text-[14px] font-semibold text-accent sm:text-[15px]">
                              <AnimatedValue value={r.value} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {math.conclusion ? (
                      <p className="mt-4 font-body text-[15px] italic leading-relaxed text-ink sm:text-[16px]">
                        {math.conclusion}
                      </p>
                    ) : null}
                  </div>
                )
              })() : null}
            </div>

            {/* ALSO READING — short briefs for adjacent archetypes */}
            {payload.also_for?.length ? (
              <div className="mt-10">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-2">
                  Also reading · other builders
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {payload.also_for.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-md border-l-[3px] border-accent-2 bg-paper-elev px-5 py-5"
                    >
                      <p className="font-display text-[15px] italic leading-snug text-ink">
                        {b.archetype}
                      </p>
                      <p className="mt-3 font-body text-[15px] leading-relaxed text-body">
                        {b.take}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* PRODUCTION HACK — weekly "steal this" technique from the literature */}
      {payload.production_hack ? (
        <section id="chapter-04" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <SectionOpener
              chapter="Chapter 04 — Steal this"
              title="Production hack of the week"
              dek="One technique from the literature. Ship it Monday."
            />
            <div className="relative rounded-md border-l-4 border-r-4 border-l-accent border-r-accent-2 bg-paper-elev px-6 py-8 sm:px-9 sm:py-10">
              <span
                aria-hidden="true"
                className="absolute right-6 top-6 inline-flex items-center gap-1.5"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-accent-2/40"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-muted/40"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-accent/40"></span>
              </span>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-2">
                From the literature
              </p>
              <h3 className="mt-2 font-display text-[22px] font-bold leading-snug tracking-tight text-ink sm:text-[26px]">
                {payload.production_hack.title}
              </h3>
              <div className="mt-6">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Why it matters
                </p>
                <p className="mt-2 font-body text-[16px] leading-relaxed text-ink sm:text-[17px]">
                  {payload.production_hack.why_it_matters}
                </p>
              </div>
              <div className="mt-6">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  How to apply
                </p>
                <div className="mt-2 rounded-sm bg-ink/[0.04] px-4 py-3 font-body text-[16px] leading-relaxed text-ink sm:text-[17px]">
                  <span className="font-mono text-accent">$</span>&nbsp;
                  {payload.production_hack.how_to_apply}
                </div>
              </div>
              <p className="mt-7 border-t border-dashed border-muted/50 pt-4 font-mono text-[12px] text-muted">
                Source:{' '}
                <a
                  href={payload.production_hack.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                >
                  {payload.production_hack.source_label}
                </a>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* SHIP / HOLD / KILL — 3 distinct cards with kind-specific accents */}
      {chosen ? (
        <section id="chapter-05" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <SectionOpener
              chapter="Chapter 05 — The calls"
              title="Three moves this week"
              dek="One to ship. One to wait on. One to kill."
            />
            <div className="grid gap-5 sm:grid-cols-3">
              {(['ship', 'hold', 'kill'] as const).map((kind) => {
                const c = chosen[kind]
                if (!c) return null
                const accentCls =
                  kind === 'ship'
                    ? 'border-accent text-accent'
                    : kind === 'kill'
                      ? 'border-accent-2 text-accent-2'
                      : 'border-muted text-muted'
                const [borderCls, kickerCls] = accentCls.split(' ')
                return (
                  <div
                    key={kind}
                    id={`shk-${kind}`}
                    className={`rounded-md border-l-4 ${borderCls} bg-paper-elev px-5 py-6 sm:px-6 sm:py-7`}
                  >
                    <p className={`font-mono text-[11px] font-bold uppercase tracking-[0.18em] ${kickerCls}`}>
                      {KIND_LABEL[kind]}
                    </p>
                    <p className="mt-3 font-display text-[17px] font-semibold leading-snug tracking-tight text-ink">
                      {c.label}
                    </p>
                    <p className="mt-3 font-body text-[15px] leading-relaxed text-body">
                      {c.rationale}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* KEEP / SKIP — two cards, accent-coded */}
      {payload.keep_skip?.keep?.length || payload.keep_skip?.skip?.length ? (
        <section id="chapter-06" className="scroll-mt-16 border-b border-line bg-paper/40">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <SectionOpener
              chapter="Chapter 06 — Your reading list"
              title="What to read · What to skip"
              dek="Three pieces worth your half-hour. Five everyone is talking about that you can safely ignore."
            />
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              {payload.keep_skip?.keep?.length ? (
                <div className="rounded-md border-l-4 border-accent bg-paper-elev px-5 py-6 sm:px-6 sm:py-7">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                    Read this week &mdash; signal we didn't have room for
                  </p>
                  <ul className="mt-4 space-y-3">
                    {payload.keep_skip.keep.map((k, i) => (
                      <li
                        key={i}
                        className="flex gap-3 font-body text-[15px] leading-relaxed text-ink/95 sm:text-[16px]"
                      >
                        <span className="font-mono font-semibold text-accent">+</span>
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {payload.keep_skip?.skip?.length ? (
                <div className="rounded-md border-l-4 border-accent-2 bg-paper-elev px-5 py-6 sm:px-6 sm:py-7">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-2">
                    Skip this week &mdash; loud, but not yours to act on
                  </p>
                  <ul className="mt-4 space-y-3">
                    {payload.keep_skip.skip.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-3 font-body text-[15px] leading-relaxed text-body sm:text-[16px]"
                      >
                        <span className="font-mono font-semibold text-accent-2">−</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* CLOSURE + SUBSCRIBE CTA (for first-time readers) + FORWARD CTA (for existing) */}
      <section className="bg-[#0e0c08] text-[#f4efe6]">
        <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
          <p className="font-body text-[20px] italic leading-relaxed text-paper">
            —— That&rsquo;s the shift. You&rsquo;re caught up.
          </p>

          {/* PRIMARY CTA: Subscribe — only for visitors who haven't subscribed yet */}
          {subscribed ? null : (
            <div className="mt-10 rounded-lg border border-paper/15 bg-paper/[0.04] p-6 sm:p-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                Get next Monday&rsquo;s brief
              </p>
              <p className="mt-3 font-display text-[22px] font-semibold leading-snug text-paper sm:text-[26px]">
                One shift. Six layers. Eight minutes. Free.
              </p>
              <p className="mt-3 max-w-[520px] font-body text-[15px] leading-relaxed text-paper/80 sm:text-[16px]">
                The brief for Indian AI builders, PMs, and founders. INR-grounded math, named
                noise to skip, one production hack you can ship Monday.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/subscribe"
                  className="inline-flex items-center rounded bg-accent px-6 py-3 font-display text-[14px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
                >
                  Subscribe — free →
                </a>
                <a
                  href="/"
                  className="inline-flex items-center rounded border border-paper/30 px-6 py-3 font-display text-[14px] font-semibold text-paper/90 transition hover:bg-paper/10"
                >
                  Read past issues
                </a>
              </div>
            </div>
          )}

          {/* SECONDARY: Forward — always shown */}
          <div className={`${subscribed ? 'mt-10' : 'mt-8 border-t border-paper/15 pt-8'} grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end`}>
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-paper/60">
                {subscribed ? 'Forward to one builder' : 'Already subscribed? Forward to one builder.'}
              </p>
              <p className="mt-3 max-w-[480px] font-body text-[15px] leading-relaxed text-paper/75">
                If this lands for someone you work with — co-founder, PM, the engineer thinking about
                migration — send them the link.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${headline} — AI Signal #${issueNumberPadded}: https://getaisignal.org/issue/${issueId}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share this issue on WhatsApp"
                className="inline-flex items-center rounded bg-paper px-5 py-3 font-display text-sm font-semibold text-ink transition hover:bg-accent hover:text-paper"
              >
                WhatsApp
              </a>
              <a
                href={`/issue/${issueId}`}
                aria-label="Open this issue’s canonical URL"
                className="inline-flex items-center rounded border border-paper/40 px-5 py-3 font-display text-sm font-semibold text-paper transition hover:bg-paper/10"
              >
                Copy link
              </a>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  )
}

/* Editorial section opener — chapter kicker + display title + dek.
   Builds magazine-table-of-contents rhythm between cards. */
function SectionOpener({
  chapter,
  title,
  dek,
}: {
  chapter: string
  title: string
  dek?: string
}) {
  return (
    <div className="mb-7 sm:mb-9">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        {chapter}
      </p>
      <h2 className="mt-3 font-display text-[26px] font-bold leading-[1.15] tracking-tight text-ink sm:text-[34px] lg:text-[40px]">
        {title}
      </h2>
      {dek ? (
        <p className="mt-3 max-w-[540px] font-body text-[15px] leading-relaxed text-body sm:text-[16px]">
          {dek}
        </p>
      ) : null}
    </div>
  )
}

/* Site shell — full-bleed dark masthead + footer. */
function Shell({ children, subscribed }: { children: React.ReactNode; subscribed: boolean }) {
  return (
    <>
      <ReadingProgress />
      <SelectionShare />
      <header className="bg-[#0e0c08] text-[#f4efe6]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-[#f4efe6]">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <nav className="hidden gap-6 sm:flex" aria-label="Primary">
              <Link href="/" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
                Issues
              </Link>
              <Link href="/about" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
                About
              </Link>
              {subscribed ? (
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
                  Subscribed ✓
                </span>
              ) : (
                <Link href="/subscribe" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
                  Subscribe
                </Link>
              )}
            </nav>
            <ThemeToggle className="text-paper/80 hover:text-paper" />
            {subscribed ? null : (
              <Link
                href="/subscribe"
                className="rounded bg-paper px-3 py-1.5 font-display text-[12px] font-semibold text-ink sm:hidden"
              >
                Subscribe
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta">
              The India AI Builder&rsquo;s Brief · <span translate="no">getaisignal.org</span>
            </p>
          </div>
          <p className="mt-3 meta">
            Monday mornings. ~1500 words. For Indian AI builders, PMs, founders.
          </p>
          <nav
            aria-label="Footer"
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5"
          >
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink">
              Issues
            </Link>
            <Link href="/about" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink">
              About
            </Link>
            <Link href="/subscribe" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink">
              Subscribe
            </Link>
            <a href="/feed.xml" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink">
              RSS
            </a>
          </nav>
        </div>
      </footer>
    </>
  )
}
