// Homepage — Figr design (June 2026).
// Two-column hero with email capture + featured issue card,
// What You Get strip, Manifesto, Archive list.

import Link from 'next/link'
import { ArrowRight, ArrowUpRight, CornerDownRight } from 'lucide-react'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { isSubscribed } from '@/lib/subscription'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import SignalTrace from '@/components/SignalTrace'
import HomeSubscribeForm from './HomeSubscribeForm'
import type {
  IssuePayload,
  DeepDivePayload,
  IssueType,
} from '../../db/types/database'

export const dynamic = 'force-dynamic'

function fmt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase()
}

function readMinutes(payload: IssuePayload | DeepDivePayload | null): number {
  if (!payload) return 6
  if ('evidence_sections' in payload) {
    const words = (payload.evidence_sections ?? [])
      .map((s) => s.body)
      .join(' ')
      .split(/\s+/).length
    return Math.max(8, Math.round(words / 200))
  }
  return 6
}

const WHAT_YOU_GET = [
  {
    k: '01',
    label: 'ONE SHIFT',
    title: 'Not a roundup. A single move.',
    body: 'We pick the one thing that actually changes how you build this week and ignore the other forty.',
  },
  {
    k: '02',
    label: "WHO IT'S FOR",
    title: 'Mapped to your archetype.',
    body: 'Founder, eng lead, or operator — every issue says who should act and who can skim.',
  },
  {
    k: '03',
    label: 'WHAT TO DO',
    title: 'A Monday-morning action.',
    body: 'Each brief ends with the exact move to make this sprint. Steal it, ship it, move on.',
  },
]

export default async function HomePage() {
  const supabase = createAdminSupabaseClient()
  const subscribed = await isSubscribed()
  // `payload IS NOT NULL` — drafted rows without a payload are pipeline
  // failures that didn't get re-statused. Showing them produces a "—" title
  // row that clicks through to a "draft in progress" placeholder. Filter at
  // the query so the public list only shows real issues.
  const { data: issues } = await supabase
    .from('issues')
    .select('id, status, issue_type, created_at, payload')
    .in('status', ['drafted', 'awaiting_human'])
    .not('payload', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const list = (issues ?? []).map((it, i) => {
    const issueType: IssueType = (it.issue_type as IssueType) ?? 'weekly_brief'
    const num = String((issues?.length ?? 0) - i).padStart(3, '0')
    if (issueType === 'deep_dive') {
      const dd = it.payload as unknown as DeepDivePayload | null
      return {
        id: it.id,
        type: issueType,
        kind: 'DEEP DIVE' as const,
        no: num,
        archiveDate: fmt(it.created_at),
        title: dd?.title ?? 'Deep-dive in progress',
        dek: dd?.subtitle ?? '',
        read: `${readMinutes(dd)} MIN`,
        forLine: dd?.primary_audience ?? 'For everyone shipping AI',
        stealLine: dd?.monday_actions?.[0]?.action ?? '',
      }
    }
    const wb = it.payload as IssuePayload | null
    return {
      id: it.id,
      type: issueType,
      kind: 'BRIEF' as const,
      no: num,
      archiveDate: fmt(it.created_at),
      title: wb?.headline ?? '—',
      dek: wb?.throughline ?? '',
      read: '6 MIN',
      forLine: wb?.persona?.archetype ?? '',
      stealLine: wb?.production_hack?.title ?? '',
    }
  })

  const featured = list[0]

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav subscribed={subscribed} />

      {/* HERO — Lenny v6: two-column at desktop. Left: copy + subscribe.
          Right: visual sidebar so widescreen sides don't read empty.
          Collapses to single column at mobile. */}
      <section id="subscribe" className="border-b border-line">
        <div className="mx-auto grid max-w-shell grid-cols-1 gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div>
            <div className="reveal d-1 mb-7 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-lime-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-bright" />
              The Monday brief
            </div>
            <h1 className="reveal d-2 font-serif text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] text-fg sm:text-[64px]">
              One AI shift that matters.{' '}
              <span className="text-fg-muted">Every Monday.</span>
            </h1>
            <p className="reveal d-3 mt-7 max-w-[560px] text-[18px] leading-[1.6] text-fg-muted">
              The single move reshaping the AI stack each week — what
              happened, who it&apos;s for, what to do Monday. Written from
              Bangalore. India regulation, INR math, and the global frontier.
              For builders anywhere.
            </p>

            <div className="reveal d-4 mt-9 max-w-[480px]">
              {subscribed ? (
                <div className="rounded-2xl border border-line bg-card px-6 py-5">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-lime-soft">
                    Subscribed ✓
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    Your next brief lands Monday 7:30 AM IST.
                  </p>
                </div>
              ) : (
                <HomeSubscribeForm />
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-fg-muted">
                <span>Free forever</span>
                <span aria-hidden className="text-fg-subtle">·</span>
                <span>6-min read</span>
                <span aria-hidden className="text-fg-subtle">·</span>
                <span>Written in Bengaluru</span>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4 border-t border-line pt-6">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-lime-bright font-serif text-[18px] font-bold text-fg"
                aria-hidden
              >
                S
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold text-fg">
                  Suraj Pandita
                </p>
                <p className="text-[13px] text-fg-muted">
                  Working AI engineer · Writes from Bangalore · Replies to every email
                </p>
              </div>
            </div>
          </div>

          {/* Right rail — fills widescreen empty space. Reader-relevant
              context (what lands in inbox + one quoted line). */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-bg-raised p-7">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                What lands in your inbox
              </p>
              <ul className="mt-5 flex flex-col gap-4">
                {[
                  { k: 'Frontier-API moves', d: 'OpenAI, Anthropic, Google, Meta — pricing, regression, M&A.' },
                  { k: 'India regulation', d: 'RBI, DPDP, NPCI moves that change builder constraints.' },
                  { k: 'Indic models', d: 'Sarvam, Krutrim, Karya — evals + production reads.' },
                  { k: 'Enterprise deals', d: 'TCS, HDFC, Reliance — what changed which procurement deck.' },
                  { k: 'INR math', d: 'Worked cost numbers — the moat AI-newsletter slop can\'t copy.' },
                ].map((row) => (
                  <li key={row.k} className="flex items-start gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-bright" />
                    <p className="text-[14px] leading-[1.5] text-fg">
                      <span className="font-semibold">{row.k}.</span>{' '}
                      <span className="text-fg-muted">{row.d}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <blockquote className="rounded-2xl border-l-[3px] border-lime-bright bg-card px-7 py-6">
              <p className="font-serif text-[18px] italic leading-[1.5] text-fg">
                &ldquo;The Monday brief I open before standup. India + global
                in one read, with the math.&rdquo;
              </p>
              <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                Reader · Series-B Indian SaaS
              </p>
            </blockquote>
          </aside>
        </div>
      </section>

      {/* FEATURED ISSUE — single Lenny-style hero card under the masthead. */}
      {featured ? (
        <section className="border-b border-line bg-bg-raised">
          <div className="mx-auto max-w-shell px-5 py-12 sm:px-8 sm:py-16">
            <div className="flex flex-wrap items-baseline gap-x-4 text-[13px] font-medium text-fg-muted">
              <CornerDownRight size={14} strokeWidth={2} className="self-center" />
              <span className="font-semibold uppercase tracking-[0.08em] text-fg">
                This week · Issue {featured.no}
              </span>
              <span aria-hidden className="text-fg-subtle">·</span>
              <span>{featured.archiveDate}</span>
            </div>
            <Link
              href={`/issue/${featured.id}`}
              className="group mt-6 block max-w-[820px] border-l-[3px] border-lime-bright pl-6 transition-colors hover:border-lime"
            >
              <h2 className="font-serif text-[34px] font-semibold leading-[1.05] tracking-[-0.015em] text-fg group-hover:text-lime-soft sm:text-[44px]">
                {featured.title}
              </h2>
              {featured.dek ? (
                <p className="mt-5 text-[18px] leading-[1.55] text-fg-muted sm:text-[20px]">
                  {featured.dek}
                </p>
              ) : null}
              <p className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-fg">
                Read this issue free
                <ArrowRight
                  size={16}
                  strokeWidth={2.25}
                  className="transition-transform group-hover:translate-x-1"
                />
              </p>
            </Link>
          </div>
        </section>
      ) : null}

      {/* HEARTBEAT BAND — decorative pulse between hero and content. Its own
          band so it never overlaps the email form / proof-line text above. */}
      <div className="relative h-24 overflow-hidden border-b border-line bg-bg-raised sm:h-28">
        <SignalTrace className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      {/* WHAT YOU GET */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-10 flex items-end justify-between">
            <h2 className="max-w-xl font-serif text-[28px] font-medium leading-tight tracking-tight text-fg sm:text-4xl">
              Five minutes. One decision you&apos;d have missed.
            </h2>
            <span className="hidden  text-[11px] font-medium tracking-[0.08em] text-fg-muted sm:block">
              THE FORMAT
            </span>
          </div>
          <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
            {WHAT_YOU_GET.map((it) => (
              <div key={it.k} className="flex flex-col bg-bg p-8">
                <span className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
                  {it.label}
                </span>
                <h3 className="mt-5 font-serif text-[22px] font-medium leading-[1.2] tracking-tight text-fg">
                  {it.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-fg-muted">
                  {it.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section id="about-strip" className="border-b border-line bg-bg-raised">
        <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            <div>
              <div className="mb-6  text-[11px] font-medium tracking-[0.08em] text-lime-soft">
                WHY THIS EXISTS
              </div>
              <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-[40px]">
                There are 400 AI newsletters. None of them respect your Monday.
              </h2>
              <div className="mt-8 flex max-w-xl flex-col gap-5 text-[15px] leading-[1.75] text-fg-muted">
                <p>
                  AI Signal runs on one belief: you don&apos;t need more
                  information, you need less — chosen well. Every Monday we read
                  the firehose so you don&apos;t have to, and send exactly{' '}
                  <span className="text-cream-dim">one shift</span> that changes
                  how you build.
                </p>
                <p>
                  No affiliate links. No &ldquo;top 10 tools.&rdquo; No
                  breathless threads. A working engineer in Bengaluru writes
                  every issue and reads every reply. Frontier AI substance
                  is global — the lens is local. You get the global frontier
                  plus the India angle (regulation that&apos;s ahead of US/EU
                  on agent payments, INR math, Indic models) every week.
                </p>
              </div>
              <Link
                href="/#subscribe"
                className="group mt-9 inline-flex min-h-[44px] items-center gap-2 font-mono text-[13px] font-semibold tracking-[0.04em] text-cream-dim transition-colors hover:text-lime"
              >
                START WITH MONDAY&apos;S BRIEF
                <ArrowRight
                  size={14}
                  strokeWidth={2.25}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>

            <div className="border border-line-strong">
              {[
                { k: 'WRITTEN BY', v: 'A working engineer — not a content team.' },
                { k: 'CADENCE', v: 'Every Monday · 7:30 AM IST.' },
                { k: 'THE SHAPE', v: "One shift · who it's for · what to do." },
                { k: 'MADE IN', v: 'Bengaluru, India.' },
                { k: 'PRICE', v: 'Free, forever. Reply anytime.' },
              ].map((row, i) => (
                <div
                  key={row.k}
                  className={`flex flex-col gap-2 p-5 sm:p-6 ${i !== 0 ? 'border-t border-line' : ''}`}
                >
                  <span className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
                    {row.k}
                  </span>
                  <span className="text-[15px] leading-[1.55] text-cream-dim">{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ARCHIVE */}
      <section id="archive">
        <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="mb-2  text-[11px] font-medium tracking-[0.08em] text-fg-muted">
                ARCHIVE
              </div>
              <h2 className="font-serif text-[28px] font-medium tracking-tight text-fg sm:text-4xl">
                Past issues
              </h2>
            </div>
          </div>
          {list.length === 0 ? (
            <p className=" text-[12px] font-medium tracking-[0.08em] text-fg-muted">
              ISSUE #001 IS BEING DRAFTED.
            </p>
          ) : (
            <div className="border-t border-line">
              {list.map((iss) => (
                <Link
                  key={iss.id}
                  href={`/issue/${iss.id}`}
                  className="group grid min-h-[44px] grid-cols-1 gap-3 border-b border-line py-7 transition-colors hover:bg-bg-raised sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-7 sm:px-3"
                >
                  <div className="flex items-center gap-4 sm:w-44 sm:flex-col sm:items-start sm:gap-1.5">
                    <span className="font-mono text-[13px] font-semibold text-cream-dim transition-colors group-hover:text-lime">
                      {iss.no}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.08em] text-fg-muted">
                      {iss.archiveDate}
                    </span>
                    <span
                      className={`hidden border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] sm:inline ${
                        iss.kind === 'DEEP DIVE'
                          ? 'border-lime/40 text-lime'
                          : 'border-line-strong text-fg-muted'
                      }`}
                    >
                      {iss.kind}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-[22px] font-medium leading-[1.2] tracking-tight text-fg transition-colors group-hover:text-lime">
                      {iss.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-1 text-[15px] text-fg-muted">
                      {iss.dek}
                    </p>
                  </div>
                  <div className="flex items-center gap-3  text-[11px] font-medium tracking-[0.08em] text-fg-muted">
                    <span>{iss.read}</span>
                    <ArrowUpRight
                      size={16}
                      strokeWidth={1.75}
                      className="text-fg-muted transition-all group-hover:text-lime"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
