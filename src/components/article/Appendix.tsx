// Appendix surfaces — Interview Drills + Further Reading — rendered at the
// foot of /issue/[id] (web only, not email; keeps email lean per
// learnings-suraj-preferences). Both sections render only when payload.appendix
// is present; safely no-ops on older issues.
//
// Design intent (from fresh-model audit, .claude/learnings-user-audit.md):
// - Interview drills are TOPIC-AWARE (≠ the old hardcoded list) — each
//   question is tagged with named Indian interview surfaces (Sarvam,
//   Anthropic India, Razorpay…) so a reader prepping for those rooms can use
//   the issue as study material. Skeleton answer is hidden behind <details>
//   so the page stays scannable and the reader can self-test.
// - Further Reading curates ONE link per type (3 articles + 1 video + 1
//   paper + 1 Indian-builder in production) — the India-builder slot is the
//   differentiator vs Stratechery/Lenny/Latent Space.

import type {
  AppendixPack,
  InterviewDrill,
  ResourceLink,
} from '../../../db/types/database'

const DRILL_LABEL: Record<InterviewDrill['kind'], string> = {
  'system-design': 'System Design',
  'product-strategy': 'Product / Strategy',
  'regulation-india': 'Regulation · India',
}

export default function Appendix({
  appendix,
  issueId,
}: {
  appendix: AppendixPack
  // When present, FurtherReading renders a small decorative banner above
  // the section using the deterministic /issue/[id]/hero-image-explained
  // route. Older preview surfaces without an issue id render the section
  // without the banner.
  issueId?: string
}) {
  return (
    <>
      <InterviewDrills drills={appendix.interview_drills} />
      <FurtherReading pack={appendix.further_reading} issueId={issueId} />
    </>
  )
}

function InterviewDrills({ drills }: { drills: InterviewDrill[] }) {
  if (!drills.length) return null
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
          Interview drills
        </p>
        <h2 className="mt-4 font-serif text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] text-fg sm:text-[36px]">
          Three questions this issue prepares you for.
        </h2>
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.65] text-fg-muted">
          Topic-aware — they fall out of this week&apos;s shift, not a
          template. Each one is tagged with rooms it gets asked in. Try
          your answer first, then expand the skeleton.
        </p>

        <div className="mt-12 flex flex-col gap-10">
          {drills.map((d, i) => (
            <article key={i} className="border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-serif text-[15px] font-semibold text-fg">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13px] font-medium text-fg-muted">
                  {DRILL_LABEL[d.kind]}
                </span>
              </div>
              <p className="mt-4 font-serif text-[20px] leading-[1.4] text-fg sm:text-[22px]">
                {d.question}
              </p>
              {d.asked_at.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
                  {d.asked_at.map((surface, j) => (
                    <span
                      key={j}
                      className="rounded-full border border-line px-3 py-1 text-[12px] font-medium text-fg-muted"
                    >
                      {surface}
                    </span>
                  ))}
                </div>
              )}
              <details className="group mt-6">
                <summary className="cursor-pointer text-[13px] font-medium text-fg-muted transition-colors hover:text-lime-soft list-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-block group-open:hidden">
                    Show what a strong answer touches →
                  </span>
                  <span className="hidden group-open:inline-block">
                    Hide
                  </span>
                </summary>
                <p className="mt-4 max-w-[640px] text-[16px] leading-[1.7] text-fg-muted">
                  {d.answer_skeleton}
                </p>
              </details>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FurtherReading({
  pack,
  issueId,
}: {
  pack: AppendixPack['further_reading']
  issueId?: string
}) {
  const hasAny =
    pack.articles.length > 0 ||
    pack.video ||
    pack.paper ||
    pack.indian_builder
  if (!hasAny) return null

  return (
    <section className="border-t border-line">
      {/* hero-image-explained inline banner removed 2026-06-18 — Stratechery
          discipline + Suraj's "kharab image" feedback. Route handler stays. */}
      <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
          Go deeper this week
        </p>
        <h2 className="mt-4 font-serif text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] text-fg sm:text-[36px]">
          Further reading.
        </h2>

        {/* Articles — 3 max, one per major beat */}
        {pack.articles.length > 0 && (
          <div className="mt-10">
            <p className="text-[13px] font-semibold text-fg-muted">
              Articles
            </p>
            <ul className="mt-5 flex flex-col gap-6">
              {pack.articles.map((r, i) => (
                <ResourceRow key={i} r={r} />
              ))}
            </ul>
          </div>
        )}

        {/* Video / podcast — single slot */}
        {pack.video && (
          <div className="mt-10 border-t border-line pt-8">
            <p className="text-[13px] font-semibold text-fg-muted">
              Watch / listen
            </p>
            <ul className="mt-5">
              <ResourceRow r={pack.video} />
            </ul>
          </div>
        )}

        {/* Paper — single slot */}
        {pack.paper && (
          <div className="mt-10 border-t border-line pt-8">
            <p className="text-[13px] font-semibold text-fg-muted">
              Paper
            </p>
            <ul className="mt-5">
              <ResourceRow r={pack.paper} />
            </ul>
          </div>
        )}

        {/* Indian builder in production — the differentiator slot */}
        {pack.indian_builder && (
          <div className="mt-10 border-t border-line pt-8">
            <p className="text-[13px] font-semibold text-lime-soft">
              Shipped from India · in production
            </p>
            <ul className="mt-5">
              <ResourceRow r={pack.indian_builder} accent />
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function ResourceRow({ r, accent }: { r: ResourceLink; accent?: boolean }) {
  return (
    <li className="grid gap-1">
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-serif text-[19px] font-medium leading-[1.3] transition-colors ${
          accent ? 'text-fg hover:text-lime-soft' : 'text-fg hover:text-lime-soft'
        }`}
      >
        {r.title}
        <span className="ml-1.5 align-[2px] text-[13px] text-fg-muted">
          ↗
        </span>
      </a>
      <p className="text-[13px] font-medium text-fg-muted">
        {r.source}
      </p>
      <p className="mt-1 max-w-[560px] text-[15px] leading-[1.6] text-fg-muted">
        {r.why}
      </p>
    </li>
  )
}
