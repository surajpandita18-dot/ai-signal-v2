// Site nav — cream bar on dark page (Figr design). Sticky top.
// Replaces v2's dark bar with cream nav. Logo uses signal bars motif.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SignalBars from './SignalBars'

export default function SiteNav({
  subscribed = false,
}: {
  subscribed?: boolean
}) {
  return (
    <header className="sticky top-0 z-40 bg-cream text-bg">
      <div className="mx-auto flex h-14 max-w-shell items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <SignalBars color="#1f4d12" />
          <span className="font-mono text-[15px] font-semibold tracking-[0.12em]">
            AI SIGNAL
          </span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7">
          <Link
            href="/#archive"
            className="hidden font-mono text-[11px] font-medium tracking-label text-bg/80 transition-colors hover:text-bg sm:inline"
          >
            ISSUES
          </Link>
          <Link
            href="/about"
            className="hidden font-mono text-[11px] font-medium tracking-label text-bg/80 transition-colors hover:text-bg sm:inline"
          >
            ABOUT
          </Link>
          {subscribed ? (
            <span className="inline-flex items-center gap-1.5 bg-bg px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-lime">
              SUBSCRIBED ✓
            </span>
          ) : (
            <Link
              href="/subscribe"
              className="group inline-flex items-center gap-1.5 bg-bg px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-lime"
            >
              SUBSCRIBE
              <ArrowRight
                size={13}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
