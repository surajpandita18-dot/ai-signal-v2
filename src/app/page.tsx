// Homepage — issue archive index + subscribe CTA.

import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { Logo } from '@/components/Logo'
import type { IssuePayload } from '../../db/types/database'

export const dynamic = 'force-dynamic'

function fmt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso)
    .toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()
}

export default async function HomePage() {
  const supabase = createAdminSupabaseClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('id, status, created_at, payload')
    .in('status', ['drafted', 'awaiting_human'])
    .order('created_at', { ascending: false })
    .limit(20)

  const list = (issues ?? []).map((it, i) => ({
    id: it.id,
    number: String((issues?.length ?? 0) - i).padStart(3, '0'),
    date: fmt(it.created_at),
    headline: (it.payload as IssuePayload | null)?.headline ?? '—',
    throughline: (it.payload as IssuePayload | null)?.throughline ?? '',
  }))

  return (
    <>
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-paper">
            <Logo />
          </Link>
          <nav className="hidden gap-6 sm:flex" aria-label="Primary">
            <Link href="/" aria-current="page" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper hover:text-paper">
              Issues
            </Link>
            <Link href="/about" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
              About
            </Link>
            <Link href="/subscribe" className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper">
              Subscribe
            </Link>
          </nav>
          <Link
            href="/subscribe"
            className="rounded bg-paper px-3 py-1.5 font-heading text-[12px] font-semibold text-ink sm:hidden"
          >
            Subscribe
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero / brand statement */}
        <section className="border-b border-line">
          <div className="mx-auto max-w-reader px-5 py-16 sm:px-6 sm:py-24">
            <p className="eyebrow">The India AI Builder’s Brief</p>
            <h1 className="mt-4 font-heading text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[56px]">
              Mondays. <span className="text-accent">One shift.</span> Indian
              builders only.
            </h1>
            <p className="mt-6 max-w-[600px] font-body text-[18px] leading-relaxed text-ink/85 sm:text-[20px]">
              A weekly synthesis for Indian AI builders, PMs, and founders. We
              read frontier-API moves, India infra, regulation, Indic models,
              talent, and enterprise deals — and tell you the one shift that
              actually matters for what you ship this quarter.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/subscribe"
                className="inline-flex items-center rounded bg-ink px-6 py-3 font-heading text-[15px] font-semibold text-paper transition hover:bg-accent"
              >
                Subscribe for free
              </Link>
              <Link
                href="/about"
                className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted hover:text-ink"
              >
                Read what we cover →
              </Link>
            </div>
          </div>
        </section>

        {/* Archive */}
        <section>
          <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
            <div className="mb-10 flex items-baseline gap-4">
              <span className="font-heading text-[13px] font-semibold tracking-[0.16em] text-accent">§</span>
              <h2 className="font-heading text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
                Recent issues
              </h2>
            </div>

            {list.length === 0 ? (
              <p className="font-body text-[16px] italic text-muted">
                Issue #001 is being drafted now.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((it) => (
                  <li key={it.id} className="py-6 first:pt-0 last:pb-0">
                    <Link
                      href={`/issue/${it.id}`}
                      className="group block focus-visible:outline-none"
                    >
                      <div className="flex items-baseline gap-4 text-[11px] tabular">
                        <span className="font-mono uppercase tracking-[0.16em] text-accent">
                          Issue&nbsp;{it.number}
                        </span>
                        <span className="font-mono uppercase tracking-[0.12em] text-muted">
                          {it.date}
                        </span>
                      </div>
                      <p className="mt-2 font-heading text-[22px] font-semibold leading-snug text-ink group-hover:text-accent">
                        {it.headline}
                      </p>
                      {it.throughline ? (
                        <p className="mt-2 font-body text-[16px] italic leading-snug text-ink/70">
                          {it.throughline}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Logo />
            <p className="meta">
              <span translate="no">getaisignal.org</span>
            </p>
          </div>
          <p className="mt-3 meta">
            Monday mornings. ~1500 words. For Indian AI builders, PMs, founders.
          </p>
        </div>
      </footer>
    </>
  )
}
