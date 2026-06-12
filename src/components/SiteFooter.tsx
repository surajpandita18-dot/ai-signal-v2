// Site footer — WhatsApp join band + meta panel + tiny copyright row.
// From Figr design 2026-06-13.

import Link from 'next/link'
import { MessageCircle, ArrowUpRight } from 'lucide-react'
import SignalBars from './SignalBars'

export default function SiteFooter() {
  return (
    <footer id="about" className="border-t border-line bg-bg-raised">
      <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
        {/* WhatsApp band */}
        <div className="flex flex-col items-start justify-between gap-6 border border-line-strong bg-card p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-label text-lime-soft">
              <MessageCircle size={13} strokeWidth={2} />
              ONE-TAP, NO INBOX
            </div>
            <h3 className="font-serif text-2xl font-medium tracking-tight text-fg sm:text-[26px]">
              Get the brief on WhatsApp instead.
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-fg-muted">
              Same Monday signal, delivered where you actually read. Reply to
              any issue and a human answers.
            </p>
          </div>
          <Link
            href="/subscribe"
            className="group inline-flex shrink-0 items-center gap-2 bg-lime px-5 py-3 font-mono text-[12px] font-semibold tracking-[0.06em] text-bg"
          >
            JOIN ON WHATSAPP
            <ArrowUpRight
              size={15}
              strokeWidth={2}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>

        {/* Meta row */}
        <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-fg">
              <SignalBars color="rgb(var(--lime))" />
              <span className="font-mono text-[15px] font-semibold tracking-[0.12em]">
                AI SIGNAL
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-subtle">
              One AI shift that matters. Every Monday. Written for Indian
              builders, by people shipping alongside you.
            </p>
          </div>
          <div className="flex gap-12 font-mono text-[11px] tracking-label text-fg-subtle">
            <div className="flex flex-col gap-2.5">
              <Link href="/#archive" className="transition-colors hover:text-fg">
                ISSUES
              </Link>
              <Link href="/about" className="transition-colors hover:text-fg">
                ABOUT
              </Link>
              <Link href="/subscribe" className="transition-colors hover:text-fg">
                SUBSCRIBE
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <a href="/feed.xml" className="transition-colors hover:text-fg">
                RSS
              </a>
              <a
                href="https://twitter.com/intent/follow?screen_name=getaisignal"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-fg"
              >
                X / TWITTER
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 font-mono text-[10px] tracking-[0.1em] text-fg-subtle sm:flex-row sm:justify-between">
          <span>© 2026 AI SIGNAL · MADE IN BENGALURU</span>
          <span>NO SPAM · UNSUBSCRIBE IN ONE TAP</span>
        </div>
      </div>
    </footer>
  )
}
