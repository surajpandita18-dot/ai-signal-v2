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

export default function Appendix({ appendix }: { appendix: AppendixPack }) {
  return (
    <>
      <InterviewDrills drills={appendix.interview_drills} />
      <FurtherReading pack={appendix.further_reading} />
    </>
  )
}

function InterviewDrills({ drills }: { drills: InterviewDrill[] }) {
  if (!drills.length) return null
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
        <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
          INTERVIEW DRILLS · GENERATED FROM THIS WEEK
        </p>
        <h2 className="mt-4 font-serif text-[30px] font-medium leading-[1.12] tracking-tight text-fg sm:text-[36px]">
          Three questions this issue prepares you for.
        </h2>
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.65] text-cream-dim">
          Topic-aware — they fall out of this week&apos;s shift, not a
          template. Each one is tagged with rooms it gets asked in. Try
          your answer first, then expand the skeleton.
        </p>

        <div className="mt-12 flex flex-col gap-10">
          {drills.map((d, i) => (
            <article key={i} className="border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-serif text-[15px] italic text-lime">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
                  {DRILL_LABEL[d.kind]}
                </span>
              </div>
              <p className="mt-4 font-serif text-[20px] leading-[1.4] text-fg sm:text-[22px]">
                {d.question}
              </p>
              {d.asked_at.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2">
                  {d.asked_at.map((surface, j) => (
                    <span
                      key={j}
                      className="border border-line-strong px-3 py-1  text-[10px] font-medium tracking-[0.08em] text-fg-muted"
                    >
                      {surface}
                    </span>
                  ))}
                </div>
              )}
              <details className="group mt-6">
                <summary className="cursor-pointer  text-[12px] font-medium tracking-[0.08em] text-fg-muted transition-colors hover:text-lime list-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-block group-open:hidden">
                    ▸ SHOW WHAT A STRONG ANSWER TOUCHES
                  </span>
                  <span className="hidden group-open:inline-block">
                    ▾ HIDE
                  </span>
                </summary>
                <p className="mt-4 max-w-[640px] text-[16px] leading-[1.7] text-cream-dim">
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

function FurtherReading({ pack }: { pack: AppendixPack['further_reading'] }) {
  const hasAny =
    pack.articles.length > 0 ||
    pack.video ||
    pack.paper ||
    pack.indian_builder
  if (!hasAny) return null

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
        <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
          IF YOU WANT TO GO DEEPER THIS WEEK
        </p>
        <h2 className="mt-4 font-serif text-[30px] font-medium leading-[1.12] tracking-tight text-fg sm:text-[36px]">
          Further reading.
        </h2>

        {/* Articles — 3 max, one per major beat */}
        {pack.articles.length > 0 && (
          <div className="mt-10">
            <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
              ARTICLES
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
            <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
              WATCH · LISTEN
            </p>
            <ul className="mt-5">
              <ResourceRow r={pack.video} />
            </ul>
          </div>
        )}

        {/* Paper — single slot */}
        {pack.paper && (
          <div className="mt-10 border-t border-line pt-8">
            <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
              PAPER
            </p>
            <ul className="mt-5">
              <ResourceRow r={pack.paper} />
            </ul>
          </div>
        )}

        {/* Indian builder in production — the differentiator slot */}
        {pack.indian_builder && (
          <div className="mt-10 border-t border-line pt-8">
            <p className=" text-[11px] font-medium tracking-[0.08em] text-lime">
              SHIPPED FROM INDIA · IN PRODUCTION
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
        className={`font-serif text-[19px] leading-[1.3] transition-colors ${
          accent ? 'text-fg hover:text-lime' : 'text-fg hover:text-lime'
        }`}
      >
        {r.title}
        <span className="ml-2 align-[2px]  text-[11px] font-medium tracking-[0.08em] text-fg-muted">
          ↗
        </span>
      </a>
      <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-muted">
        {r.source.toUpperCase()}
      </p>
      <p className="mt-1 max-w-[560px] text-[15px] leading-[1.6] text-cream-dim">
        {r.why}
      </p>
    </li>
  )
}
