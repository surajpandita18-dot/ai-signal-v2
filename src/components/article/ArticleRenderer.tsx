// ArticleRenderer v11 (2026-06-18) — STRATECHERY clone.
// Reference: stratechery.com — Ben Thompson's weekly essays.
// Why this reference: best match for AI Signal's use case (weekly
// editorial synthesis, named throughline + named actors, builder+exec
// audience, technical-strategic register). Lenny is friendlier-PM-tone;
// Stratechery is the format peer.
//
// What Stratechery does that we now copy:
//   - One white column, no hero callout, no pull-quote framing inside body
//   - Serif title, italic dek, dateline + author in two quiet lines
//   - Body = one flowing essay, h2 sub-heads, italic for emphasis,
//     bold inline for STRONG emphasis (rendered by .editorial CSS)
//   - 720px reading column (was 680)
//   - Subscribe row at the end, not the middle
//   - No drop cap (Stratechery doesn't use one)
//
// What AI Signal adds (kept as a CLEAR "Bonus material" footer below a
// heavy divider, so they don't interrupt the essay):
//   - Hero image at the very top (only diff from Stratechery — we like the
//     deterministic next/og PNG as a cover identifier)
//   - "Explained simply" (the Feynman concept)
//   - "Builder Slacks this week" (the production_questions)
//   - "If you remember nothing else" (the signal_of_the_week)
//   - Interview drills + further reading (the appendix)

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
      {/* HERO IMAGE — only AI Signal-specific add vs Stratechery. Quiet
          banner; serves as cover identifier in archive lists. */}
      {issueId ? (
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
      ) : null}

      {/* HEADER — Stratechery discipline. Back link, dateline, title, dek,
          minimal author byline. No avatar circle in header (moved to a
          small line under the title). Hero image already provided identity. */}
      <header>
        <div className="mx-auto max-w-read px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
          <Link
            href="/"
            className="mb-8 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            All issues
          </Link>
          <h1 className="font-serif text-[40px] font-semibold leading-[1.06] tracking-[-0.02em] text-fg sm:text-[60px]">
            {issue.title}
          </h1>
          {issue.dek ? (
            <p className="mt-5 font-serif text-[22px] italic font-normal leading-[1.4] text-fg sm:text-[26px]">
              {issue.dek}
            </p>
          ) : null}
          <p className="mt-7 text-[14px] text-fg-muted">
            <span className="font-semibold text-fg">Suraj Pandita</span>
            <span aria-hidden className="mx-2 text-fg-subtle">·</span>
            {issue.heroDate}
            <span aria-hidden className="mx-2 text-fg-subtle">·</span>
            <span>Issue {issue.no}</span>
            <span aria-hidden className="mx-2 text-fg-subtle">·</span>
            <span>{issue.read.toLowerCase()} read</span>
            {issue.kind === 'DEEP DIVE' ? (
              <>
                <span aria-hidden className="mx-2 text-fg-subtle">·</span>
                <span className="font-semibold text-fg">Deep dive</span>
              </>
            ) : null}
          </p>
          <div className="mt-6">
            <ArticleShare title={issue.title} />
          </div>
        </div>
      </header>

      {/* BODY — Stratechery flowing essay. One .editorial column, no boxes
          between sections. Chapter h2s flow inside the single column. */}
      <main id="main">
        <div className="mx-auto max-w-read px-5 pt-2 pb-14 sm:px-8 sm:pb-16">
          <div className="editorial border-t border-line pt-12">
            {issue.lede ? (
              <div dangerouslySetInnerHTML={{ __html: issue.lede }} />
            ) : null}

            {issue.chapters.map((ch) => (
              <section key={ch.id} id={ch.id} className="mt-12 scroll-mt-32">
                <h2 className="font-serif text-[28px] font-semibold leading-[1.18] tracking-[-0.015em] text-fg sm:text-[32px]">
                  {ch.heading}
                </h2>
                {ch.sub ? (
                  <p className="mt-2 font-serif text-[17px] italic leading-snug text-fg-muted">
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

      {/* CLOSURE — Stratechery-style sign-off line + subscribe row. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-read px-5 py-12 sm:px-8 sm:py-16">
          <p className="font-serif text-[20px] leading-[1.5] text-fg">
            Thanks for reading. If this lands, forward to one builder.
          </p>
          <p className="mt-5 font-serif text-[16px] italic text-fg-muted">
            — Suraj, Bangalore
          </p>
        </div>
      </section>

      <InlineSubscribe />

      {/* BONUS MATERIAL — heavy divider to mark "essay is over, here's the
          extra value." Combines Signal + Explained Simply + Builder Slacks
          + Appendix. These are AI Signal-specific surfaces; Stratechery
          doesn't have them — they're our differentiator. */}
      {(issue.signal_of_the_week ||
        issue.explained_simply ||
        (issue.production_questions && issue.production_questions.length) ||
        issue.appendix) && (
        <section className="border-t-[3px] border-fg">
          <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-[14px] font-bold uppercase tracking-[0.08em] text-fg-muted">
              Bonus material
            </p>
            <h2 className="mt-3 font-serif text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] text-fg sm:text-[36px]">
              The signal, the analogy, and what builders are asking this week.
            </h2>

            <div className="editorial mt-10">
              {issue.signal_of_the_week ? (
                <>
                  <h3>If you remember nothing else.</h3>
                  <blockquote>{issue.signal_of_the_week}</blockquote>
                </>
              ) : null}

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
