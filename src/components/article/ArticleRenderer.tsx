import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { BlockRenderer } from './blocks'
import Appendix from './Appendix'
import type { RenderableIssue } from './payload-adapter'

export default function ArticleRenderer({ issue }: { issue: RenderableIssue }) {
  return (
    <>
      {/* HERO */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-read px-5 pb-12 pt-14 sm:px-8 sm:pt-20">
          <Link
            href="/"
            className="mb-10 inline-flex min-h-[44px] items-center gap-2 font-mono text-[11px] tracking-label text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={13} strokeWidth={2} />
            ALL ISSUES
          </Link>
          <div className="mb-7 font-mono text-[11px] tracking-label text-fg-muted">
            Issue {issue.no}
            {issue.kind === 'DEEP DIVE' ? (
              <>
                <span className="mx-3 text-line-strong">·</span>
                <span className="text-lime">Deep dive</span>
              </>
            ) : null}
            <span className="mx-3 text-line-strong">·</span>
            {issue.heroDate}
          </div>
          <h1 className="font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[56px]">
            {issue.title}
          </h1>
          {issue.dek ? (
            <p className="mt-7 font-serif text-[22px] italic leading-[1.35] text-cream-dim sm:text-[26px]">
              {issue.dek}
            </p>
          ) : null}
          <div className="mt-9 border-t border-line pt-5 font-serif text-[15px] italic text-fg-muted">
            By Suraj Pandita, Bangalore
            <span className="mx-2 not-italic">·</span>
            <span className="font-mono text-[11px] not-italic tracking-label">
              {issue.read} READ
            </span>
          </div>
          {issue.lede ? (
            <div className="editorial editorial-lede mt-9" dangerouslySetInnerHTML={{ __html: issue.lede }} />
          ) : null}
        </div>
      </header>

      {/* SIGNAL OF THE WEEK — Editorial v2 — the ONE screenshot-worthy line.
          Renders only when payload includes the field (new synthesizer
          output). Large serif pullquote with lime mark. */}
      {issue.signal_of_the_week ? (
        <section className="border-b border-line bg-bg-raised">
          <div className="mx-auto max-w-read px-5 py-14 sm:px-8 sm:py-20">
            <p className="font-mono text-[11px] tracking-label text-fg-muted">
              SIGNAL · IF YOU REMEMBER NOTHING ELSE
            </p>
            <p className="mt-5 font-serif text-[28px] font-medium leading-[1.22] tracking-tight text-fg sm:text-[36px]">
              <span className="mr-3 text-lime" aria-hidden>
                ⌁
              </span>
              {issue.signal_of_the_week}
            </p>
          </div>
        </section>
      ) : null}

      <main className="mx-auto max-w-read px-5 sm:px-8">
        {issue.chapters.map((ch, idx) => {
          const last = idx === issue.chapters.length - 1
          // Editorial moat anchor: the Glance chapter is the only chapter
          // where the human directly picked (Ship/Hold/Kill). Single lime tick
          // marks it as the editorial moment of the issue.
          const isMoat = ch.id === 'ch-glance'
          return (
            <section
              key={ch.id}
              id={ch.id}
              className={`scroll-mt-32 pb-16 pt-20 ${last ? '' : 'border-b border-line'}`}
            >
              <h2 className="font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-fg sm:text-[40px]">
                {isMoat ? (
                  <span
                    className="mr-3 inline-block -translate-y-1 text-lime"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
                {ch.heading}
              </h2>
              {ch.sub && (
                <p className="mt-3 max-w-[520px] font-serif text-[18px] italic leading-snug text-cream-dim">{ch.sub}</p>
              )}
              <div className="mt-9 flex flex-col gap-9">
                {ch.blocks.map((b, i) => (
                  <BlockRenderer key={i} block={b} />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      {/* EXPLAINED SIMPLY — Editorial v2 — one concept in Feynman register.
          Renders only when payload includes it. */}
      {issue.explained_simply ? (
        <section className="border-t border-line">
          <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
            <p className="font-mono text-[11px] tracking-label text-fg-muted">
              EXPLAINED SIMPLY · ONE CONCEPT THIS WEEK
            </p>
            <h2 className="mt-4 font-serif text-[30px] font-medium leading-[1.12] tracking-tight text-fg sm:text-[36px]">
              {issue.explained_simply.concept}.
            </h2>
            <p className="mt-7 max-w-[640px] font-serif text-[19px] leading-[1.55] text-cream-dim">
              {issue.explained_simply.explanation}
            </p>
          </div>
        </section>
      ) : null}

      {/* PRODUCTION QUESTIONS — Editorial v2 — real Monday-morning questions.
          Renders only when payload includes ≥1 question. */}
      {issue.production_questions && issue.production_questions.length ? (
        <section className="border-t border-line bg-bg-raised">
          <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
            <p className="font-mono text-[11px] tracking-label text-fg-muted">
              FROM THE STANDUP · WHAT BUILDERS ARE ASKING THIS WEEK
            </p>
            <h2 className="mt-4 font-serif text-[30px] font-medium leading-[1.12] tracking-tight text-fg sm:text-[36px]">
              Three real questions in the air.
            </h2>
            <ol className="mt-10 flex flex-col gap-7">
              {issue.production_questions.map((q, i) => (
                <li key={i} className="flex gap-5 border-t border-line pt-7">
                  <span className="font-mono text-[12px] tracking-label text-lime">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="max-w-[640px] font-serif text-[18px] leading-[1.55] text-fg">
                    {q}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* APPENDIX — interview drills + further reading (web only, lean email).
          Conditional on payload.appendix; older issues without it render
          nothing here. Drills are topic-aware (per fresh-model audit
          2026-06-16); resources include the India-builder differentiator. */}
      {issue.appendix && <Appendix appendix={issue.appendix} />}

      {/* END CTA — closure beat as drop-the-mic line, then quiet sign-off.
          The lime "——" mark gives the closure a typographic terminal that
          the body cannot accidentally produce. */}
      <section>
        <div className="mx-auto max-w-read px-5 py-20 sm:px-8 sm:py-24">
          <p className="font-serif text-[22px] leading-snug text-fg">
            <span className="text-lime">——</span> That&apos;s the shift.
            You&apos;re caught up.
          </p>
          <p className="mt-10 max-w-[520px] text-[17px] leading-[1.65] text-fg-muted">
            Try the Monday move this week. I&apos;ll have the next shift ready
            Monday morning — one email, one signal, no roundup.
          </p>
          <p className="mt-7 font-serif text-[15px] italic text-fg-muted">
            — Suraj, Bengaluru
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-7 font-mono text-[12px] tracking-label">
            <Link
              href="/#subscribe"
              className="group inline-flex min-h-[44px] items-center text-fg transition-colors hover:text-lime"
            >
              <span className="border-b border-lime pb-0.5">SUBSCRIBE FREE</span>
              <ArrowRight
                size={13}
                strokeWidth={2.25}
                className="ml-2 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/#archive"
              className="inline-flex min-h-[44px] items-center text-fg-muted transition-colors hover:text-fg"
            >
              READ PAST ISSUES →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
