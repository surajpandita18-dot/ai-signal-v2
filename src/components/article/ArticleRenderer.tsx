// ArticleRenderer v10 (2026-06-18). Discard the old multi-section "dashboard"
// structure. The page reads as ONE editorial piece — header → drop-cap
// opening → flowing body chapters as essay → kicker (the signal) →
// closure. The appendix collapses to a single "Take it further" block.
//
// Reader journey (designed deliberately):
//   1. Hook — the headline
//   2. Promise — the dek (the throughline)
//   3. Author trust — small byline
//   4. Open — drop-cap scene paragraph
//   5. Substance — body chapters as one flowing essay
//   6. Stakes — Ship/Hold/Kill embedded in the body
//   7. Reward — the signal as a single italic pull-paragraph callout
//   8. Closure — personal sign-off
//   9. Optional — Take it further (explained simply, builder Slacks, appendix)

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BlockRenderer } from './blocks'
import Appendix from './Appendix'
import ArticleShare from './ArticleShare'
import InlineSubscribe from './InlineSubscribe'
import type { RenderableIssue } from './payload-adapter'

export default function ArticleRenderer({
  issue,
  issueId,
}: {
  issue: RenderableIssue
  issueId?: string
}) {
  return (
    <article className="bg-bg">
      {/* HERO IMAGE — deterministic next/og PNG */}
      {issueId ? (
        <div className="border-b border-line">
          <div className="mx-auto max-w-read px-5 pt-8 sm:px-8 sm:pt-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/issue/${issueId}/hero-image`}
              alt={`AI Signal — ${issue.title}`}
              width={1600}
              height={500}
              className="block h-auto w-full"
            />
          </div>
        </div>
      ) : null}

      {/* HEADER — meta + title + dek + byline. No subhead boxes, no separate
          "Issue 003 · DEEP DIVE" eyebrow heavy block. */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-read px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
          <Link
            href="/"
            className="mb-10 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            All issues
          </Link>
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-fg-muted">
            Issue {issue.no}
            {issue.kind === 'DEEP DIVE' ? (
              <>
                <span aria-hidden className="mx-2 text-fg-subtle">·</span>
                <span className="text-fg">Deep dive</span>
              </>
            ) : null}
            <span aria-hidden className="mx-2 text-fg-subtle">·</span>
            {issue.heroDate}
          </p>
          <h1 className="mt-5 font-serif text-[40px] font-semibold leading-[1.04] tracking-[-0.02em] text-fg sm:text-[64px]">
            {issue.title}
          </h1>
          {issue.dek ? (
            <p className="mt-6 max-w-[680px] font-serif text-[21px] font-normal leading-[1.4] text-fg-muted sm:text-[24px]">
              {issue.dek}
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <div className="flex items-center gap-4">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-lime-bright font-serif text-[18px] font-bold text-fg"
                aria-hidden
              >
                S
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold text-fg">Suraj Pandita</p>
                <p className="text-[13px] text-fg-muted">
                  Bangalore · {issue.read.toLowerCase()} read
                </p>
              </div>
            </div>
            <ArticleShare title={issue.title} />
          </div>
        </div>
      </header>

      {/* BODY — single .editorial column. Drop-cap lede then chapters flowing
          as continuous prose, NO section borders between them. Each chapter's
          heading becomes an inline h2; sub captions become italic prose. */}
      <main id="main">
        <div className="mx-auto max-w-read px-5 py-14 sm:px-8 sm:py-16">
          <div className="editorial">
            {issue.lede ? (
              <div className="editorial-lede" dangerouslySetInnerHTML={{ __html: issue.lede }} />
            ) : null}

            {issue.chapters.map((ch) => (
              <section key={ch.id} id={ch.id} className="mt-14 scroll-mt-32">
                <h2 className="font-serif text-[28px] font-semibold leading-[1.18] tracking-[-0.015em] text-fg sm:text-[34px]">
                  {ch.heading}
                </h2>
                {ch.sub ? (
                  <p className="mt-2 max-w-[640px] font-serif text-[17px] italic leading-snug text-fg-muted">
                    {ch.sub}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col gap-6">
                  {ch.blocks.map((b, i) => (
                    <BlockRenderer key={i} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* THE SIGNAL — kicker. After the body, before the closure. The
          screenshot moment. One italic Fraunces pull paragraph, no box,
          left rule. The takeaway the reader keeps. */}
      {issue.signal_of_the_week ? (
        <section className="border-t border-line">
          <div className="mx-auto max-w-read px-5 py-14 sm:px-8 sm:py-16">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">
              If you remember nothing else
            </p>
            <blockquote className="mt-5 border-l-4 border-fg pl-7 font-serif text-[26px] italic leading-[1.35] text-fg sm:text-[34px]">
              {issue.signal_of_the_week}
            </blockquote>
            <div className="mt-6">
              <ArticleShare title={issue.signal_of_the_week} />
            </div>
          </div>
        </section>
      ) : null}

      {/* CLOSURE — personal sign-off, before the take-it-further block. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-read px-5 py-14 sm:px-8 sm:py-16">
          <p className="font-serif text-[20px] leading-[1.5] text-fg">
            Thanks for reading. If this lands, forward to one builder.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-bright font-serif text-[14px] font-bold text-fg"
              aria-hidden
            >
              S
            </span>
            <p className="font-serif text-[16px] italic text-fg-muted">— Suraj</p>
          </div>
        </div>
      </section>

      {/* INLINE SUBSCRIBE — between closure and take-it-further */}
      <InlineSubscribe />

      {/* TAKE IT FURTHER — collapses the three formerly-boxed sections
          (explained simply, builder Slacks, appendix) into one quiet
          footer block. The page is over; this is bonus material. */}
      {(issue.explained_simply ||
        (issue.production_questions && issue.production_questions.length) ||
        issue.appendix) && (
        <section className="border-t border-line bg-bg-raised">
          <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-[14px] font-bold uppercase tracking-[0.08em] text-fg-muted">
              Take it further
            </p>
            <h2 className="mt-3 font-serif text-[28px] font-semibold leading-[1.15] tracking-[-0.015em] text-fg sm:text-[34px]">
              For the curious + the builder.
            </h2>

            <div className="editorial mt-10">
              {issue.explained_simply ? (
                <>
                  <h3>Explained simply: {issue.explained_simply.concept}.</h3>
                  <p>{issue.explained_simply.explanation}</p>
                </>
              ) : null}

              {issue.production_questions && issue.production_questions.length ? (
                <>
                  <h3>Three things on builder Slacks this week.</h3>
                  <ol className="mt-3 flex list-decimal flex-col gap-3 pl-6 marker:font-serif marker:font-semibold marker:text-fg">
                    {issue.production_questions.map((q, i) => (
                      <li key={i} className="pl-2">
                        {q}
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </div>

            {issue.appendix ? (
              <div className="mt-12 border-t border-line pt-10">
                <Appendix appendix={issue.appendix} issueId={issueId} />
              </div>
            ) : null}
          </div>
        </section>
      )}
    </article>
  )
}
