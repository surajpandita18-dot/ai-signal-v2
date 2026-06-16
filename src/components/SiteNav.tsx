// Site nav — Lenny v5: bright bar with ink text + hairline below. Sticky top.
// Drops v3's dark masthead (was using legacy bg-cream which token-flipped to
// ink under the cream-premium palette, leaving an unintended dark band).

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SignalBars from './SignalBars'

export default function SiteNav({
  subscribed = false,
}: {
  subscribed?: boolean
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-14 max-w-shell items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-2.5 text-fg">
          <SignalBars color="currentColor" className="self-center" />
          <span className="font-serif text-[20px] font-semibold tracking-[-0.01em]">
            AI Signal
          </span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7">
          <Link
            href="/#archive"
            className="hidden text-[13px] font-medium text-fg-muted transition-colors hover:text-fg sm:inline"
          >
            Issues
          </Link>
          <Link
            href="/watchlist"
            className="hidden text-[13px] font-medium text-fg-muted transition-colors hover:text-fg sm:inline"
          >
            Watchlist
          </Link>
          <Link
            href="/about"
            className="hidden text-[13px] font-medium text-fg-muted transition-colors hover:text-fg sm:inline"
          >
            About
          </Link>
          {subscribed ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-lime-soft">
              Subscribed ✓
            </span>
          ) : (
            <Link
              href="/subscribe"
              className="group inline-flex items-center gap-1.5 rounded-full bg-fg px-4 py-1.5 text-[13px] font-semibold text-bg transition-colors hover:bg-fg-muted"
            >
              Subscribe
              <ArrowRight
                size={13}
                strokeWidth={2.5}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
