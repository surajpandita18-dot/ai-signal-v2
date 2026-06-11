import Link from 'next/link'
import { Logo } from '@/components/Logo'
import SubscribeForm from './SubscribeForm'

export const metadata = {
  title: 'Subscribe',
  description: 'Get AI Signal Monday mornings. One shift, six layers, INR-grounded.',
}

export default function SubscribePage() {
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
            <Link href="/subscribe" aria-current="page" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper hover:text-paper">
              Subscribe
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto max-w-[640px] px-5 py-16 sm:px-6 sm:py-24">
          <p className="eyebrow">Subscribe</p>
          <h1 className="mt-4 font-display text-[40px] font-bold leading-tight tracking-tight text-ink sm:text-[52px]">
            Mondays. One shift.
          </h1>
          <p className="mt-6 font-body text-[18px] leading-relaxed text-ink/85 sm:text-[20px]">
            ~1500 words on what changed this week and what to ship — written
            for Indian AI builders, PMs, founders. Free.
          </p>

          <div className="mt-10">
            <SubscribeForm />
          </div>

          <p className="mt-6 meta">
            One email a week. Never sold, never spammed. Unsubscribe is one click.
          </p>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta"><span translate="no">getaisignal.org</span></p>
          </div>
        </div>
      </footer>
    </>
  )
}
