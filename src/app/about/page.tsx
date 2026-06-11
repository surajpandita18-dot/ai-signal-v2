import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata = {
  title: 'About',
  description: 'What AI Signal is, who it’s for, and how each issue is built.',
}

export default function AboutPage() {
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
            <Link href="/about" aria-current="page" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper hover:text-paper">
              About
            </Link>
            <Link href="/subscribe" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
              Subscribe
            </Link>
          </nav>
          <Link href="/subscribe" className="rounded bg-paper px-3 py-1.5 font-display text-[12px] font-semibold text-ink sm:hidden">
            Subscribe
          </Link>
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

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
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

          <div className="mt-16">
            <Link
              href="/subscribe"
              className="inline-flex items-center rounded bg-ink px-6 py-3 font-display text-[15px] font-semibold text-paper transition hover:bg-accent"
            >
              Subscribe for free
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta"><span translate="no">getaisignal.org</span></p>
          </div>
          <p className="mt-3 meta">Monday mornings. ~1500 words. For Indian AI builders, PMs, founders.</p>
        </div>
      </footer>
    </>
  )
}
