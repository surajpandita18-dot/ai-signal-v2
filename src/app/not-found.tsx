// 404 page — Figr palette.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav />

      <main className="mx-auto max-w-read px-5 py-20 sm:px-8 sm:py-32">
        <div className="font-mono text-[11px] tracking-label text-danger">
          404 · NO SIGNAL
        </div>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[64px]">
          Nothing here.
        </h1>
        <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-fg-muted">
          The page you’re looking for moved, was an old preview link, or
          never existed. The next Monday brief still lands at 7:30 AM IST
          either way.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/"
            className="group inline-flex min-h-[44px] items-center gap-2 bg-lime-bright px-6 py-3.5 font-mono text-[13px] font-semibold tracking-[0.04em] text-fg"
          >
            BACK TO HOMEPAGE
            <ArrowRight
              size={15}
              strokeWidth={2.25}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/#archive"
            className="inline-flex min-h-[44px] items-center self-center font-mono text-[12px] tracking-label text-fg-muted transition-colors hover:text-fg"
          >
            BROWSE PAST ISSUES →
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
