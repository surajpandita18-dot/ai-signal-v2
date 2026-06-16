// Subscribe — Figr design v3.
// Caret-prefixed input + lime CTA + "what you get" bullets.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import { isSubscribed } from '@/lib/subscription'
import HomeSubscribeForm from '../HomeSubscribeForm'

export const metadata = {
  title: 'Subscribe',
  description: 'Get AI Signal Monday mornings. One shift, six layers, INR-grounded.',
}

const WHAT_YOU_GET = [
  ['ONE SHIFT', 'A single move that matters. Not a roundup.'],
  ['SIX LAYERS', 'Frontier APIs · India infra · regulation · Indic models · talent · enterprise.'],
  ['INR MATH', '₹/M tokens · ₹/H100/hour · real INR deltas on real workloads.'],
  ['ONE HACK', 'A production technique from the literature. With the first file to edit.'],
  ['THREE CALLS', 'Ship · Hold · Kill. Picked by hand, not auto-generated.'],
  ['NAMED NOISE', 'The loud takes you don’t need to read this week.'],
]

export default async function SubscribePage() {
  const subscribed = await isSubscribed()

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav subscribed={subscribed} />

      <main className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-24">
        {subscribed ? (
          <div className="mx-auto max-w-read">
            <div className=" text-[11px] font-medium tracking-[0.08em] text-lime">
              ON THE LIST ✓
            </div>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[56px]">
              See you Monday.
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-fg-muted">
              Your brief lands Monday 7:30 AM IST. If you don’t see it,
              check Promotions or Spam — and reply to that email so
              Gmail puts the next one in your Primary.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/"
                className="group inline-flex min-h-[44px] items-center gap-2 bg-lime-bright px-6 py-3.5 font-mono text-[13px] font-semibold tracking-[0.04em] text-fg"
              >
                READ LATEST ISSUE
                <ArrowRight
                  size={15}
                  strokeWidth={2.25}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/about"
                className="inline-flex min-h-[44px] items-center self-center  text-[12px] font-medium tracking-[0.08em] text-fg-muted transition-colors hover:text-fg"
              >
                ABOUT →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            <div>
              <div className=" text-[11px] font-medium tracking-[0.08em] text-lime-soft">
                THE MONDAY BRIEF · WRITTEN FROM BANGALORE · READ WORLDWIDE
              </div>
              <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[56px]">
                Mondays. One shift.
              </h1>
              <p className="mt-7 max-w-md text-[17px] leading-[1.65] text-fg-muted">
                ~1500 words on what changed in AI this week and what to
                ship Monday — written from Bangalore for builders, PMs,
                founders anywhere. India regulation + INR math + the global
                frontier every issue. Free.
              </p>
              <div className="mt-10 max-w-lg">
                <HomeSubscribeForm />
                <p className="mt-5 font-mono text-[11px] tracking-[0.06em] text-fg-muted">
                  ONE EMAIL A WEEK · NEVER SOLD · UNSUBSCRIBE IN ONE TAP
                </p>
              </div>
            </div>

            <aside className="border border-line-strong bg-bg-raised p-7 sm:p-8">
              <div className=" text-[11px] font-medium tracking-[0.08em] text-lime-soft">
                EVERY MONDAY · 7:30 AM IST
              </div>
              <ul className="mt-7 flex flex-col gap-6">
                {WHAT_YOU_GET.map(([label, body]) => (
                  <li key={label} className="flex flex-col gap-1.5">
                    <span className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
                      {label}
                    </span>
                    <span className="text-[15px] leading-[1.6] text-cream-dim">
                      {body}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
