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
  const { data: issues } = await supabase
    .from('issues')
    .select('id, status, issue_type, created_at, payload')
    .in('status', ['drafted', 'awaiting_human'])
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

      {/* HERO */}
      <section id="subscribe" className="relative border-b border-line">
        <div className="relative mx-auto grid max-w-shell grid-cols-1 lg:grid-cols-[1.42fr_1fr]">
          <div className="flex flex-col justify-center px-5 py-16 sm:px-8 lg:border-r lg:border-line lg:py-24 lg:pr-14">
            <div className="reveal d-1 mb-7 flex items-center gap-2.5 font-mono text-[11px] tracking-label text-lime-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              THE MONDAY BRIEF · INDIAN BUILDERS ONLY
            </div>
            <h1 className="reveal d-2 font-serif text-[44px] font-semibold leading-[1.02] tracking-tight text-fg sm:text-6xl">
              One AI shift
              <br />
              that matters.
              <br />
              <span className="text-fg-muted">Every Monday.</span>
            </h1>
            <p className="reveal d-3 mt-6 max-w-md text-[15px] leading-relaxed text-fg-muted sm:text-base">
              The single move reshaping the stack — what happened, who it&apos;s
              for, and what to do Monday morning. No roundups. No hype.
            </p>

            <div className="reveal d-4 mt-9 max-w-lg">
              {subscribed ? (
                <div className="flex flex-col gap-2 border border-line-strong bg-card px-5 py-4">
                  <div className="font-mono text-[11px] tracking-label text-lime">
                    SUBSCRIBED ✓
                  </div>
                  <p className="text-[14px] text-fg-muted">
                    Your next brief lands Monday 7:30 AM IST. Scroll for the
                    latest issue.
                  </p>
                </div>
              ) : (
                <HomeSubscribeForm />
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-[0.04em] text-fg-subtle">
                <span>FREE FOREVER</span>
                <span className="text-line-strong">/</span>
                <span>6-MIN READ</span>
                <span className="text-line-strong">/</span>
                <span>WRITTEN IN BENGALURU</span>
              </div>
            </div>
          </div>

          {featured ? (
            <div className="flex flex-col justify-center bg-bg-raised px-5 py-12 sm:px-8 lg:py-24 lg:pl-12">
              <div className="reveal d-3 mb-5 flex items-center gap-2 font-mono text-[11px] tracking-label text-fg-subtle">
                <CornerDownRight size={13} strokeWidth={2} />
                THIS WEEK · ISSUE {featured.no}
              </div>
              <div className="reveal d-4 border-l-2 border-lime pl-5">
                <h2 className="font-serif text-2xl font-semibold leading-[1.1] tracking-tight text-fg sm:text-[28px]">
                  {featured.title}
                </h2>
                <p className="mt-3.5 text-[13.5px] leading-relaxed text-fg-muted">
                  {featured.dek}
                </p>
              </div>
              <dl className="reveal d-5 mt-7 flex flex-col gap-3">
                {featured.forLine ? (
                  <div className="flex items-baseline gap-3">
                    <dt className="w-16 shrink-0 font-mono text-[10px] font-semibold tracking-label text-lime-soft">
                      FOR
                    </dt>
                    <dd className="text-[13px] text-cream-dim">{featured.forLine}</dd>
                  </div>
                ) : null}
                {featured.stealLine ? (
                  <div className="flex items-baseline gap-3">
                    <dt className="w-16 shrink-0 font-mono text-[10px] font-semibold tracking-label text-lime-soft">
                      STEAL
                    </dt>
                    <dd className="text-[13px] text-cream-dim">
                      {featured.stealLine}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="reveal d-6 mt-8">
                <Link
                  href={`/issue/${featured.id}`}
                  className="group inline-flex items-center gap-2 font-mono text-[13px] font-semibold tracking-[0.04em] text-lime"
                >
                  READ THIS ISSUE FREE
                  <ArrowRight
                    size={14}
                    strokeWidth={2.25}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <p className="mt-2 text-[12px] text-fg-subtle">
                  …then get the next one Monday.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

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
            <span className="hidden font-mono text-[11px] tracking-label text-fg-subtle sm:block">
              THE FORMAT
            </span>
          </div>
          <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
            {WHAT_YOU_GET.map((it) => (
              <div key={it.k} className="flex flex-col bg-bg p-7">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-4xl font-semibold text-line-strong">
                    {it.k}
                  </span>
                  <span className="font-mono text-[10px] tracking-label text-lime-soft">
                    {it.label}
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-xl font-medium tracking-tight text-fg">
                  {it.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-muted">
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
              <div className="mb-6 font-mono text-[11px] tracking-label text-lime-soft">
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
                  every issue and reads every reply — built for the people
                  shipping AI in India, not the people tweeting about it.
                </p>
              </div>
              <Link
                href="/#subscribe"
                className="group mt-9 inline-flex items-center gap-2 font-mono text-[13px] font-semibold tracking-[0.04em] text-lime"
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
                  className={`flex flex-col gap-1.5 p-5 sm:p-6 ${i !== 0 ? 'border-t border-line' : ''}`}
                >
                  <span className="font-mono text-[10px] tracking-label text-fg-subtle">
                    {row.k}
                  </span>
                  <span className="text-[14px] text-cream-dim">{row.v}</span>
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
              <div className="mb-2 font-mono text-[11px] tracking-label text-fg-subtle">
                ARCHIVE
              </div>
              <h2 className="font-serif text-[28px] font-medium tracking-tight text-fg sm:text-4xl">
                Past issues
              </h2>
            </div>
          </div>
          {list.length === 0 ? (
            <p className="font-mono text-[12px] tracking-label text-fg-subtle">
              ISSUE #001 IS BEING DRAFTED.
            </p>
          ) : (
            <div className="border-t border-line">
              {list.map((iss) => (
                <Link
                  key={iss.id}
                  href={`/issue/${iss.id}`}
                  className="group grid grid-cols-1 gap-3 border-b border-line py-6 transition-colors hover:bg-bg-raised sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-7 sm:px-3"
                >
                  <div className="flex items-center gap-4 sm:w-44 sm:flex-col sm:items-start sm:gap-1.5">
                    <span className="font-mono text-[13px] font-semibold text-lime">
                      {iss.no}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.08em] text-fg-subtle">
                      {iss.archiveDate}
                    </span>
                    <span
                      className={`hidden border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] sm:inline ${
                        iss.kind === 'DEEP DIVE'
                          ? 'border-lime/40 text-lime'
                          : 'border-line-strong text-fg-subtle'
                      }`}
                    >
                      {iss.kind}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl font-medium tracking-tight text-fg transition-colors group-hover:text-lime sm:text-[22px]">
                      {iss.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-[13px] text-fg-muted">
                      {iss.dek}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px] tracking-label text-fg-subtle">
                    <span>{iss.read}</span>
                    <ArrowUpRight
                      size={16}
                      strokeWidth={1.75}
                      className="text-fg-subtle transition-all group-hover:text-lime"
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
