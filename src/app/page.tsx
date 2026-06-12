// Homepage — issue archive index + subscribe CTA.

import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { isSubscribed } from '@/lib/subscription'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import type {
  IssuePayload,
  DeepDivePayload,
  IssueType,
} from '../../db/types/database'

export const dynamic = 'force-dynamic'

function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso)
    .toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()
}

export default async function HomePage() {
  const supabase = createAdminSupabaseClient()
  const subscribed = await isSubscribed()
  const { data: issues } = await supabase
    .from('issues')
    .select('id, status, issue_type, created_at, payload')
    .in('status', ['drafted', 'awaiting_human'])
    .order('created_at', { ascending: false })
    .limit(20)

  // Map archive list — render both weekly briefs + deep-dives, using each
  // type's appropriate payload shape (weekly has headline/throughline,
  // deep-dive has title/subtitle).
  const list = (issues ?? []).map((it, i) => {
    const issueType: IssueType = (it.issue_type as IssueType) ?? 'weekly_brief'
    if (issueType === 'deep_dive') {
      const dd = it.payload as unknown as DeepDivePayload | null
      return {
        id: it.id,
        type: issueType,
        number: String((issues?.length ?? 0) - i).padStart(3, '0'),
        date: fmt(it.created_at),
        headline: dd?.title ?? 'Deep-dive draft in progress',
        throughline: dd?.subtitle ?? '',
      }
    }
    const wb = it.payload as IssuePayload | null
    return {
      id: it.id,
      type: issueType,
      number: String((issues?.length ?? 0) - i).padStart(3, '0'),
      date: fmt(it.created_at),
      headline: wb?.headline ?? '—',
      throughline: wb?.throughline ?? '',
    }
  })

  // Hero teaser block — pull from the most recent WEEKLY brief specifically
  // (deep-dive payload shape doesn't have six_layer_diff/persona/hack fields).
  const latestWeekly = (issues ?? []).find(
    (it) => (it.issue_type as IssueType) !== 'deep_dive'
  )
  const latest = latestWeekly?.payload as IssuePayload | null
  const latestDiff = latest?.six_layer_diff?.[1] ?? latest?.six_layer_diff?.[0]
  const teaserDiff = latestDiff
    ? {
        beat: latestDiff.beat,
        lead: latestDiff.bullet.match(/^([^.!?]+[.!?])/)?.[1] ?? latestDiff.bullet,
      }
    : null
  const teaserHackTitle = latest?.production_hack?.title ?? null
  const teaserPersonaArchetype = latest?.persona?.archetype ?? null
  const latestWeeklyListItem = list.find((it) => it.type !== 'deep_dive')

  return (
    <>
      <header className="bg-[#0e0c08] text-[#f4efe6]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-paper">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <nav className="hidden gap-6 sm:flex" aria-label="Primary">
              <Link href="/" aria-current="page" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper hover:text-paper">
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

      <main id="main">
        {/* Hero / brand statement */}
        <section className="border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow">The India AI Builder’s Brief</p>
            <h1 className="mt-4 font-display text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[56px]">
              Mondays. <span className="text-accent">One shift.</span> Indian
              builders only.
            </h1>
            <p className="mt-6 max-w-[600px] font-body text-[18px] leading-relaxed text-ink/85 sm:text-[20px]">
              A weekly synthesis for Indian AI builders, PMs, and founders. We
              read frontier-API moves, India infra, regulation, Indic models,
              talent, and enterprise deals — and tell you the one shift that
              actually matters for what you ship this quarter.
            </p>
            {subscribed ? (
              <div className="mt-10 rounded-md border-l-4 border-accent bg-paper-elev px-5 py-5 sm:px-6 sm:py-6">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  You&rsquo;re on the list ✓
                </p>
                <p className="mt-2 font-body text-[16px] leading-relaxed text-ink sm:text-[17px]">
                  Your next brief lands Monday 7:30 AM IST. In the meantime,
                  read the latest issue below.
                </p>
              </div>
            ) : (
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/subscribe"
                  className="inline-flex items-center rounded bg-ink px-6 py-3 font-display text-[15px] font-semibold text-paper transition hover:bg-accent"
                >
                  Subscribe for free
                </Link>
                <Link
                  href="/about"
                  className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted hover:text-ink"
                >
                  Read what we cover →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Inside this week's brief — content teaser so a stranger sees the
            format and quality before clicking into an issue */}
        {(teaserDiff || teaserHackTitle || teaserPersonaArchetype) && latestWeeklyListItem ? (
          <section className="border-b border-line bg-paper/40">
            <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                Inside this week&rsquo;s brief
              </p>
              <h2 className="mt-3 font-display text-[26px] font-bold leading-[1.15] tracking-tight text-ink sm:text-[34px]">
                {latestWeeklyListItem.headline}
              </h2>
              {latestWeeklyListItem.throughline ? (
                <p className="mt-3 max-w-[620px] font-body text-[17px] italic leading-snug text-ink/80 sm:text-[19px]">
                  {latestWeeklyListItem.throughline}
                </p>
              ) : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {teaserDiff ? (
                  <div className="rounded-md border-l-4 border-accent bg-paper-elev px-5 py-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                      One of six layers
                    </p>
                    <p className="mt-2 font-body text-[15px] font-semibold leading-snug text-ink">
                      {teaserDiff.lead}
                    </p>
                  </div>
                ) : null}
                {teaserPersonaArchetype ? (
                  <div className="rounded-md border-l-4 border-accent bg-paper-elev px-5 py-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                      Written for
                    </p>
                    <p className="mt-2 font-display text-[15px] italic leading-snug text-ink">
                      {teaserPersonaArchetype}
                    </p>
                  </div>
                ) : null}
                {teaserHackTitle ? (
                  <div className="rounded-md border-l-4 border-accent-2 bg-paper-elev px-5 py-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-2">
                      This week&rsquo;s production hack
                    </p>
                    <p className="mt-2 font-body text-[15px] font-semibold leading-snug text-ink">
                      {teaserHackTitle}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={`/issue/${latestWeeklyListItem.id}`}
                  className="inline-flex items-center rounded bg-ink px-6 py-3 font-display text-[14px] font-semibold text-paper transition hover:bg-accent"
                >
                  Read this week&rsquo;s brief →
                </Link>
                {subscribed ? null : (
                  <Link
                    href="/subscribe"
                    className="inline-flex items-center font-mono text-[12px] uppercase tracking-[0.16em] text-muted hover:text-ink"
                  >
                    Get next Monday&rsquo;s free →
                  </Link>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {/* Archive */}
        <section>
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <div className="mb-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                Archive
              </p>
              <h2 className="mt-2 font-display text-[26px] font-bold tracking-tight text-ink sm:text-[32px]">
                Past issues
              </h2>
            </div>

            {list.length === 0 ? (
              <p className="font-body text-[16px] italic text-muted">
                Issue #001 is being drafted now.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((it) => (
                  <li key={it.id} className="py-6 first:pt-0 last:pb-0">
                    <Link
                      href={`/issue/${it.id}`}
                      className="group block focus-visible:outline-none"
                    >
                      <div className="flex items-baseline gap-4 text-[11px] tabular">
                        <span
                          className={`font-mono uppercase tracking-[0.16em] ${it.type === 'deep_dive' ? 'text-accent-2' : 'text-accent'}`}
                        >
                          {it.type === 'deep_dive' ? 'Deep dive' : 'Issue'}&nbsp;{it.number}
                        </span>
                        <span className="font-mono uppercase tracking-[0.12em] text-muted">
                          {it.date}
                        </span>
                      </div>
                      <p
                        className={`mt-2 font-display text-[22px] font-semibold leading-snug text-ink ${it.type === 'deep_dive' ? 'group-hover:text-accent-2' : 'group-hover:text-accent'}`}
                      >
                        {it.headline}
                      </p>
                      {it.throughline ? (
                        <p className="mt-2 font-body text-[16px] italic leading-snug text-ink/70">
                          {it.throughline}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta">
              <span translate="no">getaisignal.org</span>
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
            <a
              href="/feed.xml"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
            >
              RSS
            </a>
          </nav>
        </div>
      </footer>
    </>
  )
}
