// About — Figr design v3.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import { isSubscribed } from '@/lib/subscription'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type {
  DeepDivePayload,
  IssuePayload,
  IssueType,
} from '../../../db/types/database'

export const metadata = {
  title: 'About',
  description: 'What AI Signal is, who it’s for, and how each issue is built.',
}

export default async function AboutPage() {
  const subscribed = await isSubscribed()
  const supabase = createAdminSupabaseClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('id, issue_type, payload')
    .in('status', ['drafted', 'awaiting_human'])
    .order('created_at', { ascending: false })
    .limit(1)
  const latest = issues?.[0]
  const latestType: IssueType = (latest?.issue_type as IssueType) ?? 'weekly_brief'
  const wb = latestType === 'weekly_brief' ? (latest?.payload as IssuePayload | null) : null
  const dd =
    latestType === 'deep_dive'
      ? (latest?.payload as unknown as DeepDivePayload | null)
      : null
  const excerptHeadline = wb?.headline ?? dd?.title ?? null
  const excerptDek = wb?.throughline ?? dd?.subtitle ?? null
  const excerptArchetype = wb?.persona?.archetype ?? dd?.primary_audience ?? null
  const excerptHack = wb?.production_hack?.title ?? null

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav subscribed={subscribed} />

      <main className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-24">
        <div className="font-mono text-[11px] tracking-label text-lime-soft">ABOUT</div>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[56px]">
          A weekly AI brief from Bangalore, for builders anywhere.
        </h1>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div className="flex max-w-xl flex-col gap-5 text-[15px] leading-[1.75] text-fg-muted">
            <p>
              Frontier AI substance is global — every model release, every
              API price cut, every agent breakthrough lands the same way
              for a builder in Bangalore, Berlin, or San Francisco. But the
              lens you read it through changes the answer. AI Signal is
              written from one of the busiest AI frontiers (Bangalore) for
              builders, PMs, and founders anywhere.
            </p>
            <p>
              Specifically welcome: a working AI engineer at Sarvam,
              Krutrim, Anthropic, or OpenAI. A PM at a US AI-native startup
              evaluating Indic-language coverage. A founder anywhere
              shipping agents and wondering what India just did to agent
              payments. A GCC AI lead. A bank evaluating Sarvam vs Sonnet.
              An interview-prepping engineer studying for Anthropic India
              or OpenAI Bangalore.
            </p>
            <p>
              Each issue covers six layers — frontier-API moves, India
              cloud + GPU economics, DPDP/RBI/SEBI regulation, Indic model
              releases, AI talent and comp, enterprise deals — and connects
              them into one shift that matters this week. Plus a
              Ship/Hold/Kill call, INR-grounded math, and the noise we
              chose to ignore. Global builders read for the India angle
              (regulation that&apos;s ahead of US/EU on agent payments,
              real cost math, Indic model evals you won&apos;t see in
              Latent Space).
            </p>
            <p className="italic text-cream-dim">
              The whole product is the quality of the throughline. The
              engine does the grunt work; the editorial judgment is human.
            </p>

            {excerptHeadline && latest ? (
              <div className="mt-8 border-t border-line pt-8">
                <div className="font-mono text-[11px] tracking-label text-lime-soft">
                  FROM THE LAST ISSUE
                </div>
                <h2 className="mt-3 font-serif text-2xl font-medium tracking-tight text-fg sm:text-[28px]">
                  {excerptHeadline}
                </h2>
                {excerptDek ? (
                  <p className="mt-3 max-w-[620px] font-serif text-[17px] italic leading-snug text-cream-dim">
                    {excerptDek}
                  </p>
                ) : null}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {excerptArchetype ? (
                    <div className="border-l-2 border-lime bg-bg-raised p-5">
                      <p className="font-mono text-[11px] tracking-label text-fg-muted">
                        WRITTEN FOR
                      </p>
                      <p className="mt-2 font-serif text-[16px] italic leading-snug text-fg">
                        {excerptArchetype}
                      </p>
                    </div>
                  ) : null}
                  {excerptHack ? (
                    <div className="border-l-2 border-line-strong bg-bg-raised p-5">
                      <p className="font-mono text-[11px] tracking-label text-fg-muted">
                        PRODUCTION HACK
                      </p>
                      <p className="mt-2 font-serif text-[16px] font-medium leading-snug text-fg">
                        {excerptHack}
                      </p>
                    </div>
                  ) : null}
                </div>
                <Link
                  href={`/issue/${latest.id}`}
                  className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-mono text-[12px] tracking-label text-cream-dim transition-colors hover:text-lime"
                >
                  READ THE FULL ISSUE
                  <ArrowRight size={13} strokeWidth={2.25} />
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="border border-line-strong">
            {[
              { k: 'WRITTEN BY', v: 'A working engineer — not a content team.' },
              { k: 'CADENCE', v: 'Every Monday · 7:30 AM IST.' },
              { k: 'LENGTH', v: '~1500 words · 6-min read.' },
              { k: 'THE SHAPE', v: "One shift · who it's for · what to do." },
              { k: 'PRICE', v: 'Free, forever. Reply anytime.' },
              { k: 'MADE IN', v: 'Bengaluru, India.' },
            ].map((row, i) => (
              <div
                key={row.k}
                className={`flex flex-col gap-2 p-5 sm:p-6 ${i !== 0 ? 'border-t border-line' : ''}`}
              >
                <span className="font-mono text-[11px] tracking-label text-fg-muted">
                  {row.k}
                </span>
                <span className="text-[15px] leading-[1.55] text-cream-dim">{row.v}</span>
              </div>
            ))}
          </aside>
        </div>

        {subscribed ? (
          <div className="mt-16 flex flex-col gap-2 border border-lime/40 bg-card p-6">
            <div className="font-mono text-[11px] tracking-label text-lime">
              SUBSCRIBED ✓
            </div>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              Your next brief lands Monday. Read{' '}
              <Link href="/" className="text-lime underline underline-offset-2 hover:text-fg">
                the latest issue here
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-16">
            <Link
              href="/#subscribe"
              className="group inline-flex items-center gap-2 bg-lime px-6 py-3.5 font-mono text-[13px] font-semibold tracking-[0.04em] text-bg"
            >
              SUBSCRIBE FREE
              <ArrowRight
                size={15}
                strokeWidth={2.25}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
