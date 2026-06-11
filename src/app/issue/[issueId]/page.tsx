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
  kill: 'border-clay',
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
      {/* COVER — big magazine area */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              Issue {issueNumberPadded}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {issueDate}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              · {readTime} min read
            </span>
          </div>

          {/* The catchy headline — big, magazine-cover style */}
          <h1 className="mt-6 font-heading text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[56px] sm:leading-[1.02]">
            {headline}
          </h1>

          {/* Throughline as subhead / dek */}
          {payload.throughline && payload.throughline !== headline ? (
            <p className="mt-6 max-w-[600px] font-body text-[20px] italic leading-snug text-ink/80 sm:text-[22px]">
              {payload.throughline}
            </p>
          ) : null}

          {/* Lead paragraph */}
          {payload.throughline_lead ? (
            <p className="mt-8 max-w-[640px] font-body text-[18px] leading-relaxed text-ink/90">
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

      {/* THE DIFF — magazine-style numbered sections */}
      {orderedDiff.length > 0 ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <div className="mb-10 flex items-baseline gap-4">
              <span className="font-heading text-[13px] font-semibold tracking-[0.16em] text-accent">
                §
              </span>
              <h2 className="font-heading text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
                The 6-layer diff
              </h2>
            </div>
            <div className="space-y-12">
              {orderedDiff.map((d, i) => {
                const num = String(i + 1).padStart(2, '0')
                const sectionId = `diff-${d.beat}`
                return (
                  <article
                    key={sectionId}
                    id={sectionId}
                    className="grid gap-6 sm:grid-cols-[80px_1fr] sm:gap-8"
                  >
                    <div className="flex flex-row items-baseline gap-3 sm:flex-col sm:items-end sm:gap-1 sm:pt-2 sm:text-right">
                      <span className="font-mono text-[36px] font-light leading-none text-accent sm:text-[48px]">
                        {num}
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                        {BEAT_LABEL[d.beat]}
                      </p>
                      <p className="mt-3 font-body text-[17px] leading-relaxed text-ink sm:text-[18px]">
                        {d.bullet}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* PERSONA — bordered editorial card */}
      {payload.persona ? (
        <section id="for-you" className="border-b border-line bg-paper/40">
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow">For the…</p>
            <h2 className="mt-2 font-heading text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
              {payload.persona.archetype}
            </h2>
            <p className="mt-6 max-w-[680px] whitespace-pre-line font-body text-[17px] leading-relaxed text-ink sm:text-[18px]">
              {payload.persona.translation}
            </p>
            {payload.persona.inr_math ? (
              <div className="mt-8 rounded border border-line bg-paper p-5 sm:p-6">
                <p className="eyebrow mb-3">The math</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-ink">
                  {payload.persona.inr_math}
                </pre>
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
              <span className="font-heading text-[13px] font-semibold tracking-[0.16em] text-accent">§</span>
              <h2 className="font-heading text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
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
                    <p className="mt-3 font-heading text-[17px] font-semibold leading-snug text-ink">
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
              <span className="font-heading text-[13px] font-semibold tracking-[0.16em] text-accent">§</span>
              <h2 className="font-heading text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
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
                  <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-clay">
                    SKIP
                  </p>
                  <ul className="mt-4 space-y-3">
                    {payload.keep_skip.skip.map((s, i) => (
                      <li key={i} className="flex gap-3 font-body text-[16px] leading-relaxed text-ink/90">
                        <span className="font-mono text-clay">−</span>
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
                className="inline-flex items-center rounded bg-paper px-5 py-3 font-heading text-sm font-semibold text-ink transition hover:bg-accent hover:text-paper"
              >
                WhatsApp
              </a>
              <a
                href={`/issue/${issueId}`}
                aria-label="Open this issue’s canonical URL"
                className="inline-flex items-center rounded border border-paper/40 px-5 py-3 font-heading text-sm font-semibold text-paper transition hover:bg-paper/10"
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
            className="rounded bg-paper px-3 py-1.5 font-heading text-[12px] font-semibold text-ink sm:hidden"
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
