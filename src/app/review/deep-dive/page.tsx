// Deep-dive review surface — Figr palette v3.

import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import type { DeepDiveAudience } from '../../../../db/types/database'
import CandidateCard from './CandidateCard'

export const dynamic = 'force-dynamic'

const AUDIENCE_ORDER: DeepDiveAudience[] = [
  'builder',
  'pm',
  'founder',
  'cross-cutting',
]

const AUDIENCE_LABEL: Record<DeepDiveAudience, string> = {
  builder: 'BUILDER',
  pm: 'PM',
  founder: 'FOUNDER',
  'cross-cutting': 'CROSS',
}

export default async function DeepDiveReviewPage() {
  const supabase = createAdminSupabaseClient()

  const { data: pending } = await supabase
    .from('deep_dive_candidates')
    .select('*')
    .eq('chosen', false)
    .is('rejection_reason', null)
    .order('score', { ascending: false })
    .order('discovered_at', { ascending: false })

  const { data: chosen } = await supabase
    .from('deep_dive_candidates')
    .select('id, assumption_challenged, primary_audience, chosen_issue_id, discovered_at')
    .eq('chosen', true)
    .order('discovered_at', { ascending: false })
    .limit(10)

  const audienceCounts: Record<DeepDiveAudience, number> = {
    builder: 0,
    pm: 0,
    founder: 0,
    'cross-cutting': 0,
  }
  for (const c of pending ?? []) {
    audienceCounts[c.primary_audience as DeepDiveAudience]++
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav />

      <main className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
        <div className="font-mono text-[11px] tracking-label text-lime-soft">
          ADMIN · DISCOVERY QUEUE
        </div>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[52px]">
          Pick the next deep-dive
        </h1>
        <p className="mt-7 max-w-2xl text-[15px] leading-[1.65] text-fg-muted">
          The discovery agent surfaces five assumptions builders, PMs, or
          founders hold that the evidence quietly contradicts. Pick ONE — that
          kicks off research, draft, and editorial QA. The audience mix below
          is the discipline that keeps the dive useful across all three
          archetypes.
        </p>

        {/* Audience-mix counters */}
        <div className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {AUDIENCE_ORDER.map((a) => (
            <div key={a} className="flex flex-col bg-bg p-5">
              <span className="font-mono text-[10px] tracking-label text-fg-subtle">
                {AUDIENCE_LABEL[a]}
              </span>
              <span className="mt-2 font-serif text-3xl font-semibold text-lime">
                {audienceCounts[a]}
              </span>
            </div>
          ))}
        </div>

        {/* Pending */}
        <section className="mt-14">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              Pending ({pending?.length ?? 0})
            </h2>
            <p className="font-mono text-[11px] tracking-label text-fg-subtle">
              SORTED BY SCORE
            </p>
          </div>

          {pending && pending.length > 0 ? (
            <div className="flex flex-col gap-5">
              {pending.map((c) => (
                <CandidateCard
                  key={c.id}
                  id={c.id}
                  audience={c.primary_audience as DeepDiveAudience}
                  score={c.score}
                  assumption={c.assumption_challenged}
                  hook={c.one_paragraph_hook}
                  evidenceUrls={
                    Array.isArray(c.evidence_anchor_urls)
                      ? (c.evidence_anchor_urls as string[])
                      : []
                  }
                  discoveredAt={c.discovered_at}
                />
              ))}
            </div>
          ) : (
            <div className="border border-line-strong bg-bg-raised p-8 text-center">
              <p className="font-mono text-[12px] tracking-label text-fg-subtle">
                NO CANDIDATES IN QUEUE.
              </p>
              <p className="mt-3 font-mono text-[12px] text-fg-muted">
                npx tsx src/scripts/smoke-deep-dive-discover.ts
              </p>
            </div>
          )}
        </section>

        {/* Recent chosen */}
        {chosen && chosen.length > 0 ? (
          <section className="mt-16">
            <h2 className="mb-6 font-serif text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              Recently chosen
            </h2>
            <ul className="border-t border-line">
              {chosen.map((c) => (
                <li key={c.id} className="border-b border-line py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-serif text-[16px] text-fg">
                      {c.assumption_challenged}
                    </p>
                    <span className="font-mono text-[10px] tracking-label text-fg-subtle">
                      {AUDIENCE_LABEL[c.primary_audience as DeepDiveAudience]}
                    </span>
                  </div>
                  {c.chosen_issue_id ? (
                    <Link
                      href={`/issue/${c.chosen_issue_id}`}
                      className="mt-1 inline-block font-mono text-[11px] tracking-label text-lime hover:text-fg"
                    >
                      ISSUE {c.chosen_issue_id.slice(0, 8)} →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}
