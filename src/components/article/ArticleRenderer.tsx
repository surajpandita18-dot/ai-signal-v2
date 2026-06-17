// ArticleRenderer v9 (2026-06-18). Radical simplification per Suraj's
// "poora structure hi change kar do" — kill boxed sections, color washes,
// card grids. One flowing editorial column, Lenny-faithful.
//
// Structure:
//   Hero image (deterministic next/og PNG)
//   Title + signal-as-dek + byline
//   Single .editorial column with:
//     - Drop-cap lede
//     - Chapter h2s with flowing body
//     - Explained-simply woven as another h2 section
//     - Production-questions as a simple "Three things on builder Slacks" h2 + ol
//   Appendix (collapsed under "Take it further")
//   Closure + subscribe

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
      {/* HERO IMAGE — deterministic next/og PNG above the fold */}
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

      {/* TITLE BLOCK — issue meta + title + signal-as-dek + author */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-read px-5 pb-14 pt-12 sm:px-8 sm:pt-16">
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

          {/* Author byline + share */}
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

      {/* BODY — single flowing editorial column. Everything lives inside
          .editorial so the type rules cascade uniformly. */}
      <main id="main" className="bg-bg">
        <div className="mx-auto max-w-read px-5 py-14 sm:px-8 sm:py-16">
          <div className="editorial">
            {/* Signal — a single pull-paragraph at the top of the body in
                serif italic. NOT a boxed callout. Just prose. */}
            {issue.signal_of_the_week ? (
              <p className="mb-10 border-l-4 border-fg pl-6 font-serif text-[24px] italic leading-[1.4] text-fg sm:text-[28px]">
                {issue.signal_of_the_week}
              </p>
            ) : null}

            {/* Drop-cap lede */}
            {issue.lede ? (
              <div className="editorial-lede" dangerouslySetInnerHTML={{ __html: issue.lede }} />
            ) : null}

            {/* Chapters — each renders as h2 + flowing body. No boxed
                styles. The BlockRenderer handles individual block types
                with their own internal styling (math table, layers, etc).
                Sub headings sit under each h2 as italic. */}
            {issue.chapters.map((ch) => (
              <section key={ch.id} id={ch.id} className="mt-14 scroll-mt-32">
                <h2 className="font-serif text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] text-fg sm:text-[36px]">
                  {ch.heading}
                </h2>
                {ch.sub ? (
                  <p className="mt-3 max-w-[640px] font-serif text-[18px] italic leading-snug text-fg-muted">
                    {ch.sub}
                  </p>
                ) : null}
                <div className="mt-7 flex flex-col gap-7">
                  {ch.blocks.map((b, i) => (
                    <BlockRenderer key={i} block={b} />
                  ))}
                </div>
              </section>
            ))}

            {/* Explained simply — woven as one more h2 inside the body */}
            {issue.explained_simply ? (
              <section className="mt-16">
                <h2 className="font-serif text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] text-fg sm:text-[36px]">
                  Explained simply: {issue.explained_simply.concept}.
                </h2>
                <p className="mt-6">{issue.explained_simply.explanation}</p>
              </section>
            ) : null}

            {/* Production questions — h2 + numbered list, body type */}
            {issue.production_questions && issue.production_questions.length ? (
              <section className="mt-16">
                <h2 className="font-serif text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] text-fg sm:text-[36px]">
                  Three things on builder Slacks this week.
                </h2>
                <ol className="mt-6 flex list-decimal flex-col gap-4 pl-6 marker:font-serif marker:text-fg-muted">
                  {issue.production_questions.map((q, i) => (
                    <li key={i} className="pl-2">
                      {q}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>
      </main>

      {/* APPENDIX — interview drills + further reading. Sits below the
          main editorial column as a clearly separated "Take it further". */}
      {issue.appendix ? <Appendix appendix={issue.appendix} issueId={issueId} /> : null}

      {/* INLINE SUBSCRIBE — mid-page CTA before the closure */}
      <InlineSubscribe />

      {/* CLOSURE — personal sign-off, Lenny-faithful */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
          <p className="font-serif text-[20px] leading-[1.5] text-fg">
            Thanks for reading. If this lands, forward to one builder.
          </p>
          <div className="mt-7 flex items-center gap-3">
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
    </article>
  )
}
