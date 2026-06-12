import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { isSubscribed } from '@/lib/subscription'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { IssuePayload } from '../../../db/types/database'

export const metadata = {
  title: 'About',
  description: 'What AI Signal is, who it’s for, and how each issue is built.',
}

export default async function AboutPage() {
  const subscribed = await isSubscribed()
  const supabase = createAdminSupabaseClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('id, payload')
    .in('status', ['drafted', 'awaiting_human'])
    .order('created_at', { ascending: false })
    .limit(1)
  const latest = issues?.[0]
  const latestPayload = (latest?.payload as IssuePayload | null) ?? null
  const latestPersonaArchetype = latestPayload?.persona?.archetype ?? null
  const latestHack = latestPayload?.production_hack ?? null
  const showExcerpt = Boolean(latest && latestPayload)

  return (
    <>
      <header className="bg-[#0e0c08] text-[#f4efe6]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-[#f4efe6]">
            <Logo />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <nav className="hidden gap-6 sm:flex" aria-label="Primary">
              <Link href="/" className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#f4efe6]/80 hover:text-[#f4efe6]">
                Issues
              </Link>
              <Link href="/about" aria-current="page" className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#f4efe6] hover:text-[#f4efe6]">
                About
              </Link>
              {subscribed ? (
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
                  Subscribed ✓
                </span>
              ) : (
                <Link href="/subscribe" className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#f4efe6]/80 hover:text-[#f4efe6]">
                  Subscribe
                </Link>
              )}
            </nav>
            <ThemeToggle className="text-[#f4efe6]/80 hover:text-[#f4efe6]" />
            {subscribed ? null : (
              <Link href="/subscribe" className="rounded bg-paper px-3 py-1.5 font-display text-[12px] font-semibold text-ink sm:hidden">
                Subscribe
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        <article className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-20">
          <p className="eyebrow">About</p>
          <h1 className="mt-4 font-display text-[40px] font-bold leading-tight tracking-tight text-ink sm:text-[52px]">
            For someone shipping AI from India.
          </h1>

          <div className="mt-10 space-y-6 font-body text-[18px] leading-relaxed text-ink/90">
            <p>
              Most AI media writes for builders in San Francisco. The cost stack,
              the regulatory environment, the talent market, the language
              register a customer support bot has to handle — all of it
              is different here.
            </p>
            <p>
              AI Signal is a weekly Monday-morning brief written for one
              specific reader: someone shipping an AI product from India this
              quarter. A bootstrapped Bangalore SaaS founder adding AI. A PM at
              a GCC integrating an agent. A founder at an AI-native Indian
              startup. The PM at a bank evaluating Sarvam vs Sonnet.
            </p>
            <p>
              Each issue covers six layers — global frontier-API moves, Indian
              cloud + GPU economics, DPDP/RBI/SEBI regulation, Indic-model
              releases, AI talent and comp, and Indian enterprise deals — and
              connects them into one shift that matters this week. Plus a
              ship-or-kill recommendation, INR-grounded math, and the noise we
              chose to ignore.
            </p>
            <p className="italic text-ink/85">
              The whole product is the quality of the throughline. The engine
              does the grunt work; the editorial judgment is human.
            </p>
          </div>

          {showExcerpt && latest && latestPayload ? (
            <section className="mt-14 border-t border-line pt-12">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                From last week&rsquo;s issue
              </p>
              <h2 className="mt-3 font-display text-[22px] font-bold leading-[1.15] tracking-tight text-ink sm:text-[28px]">
                {latestPayload.headline}
              </h2>
              {latestPayload.throughline ? (
                <p className="mt-3 max-w-[620px] font-body text-[17px] italic leading-snug text-ink/80">
                  {latestPayload.throughline}
                </p>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {latestPersonaArchetype ? (
                  <div className="rounded-md border-l-4 border-accent bg-paper-elev px-5 py-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                      Written for
                    </p>
                    <p className="mt-2 font-display text-[15px] italic leading-snug text-ink">
                      {latestPersonaArchetype}
                    </p>
                  </div>
                ) : null}
                {latestHack ? (
                  <div className="rounded-md border-l-4 border-accent-2 bg-paper-elev px-5 py-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-2">
                      Production hack
                    </p>
                    <p className="mt-2 font-display text-[15px] font-bold leading-snug text-ink">
                      {latestHack.title}
                    </p>
                  </div>
                ) : null}
              </div>

              <Link
                href={`/issue/${latest.id}`}
                className="mt-6 inline-flex items-center font-mono text-[12px] uppercase tracking-[0.16em] text-accent hover:text-ink"
              >
                Read the full issue →
              </Link>
            </section>
          ) : null}

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="eyebrow">Cadence</p>
              <p className="mt-2 font-body text-[16px] leading-relaxed text-ink">
                Every Monday, 7:30 AM IST. Never daily.
              </p>
            </div>
            <div>
              <p className="eyebrow">Length</p>
              <p className="mt-2 font-body text-[16px] leading-relaxed text-ink">
                ~1500 words. Eight minutes to read, ninety seconds to scan.
              </p>
            </div>
            <div>
              <p className="eyebrow">Price</p>
              <p className="mt-2 font-body text-[16px] leading-relaxed text-ink">
                Free while we’re finding fit.
              </p>
            </div>
            <div>
              <p className="eyebrow">Where</p>
              <p className="mt-2 font-body text-[16px] leading-relaxed text-ink">
                Your inbox. Web archive on{' '}
                <span translate="no">getaisignal.org</span>.
              </p>
            </div>
          </div>

          {subscribed ? (
            <div className="mt-16 rounded-md border-l-4 border-accent bg-paper-elev px-6 py-5 sm:py-6">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                You&rsquo;re on the list ✓
              </p>
              <p className="mt-2 font-body text-[16px] leading-relaxed text-ink">
                Next brief lands Monday 7:30 AM IST. Read the latest issue on the{' '}
                <Link href="/" className="text-accent underline underline-offset-2">
                  home page
                </Link>.
              </p>
            </div>
          ) : (
            <div className="mt-16">
              <Link
                href="/subscribe"
                className="inline-flex items-center rounded bg-ink px-6 py-3 font-display text-[15px] font-semibold text-paper transition hover:bg-accent"
              >
                Subscribe for free
              </Link>
            </div>
          )}
        </article>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta"><span translate="no">getaisignal.org</span></p>
          </div>
          <p className="mt-3 meta">Monday mornings. ~1500 words. For Indian AI builders, PMs, founders.</p>
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
