import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import ChapterNav from './ChapterNav'
import { BlockRenderer, Kicker } from './blocks'
import type { RenderableIssue } from './payload-adapter'

export default function ArticleRenderer({ issue }: { issue: RenderableIssue }) {
  const navChapters = issue.chapters.map((c) => ({ id: c.id, label: c.label }))

  return (
    <>
      {/* HERO */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-read px-5 pb-12 pt-14 sm:px-8 sm:pt-20">
          <Link
            href="/"
            className="mb-9 inline-flex items-center gap-2 font-mono text-[11px] tracking-label text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft size={13} strokeWidth={2} />
            ALL ISSUES
          </Link>
          <div className="mb-6 flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-label">
            <span
              className={`border px-2 py-0.5 ${
                issue.kind === 'DEEP DIVE'
                  ? 'border-lime/40 text-lime'
                  : 'border-line-strong text-lime-soft'
              }`}
            >
              {issue.kind}
            </span>
            <span className="text-lime-soft">ISSUE {issue.no}</span>
            <span className="text-line-strong">·</span>
            <span className="text-fg-subtle">{issue.heroDate}</span>
            <span className="text-line-strong">·</span>
            <span className="text-fg-subtle">{issue.read} READ</span>
          </div>
          <h1 className="font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[56px]">
            {issue.title}
          </h1>
          {issue.dek ? (
            <p className="mt-7 font-serif text-xl italic leading-snug text-cream-dim sm:text-[26px]">
              {issue.dek}
            </p>
          ) : null}
          {issue.lede ? (
            <div className="editorial mt-7" dangerouslySetInnerHTML={{ __html: issue.lede }} />
          ) : null}
        </div>
      </header>

      {navChapters.length > 0 ? <ChapterNav chapters={navChapters} /> : null}

      <main className="mx-auto max-w-read px-5 sm:px-8">
        {issue.chapters.map((ch, idx) => {
          const last = idx === issue.chapters.length - 1
          return (
            <section
              key={ch.id}
              id={ch.id}
              className={`scroll-mt-32 py-14 ${last ? '' : 'border-b border-line'}`}
            >
              <Kicker
                n={`CHAPTER ${String(idx + 1).padStart(2, '0')}`}
                label={ch.kicker}
              />
              <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight text-fg sm:text-4xl">
                {ch.heading}
              </h2>
              {ch.sub && (
                <p className="mt-3 max-w-md text-[14px] text-fg-muted">{ch.sub}</p>
              )}
              <div className="mt-8 flex flex-col gap-8">
                {ch.blocks.map((b, i) => (
                  <BlockRenderer key={i} block={b} />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      {/* END CTA */}
      <section className="border-y border-line bg-bg-raised">
        <div className="mx-auto flex max-w-read flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h3 className="font-serif text-2xl font-medium tracking-tight text-fg">
              That&apos;s issue {issue.no}.
            </h3>
            <p className="mt-1.5 text-[14px] text-fg-muted">
              Get the next one Monday, 7:30am IST. Free, forever.
            </p>
          </div>
          <Link
            href="/#subscribe"
            className="group inline-flex shrink-0 items-center gap-2 bg-lime px-6 py-3.5 font-mono text-[13px] font-semibold tracking-[0.04em] text-bg"
          >
            SUBSCRIBE FREE
            <ArrowRight
              size={15}
              strokeWidth={2.25}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>
    </>
  )
}
