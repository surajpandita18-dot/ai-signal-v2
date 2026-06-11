// Public web reader — locked design system, magazine-style layout.
// Mobile-first. Full-bleed dark masthead + big cover + breathing room between sections.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { Logo } from '@/components/Logo'
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

function estimateReadTime(payload: IssuePayload): number {
  const words = [
    payload.throughline_lead ?? '',
    ...(payload.six_layer_diff ?? []).map((d) => d.bullet),
    payload.persona?.translation ?? '',
    payload.persona?.inr_math ?? '',
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
      <Shell>
        <div className="mx-auto max-w-reader px-5 py-16">
          <p className="meta">No payload yet.</p>
        </div>
      </Shell>
    )
  }

  const headline = deriveHeadline(payload)
  const readTime = estimateReadTime(payload)
  const orderedDiff = [...(payload.six_layer_diff ?? [])].sort(
    (a, b) => BEAT_ORDER.indexOf(a.beat) - BEAT_ORDER.indexOf(b.beat)
  )

  // TL;DR strip — pick the strongest 3 signals: throughline summary + top SHK ship + top SHK kill
  const tldrItems: string[] = []
  if (chosen?.ship?.label) tldrItems.push(`Ship: ${chosen.ship.label}`)
  else if (payload.shk_candidates?.ship?.[0]?.label) tldrItems.push(`Ship: ${payload.shk_candidates.ship[0].label}`)
  if (chosen?.hold?.label) tldrItems.push(`Hold: ${chosen.hold.label}`)
  else if (payload.shk_candidates?.hold?.[0]?.label) tldrItems.push(`Hold: ${payload.shk_candidates.hold[0].label}`)
  if (chosen?.kill?.label) tldrItems.push(`Kill: ${chosen.kill.label}`)
  else if (payload.shk_candidates?.kill?.[0]?.label) tldrItems.push(`Kill: ${payload.shk_candidates.kill[0].label}`)

  return (
    <Shell>
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

      {/* TL;DR strip — what changed */}
      {tldrItems.length > 0 ? (
        <section className="border-b border-line bg-accent-soft/30">
          <div className="mx-auto max-w-reader px-5 py-7 sm:px-6">
            <p className="eyebrow mb-4">What changed</p>
            <ul className="grid gap-3 sm:grid-cols-3">
              {tldrItems.map((t, i) => (
                <li key={i} className="flex gap-2 text-[15px] leading-snug text-ink">
                  <span className="font-mono text-accent">→</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* THE DIFF — card-style: PAPER_ELEV bg + section-colored left border */}
      {orderedDiff.length > 0 ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-reader px-4 py-10 sm:px-6 sm:py-16">
            <div className="mb-8 flex items-baseline gap-3 sm:mb-10 sm:gap-4">
              <span className="font-display text-[13px] font-semibold tracking-[0.16em] text-accent">§</span>
              <h2 className="font-display text-[20px] font-semibold tracking-tight text-ink sm:text-[26px]">
                The 6-layer diff
              </h2>
            </div>
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
        <section id="for-you" className="border-b border-line bg-paper/40">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <div className="rounded-md border-l-4 border-accent bg-paper-elev px-6 py-8 sm:px-9 sm:py-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                Written for · this week
              </p>
              <p className="mt-3 font-display text-[19px] italic leading-snug text-ink sm:text-[22px]">
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
                      §&nbsp;&nbsp;The math
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
                              {r.value}
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

            {/* ALSO FOR — 2-3 short briefs for other builder archetypes */}
            {payload.also_for?.length ? (
              <div className="mt-10">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-2">
                  Also for · other builders
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {payload.also_for.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-md border-l-[3px] border-accent-2 bg-paper-elev px-5 py-5"
                    >
                      <p className="font-display text-[15px] font-semibold text-ink">
                        {b.archetype}
                      </p>
                      <p className="mt-2 font-body text-[15px] leading-relaxed text-body">
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

      {/* SHIP / HOLD / KILL — 3 distinct cards */}
      {chosen ? (
        <section id="shk" className="border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <div className="mb-10 flex items-baseline gap-4">
              <span className="font-display text-[13px] font-semibold tracking-[0.16em] text-accent">§</span>
              <h2 className="font-display text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
                Ship · Hold · Kill
              </h2>
              <p className="ml-2 hidden text-xs italic text-muted sm:inline">this week</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {(['ship', 'hold', 'kill'] as const).map((kind) => {
                const c = chosen[kind]
                if (!c) return null
                return (
                  <div
                    key={kind}
                    id={`shk-${kind}`}
                    className={`rounded border-l-4 ${KIND_ACCENT[kind]} bg-paper p-5 sm:p-6`}
                  >
                    <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-muted">
                      {KIND_LABEL[kind]}
                    </p>
                    <p className="mt-3 font-display text-[17px] font-semibold leading-snug text-ink">
                      {c.label}
                    </p>
                    <p className="mt-3 font-body text-[15px] leading-relaxed text-ink/85">
                      {c.rationale}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* KEEP / SKIP */}
      {payload.keep_skip?.keep?.length || payload.keep_skip?.skip?.length ? (
        <section id="keep-skip" className="border-b border-line bg-paper/40">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <div className="mb-10 flex items-baseline gap-4">
              <span className="font-display text-[13px] font-semibold tracking-[0.16em] text-accent">§</span>
              <h2 className="font-display text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
                Keep · Skip
              </h2>
            </div>
            <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
              {payload.keep_skip?.keep?.length ? (
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-accent">
                    KEEP
                  </p>
                  <ul className="mt-4 space-y-3">
                    {payload.keep_skip.keep.map((k, i) => (
                      <li key={i} className="flex gap-3 font-body text-[16px] leading-relaxed text-ink/90">
                        <span className="font-mono text-accent">+</span>
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {payload.keep_skip?.skip?.length ? (
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-accent-2">
                    SKIP
                  </p>
                  <ul className="mt-4 space-y-3">
                    {payload.keep_skip.skip.map((s, i) => (
                      <li key={i} className="flex gap-3 font-body text-[16px] leading-relaxed text-ink/90">
                        <span className="font-mono text-accent-2">−</span>
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

      {/* CLOSURE + FORWARD CTA */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
          <p className="font-body text-[20px] italic leading-relaxed text-paper">
            —— That&rsquo;s the shift. You&rsquo;re caught up.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-paper/60">
                Forward to one builder
              </p>
              <p className="mt-3 max-w-[480px] font-body text-[16px] leading-relaxed text-paper/85">
                If this lands for someone you work with — co-founder, PM, the engineer thinking about
                migration — send them the link. That&rsquo;s the whole share button.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${payload.throughline} — AI Signal Issue #${issueNumberPadded}: https://getaisignal.org/issue/${issueId}`
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

/* Site shell — full-bleed dark masthead + footer. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-paper">
            <Logo />
          </Link>
          <nav className="hidden gap-6 sm:flex" aria-label="Primary">
            <Link href="/" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
              Issues
            </Link>
            <Link href="/about" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
              About
            </Link>
            <Link href="/subscribe" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
              Subscribe
            </Link>
          </nav>
          <Link
            href="/subscribe"
            className="rounded bg-paper px-3 py-1.5 font-display text-[12px] font-semibold text-ink sm:hidden"
          >
            Subscribe
          </Link>
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
        </div>
      </footer>
    </>
  )
}
