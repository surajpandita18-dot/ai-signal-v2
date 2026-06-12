import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { isSubscribed } from '@/lib/subscription'
import SubscribeForm from './SubscribeForm'

export const metadata = {
  title: 'Subscribe',
  description: 'Get AI Signal Monday mornings. One shift, six layers, INR-grounded.',
}

export default async function SubscribePage() {
  const subscribed = await isSubscribed()
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
              <Link href="/about" className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#f4efe6]/80 hover:text-[#f4efe6]">
                About
              </Link>
              {subscribed ? (
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">
                  Subscribed ✓
                </span>
              ) : (
                <Link href="/subscribe" aria-current="page" className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#f4efe6] hover:text-[#f4efe6]">
                  Subscribe
                </Link>
              )}
            </nav>
            <ThemeToggle className="text-[#f4efe6]/80 hover:text-[#f4efe6]" />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto max-w-[640px] px-5 py-16 sm:px-6 sm:py-24">
          {subscribed ? (
            <>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                You&rsquo;re on the list ✓
              </p>
              <h1 className="mt-4 font-display text-[40px] font-bold leading-tight tracking-tight text-ink sm:text-[52px]">
                See you Monday.
              </h1>
              <p className="mt-6 font-body text-[18px] leading-relaxed text-ink/85 sm:text-[20px]">
                Your brief lands Monday 7:30 AM IST. If you don&rsquo;t see
                it, check Promotions or Spam — and reply to that email so
                Gmail puts the next one in your Primary.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center rounded bg-ink px-6 py-3 font-display text-[15px] font-semibold text-paper transition hover:bg-accent"
                >
                  Read latest issue
                </Link>
                <Link
                  href="/about"
                  className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted hover:text-ink self-center"
                >
                  About →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">Subscribe</p>
              <h1 className="mt-4 font-display text-[40px] font-bold leading-tight tracking-tight text-ink sm:text-[52px]">
                Mondays. One shift.
              </h1>
              <p className="mt-6 font-body text-[18px] leading-relaxed text-ink/85 sm:text-[20px]">
                ~1500 words on what changed this week and what to ship —
                written for Indian AI builders, PMs, founders. Free.
              </p>

              {/* What you get — concrete feature list sells the value before the form */}
              <div className="mt-10 rounded-md border-l-4 border-accent bg-paper-elev px-6 py-6 sm:px-7 sm:py-7">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Every Monday, 7:30 AM IST
                </p>
                <ul className="mt-4 space-y-3 font-body text-[15px] leading-relaxed text-ink sm:text-[16px]">
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-accent">→</span>
                    <span>
                      <strong className="font-semibold">One non-obvious shift</strong>{' '}
                      named in 4-7 words. No daily-news summary.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-accent">→</span>
                    <span>
                      <strong className="font-semibold">Six layers tracked</strong>:
                      frontier APIs, India infra, regulation, Indic models,
                      talent &amp; comp, enterprise deals.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-accent">→</span>
                    <span>
                      <strong className="font-semibold">INR-grounded math</strong>:
                      ₹/M tokens, ₹/H100/hour, real INR deltas on real
                      production workloads.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-accent">→</span>
                    <span>
                      <strong className="font-semibold">One production hack</strong> from
                      the literature (vLLM, ArXiv, HuggingFace) — with the
                      first file to edit.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-accent">→</span>
                    <span>
                      <strong className="font-semibold">Three opinionated calls</strong>{' '}
                      — Ship, Hold, Kill — picked by hand, not auto-generated.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono font-semibold text-accent-2">−</span>
                    <span>
                      <strong className="font-semibold">Named noise to skip</strong>{' '}
                      — the loud takes you don&rsquo;t need to read this week.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-10">
                <SubscribeForm />
              </div>

              <p className="mt-6 meta">
                One email a week. Never sold, never spammed. Unsubscribe is
                one click.
              </p>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta"><span translate="no">getaisignal.org</span></p>
          </div>
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
