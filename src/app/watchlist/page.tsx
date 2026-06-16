// /watchlist — defensible institutional memory of the Indian AI market.
// Three living tables (API prices, regulation status, enterprise deal log)
// that compound across issues. The reason a reader opens AI Signal even on
// a slow news week.
//
// v1 reads from src/config/watchlist.ts (hand-curated weekly). v2 will
// move to a `watchlist_rows` table updated automatically by the
// synthesizer pipeline.

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import { isSubscribed } from '@/lib/subscription'
import {
  PRICE_LOG,
  REGULATION_LOG,
  DEAL_LOG,
  WATCHLIST_META,
  type PriceRow,
  type RegulationRow,
  type DealRow,
} from '@/config/watchlist'

export const metadata = {
  title: 'The Watchlist',
  description:
    'API price log, regulation status, and Indian enterprise AI deals — updated weekly.',
}

const BEAT_LABEL: Record<DealRow['beat'], string> = {
  'frontier-api': 'Frontier APIs',
  'india-infra': 'India Infra',
  regulation: 'Regulation',
  'indic-models': 'Indic Models',
  'talent-comp': 'Talent & Comp',
  'enterprise-deals': 'Enterprise Deals',
}

const REG_STATUS_TINT: Record<
  RegulationRow['status'],
  { label: string; bg: string; fg: string }
> = {
  'in-force': { label: 'IN FORCE', bg: 'bg-lime-bright', fg: 'text-bg' },
  consultation: {
    label: 'CONSULTATION',
    bg: 'bg-line-strong',
    fg: 'text-fg',
  },
  draft: { label: 'DRAFT', bg: 'bg-line', fg: 'text-cream-dim' },
  expected: { label: 'EXPECTED', bg: 'bg-bg-raised', fg: 'text-fg-muted' },
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    })
    .toUpperCase()
}

export default async function WatchlistPage() {
  const subscribed = await isSubscribed()
  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav subscribed={subscribed} />

      {/* HERO */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-read px-5 pb-12 pt-14 sm:px-8 sm:pt-20">
          <Link
            href="/"
            className="mb-10 inline-flex min-h-[44px] items-center gap-2 font-mono text-[11px] tracking-label text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={13} strokeWidth={2} />
            HOME
          </Link>
          <div className="mb-7 font-mono text-[11px] tracking-label text-fg-muted">
            THE WATCHLIST
            <span className="mx-3 text-line-strong">·</span>
            UPDATED {fmtDate(WATCHLIST_META.updated)}
          </div>
          <h1 className="font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[56px]">
            What changed this week.
          </h1>
          <p className="mt-7 max-w-[640px] font-serif text-[20px] italic leading-[1.4] text-cream-dim sm:text-[24px]">
            API prices, India regulation, and enterprise deals — the three
            things on every builder&apos;s desk that move week to week. Open
            this on Friday before you make a stack decision.
          </p>
          <p className="mt-9 max-w-[560px] border-t border-line pt-5 text-[15px] leading-[1.6] text-fg-muted">
            FX basis: ₹{WATCHLIST_META.fx_inr_per_usd}/USD (held quarterly so
            week-over-week deltas reflect prices, not the rupee).
            <span className="mx-2">·</span>
            Next refresh: {fmtDate(WATCHLIST_META.next_update)}.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-read px-5 sm:px-8">
        {/* SECTION 1 — API price log */}
        <section className="scroll-mt-32 border-b border-line py-16 sm:py-20">
          <p className="font-mono text-[11px] tracking-label text-fg-muted">
            01 · API PRICE LOG
          </p>
          <h2 className="mt-4 font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-fg sm:text-[40px]">
            <span className="mr-3 inline-block -translate-y-1 text-lime" aria-hidden>
              ₹
            </span>
            Frontier + Indic, USD AND INR.
          </h2>
          <p className="mt-3 max-w-[520px] font-serif text-[17px] italic leading-snug text-cream-dim">
            Per 1M tokens. Week-over-week direction in the right column.
          </p>

          <div className="mt-10 overflow-x-auto">
            <div className="min-w-[680px] border-t border-b border-line-strong">
              <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.6fr_2fr] border-b border-line font-mono text-[10px] tracking-label text-fg-muted">
                <div className="py-3">MODEL</div>
                <div className="py-3 text-right">CONTEXT</div>
                <div className="py-3 text-right">USD/M</div>
                <div className="py-3 text-right">INR/M</div>
                <div className="py-3 text-right">WoW</div>
                <div className="py-3 pl-6">NOTE</div>
              </div>
              {PRICE_LOG.map((r, i) => (
                <PriceRowView key={i} r={r} />
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2 — Regulation status */}
        <section className="scroll-mt-32 border-b border-line py-16 sm:py-20">
          <p className="font-mono text-[11px] tracking-label text-fg-muted">
            02 · REGULATION STATUS
          </p>
          <h2 className="mt-4 font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-fg sm:text-[40px]">
            <span className="mr-3 inline-block -translate-y-1 text-lime" aria-hidden>
              §
            </span>
            What the regulators just moved.
          </h2>
          <p className="mt-3 max-w-[520px] font-serif text-[17px] italic leading-snug text-cream-dim">
            DPDP, RBI, NPCI, SEBI — current state, last update, next expected
            milestone.
          </p>

          <div className="mt-10 flex flex-col">
            {REGULATION_LOG.map((r, i) => (
              <RegRowView key={i} r={r} isFirst={i === 0} />
            ))}
          </div>
        </section>

        {/* SECTION 3 — Enterprise deal log */}
        <section className="scroll-mt-32 py-16 sm:py-20">
          <p className="font-mono text-[11px] tracking-label text-fg-muted">
            03 · ENTERPRISE DEAL LOG
          </p>
          <h2 className="mt-4 font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-fg sm:text-[40px]">
            <span className="mr-3 inline-block -translate-y-1 text-lime" aria-hidden>
              ✕
            </span>
            Three deals shaping the buyer side.
          </h2>
          <p className="mt-3 max-w-[520px] font-serif text-[17px] italic leading-snug text-cream-dim">
            Most recent Indian enterprise AI signings — buyer, vendor, beat,
            and what it tells you.
          </p>

          <div className="mt-10 flex flex-col gap-10">
            {DEAL_LOG.map((d, i) => (
              <DealRowView key={i} d={d} index={i} />
            ))}
          </div>
        </section>

        {/* Footnote */}
        <section className="border-t border-line py-12">
          <p className="max-w-[560px] text-[14px] leading-[1.6] text-fg-muted">
            Each row is sourced from the prior week&apos;s issue or a public
            announcement. Got a correction or a deal we missed? Reply to
            the weekly email — fastest way in.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function PriceRowView({ r }: { r: PriceRow }) {
  const arrow =
    r.delta_last_week === 'up' ? '▲' : r.delta_last_week === 'down' ? '▼' : '·'
  const arrowClr =
    r.delta_last_week === 'up'
      ? 'text-danger'
      : r.delta_last_week === 'down'
        ? 'text-lime'
        : 'text-fg-subtle'
  return (
    <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.6fr_2fr] items-baseline border-b border-line text-[15px] last:border-b-0">
      <div className="py-4 text-cream-dim">
        <span className="font-mono text-[10px] uppercase tracking-label text-fg-muted">
          {r.vendor}
        </span>
        <span className="mx-2 text-line-strong">·</span>
        <span className="text-fg">{r.model}</span>
      </div>
      <div className="py-4 text-right font-mono text-[12px] uppercase tracking-label text-fg-muted">
        {r.context}
      </div>
      <div className="py-4 text-right font-mono text-fg">
        ${r.usd_per_m.toFixed(r.usd_per_m < 1 ? 3 : 2)}
      </div>
      <div className="py-4 text-right font-mono text-fg">
        ₹{r.inr_per_m.toFixed(r.inr_per_m < 10 ? 1 : 0)}
      </div>
      <div className={`py-4 text-right font-mono text-[15px] ${arrowClr}`}>
        {arrow}
        {r.delta_pct != null && (
          <span className="ml-1 text-[12px]">
            {r.delta_pct > 0 ? '+' : ''}
            {r.delta_pct}%
          </span>
        )}
      </div>
      <div className="py-4 pl-6 text-[14px] leading-[1.55] text-fg-muted">
        {r.note ?? ''}
      </div>
    </div>
  )
}

function RegRowView({ r, isFirst }: { r: RegulationRow; isFirst: boolean }) {
  const tint = REG_STATUS_TINT[r.status]
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-8 ${
        isFirst ? 'pt-2' : 'border-t border-line pt-8'
      } pb-8`}
    >
      <div className="flex shrink-0 flex-col gap-3 sm:w-56">
        <span
          className={`inline-block w-fit px-2.5 py-1 font-mono text-[10px] tracking-label ${tint.bg} ${tint.fg}`}
        >
          {tint.label}
        </span>
        <div>
          <h3 className="font-serif text-[20px] font-medium leading-tight tracking-tight text-fg">
            {r.policy}
          </h3>
          <p className="mt-2 font-mono text-[10px] tracking-label text-fg-muted">
            {r.body}
            <span className="mx-2 text-line-strong">·</span>
            UPD {fmtDate(r.last_update)}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-[16px] leading-[1.7] text-cream-dim">
          {r.builder_impact}
        </p>
        {r.next_milestone && (
          <p className="text-[14px] italic leading-[1.6] text-fg-muted">
            Next: {r.next_milestone}
          </p>
        )}
      </div>
    </div>
  )
}

function DealRowView({ d, index }: { d: DealRow; index: number }) {
  return (
    <article className={index === 0 ? '' : 'border-t border-line pt-10'}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-serif text-[15px] italic text-lime">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-mono text-[10px] tracking-label text-fg-muted">
          {BEAT_LABEL[d.beat]}
        </span>
        <span className="font-mono text-[10px] tracking-label text-fg-subtle">
          {d.signed.toUpperCase()}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-[22px] font-medium leading-tight tracking-tight text-fg">
        {d.buyer}{' '}
        <span className="text-cream-dim">→</span>{' '}
        <span className="italic">{d.vendor}</span>
        {d.value_inr_cr != null && (
          <span className="ml-3 font-mono text-[14px] tracking-label text-lime">
            ₹{d.value_inr_cr}Cr
          </span>
        )}
      </h3>
      <p className="mt-3 max-w-[640px] text-[16px] leading-[1.7] text-fg-muted">
        {d.note}
      </p>
    </article>
  )
}
