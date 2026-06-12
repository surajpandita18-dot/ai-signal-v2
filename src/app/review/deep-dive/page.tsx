// Review surface for deep-dive topic candidates. Discovery agent writes
// 5 candidates fortnightly to deep_dive_candidates. Owner picks ONE here
// to kick off research + draft + QA. The pick is the human gate per
// CLAUDE.md rule #1 (preserved for the deep-dive track).

import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { DeepDiveAudience } from '../../../../db/types/database'
import CandidateCard from './CandidateCard'

export const dynamic = 'force-dynamic'

const AUDIENCE_ORDER: DeepDiveAudience[] = [
  'builder',
  'pm',
  'founder',
  'cross-cutting',
]

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
    <>
      <header className="bg-[#0e0c08] text-[#f4efe6]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-[#f4efe6]">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4efe6]/70">
              Deep-dive · admin
            </span>
            <ThemeToggle className="text-[#f4efe6]/80 hover:text-[#f4efe6]" />
          </div>
        </div>
      </header>

      <main id="main" className="bg-paper">
        <div className="mx-auto max-w-reader px-5 py-12 sm:px-6 sm:py-16">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Discovery queue
          </p>
          <h1 className="mt-3 font-display text-[32px] font-bold leading-[1.15] tracking-tight text-ink sm:text-[42px]">
            Pick the next deep-dive
          </h1>
          <p className="mt-4 max-w-[640px] font-serif text-[17px] leading-[1.65] text-body sm:text-[18px]">
            The discovery agent surfaces five assumptions builders, PMs, or
            founders hold that the evidence quietly contradicts. Pick ONE —
            that kicks off research, draft, and editorial QA. The audience mix
            below is the discipline that keeps the dive useful across all three
            archetypes.
          </p>

          {/* Audience mix snapshot */}
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {AUDIENCE_ORDER.map((a) => (
              <div
                key={a}
                className="rounded border border-line bg-paper-elev px-4 py-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {a === 'cross-cutting' ? 'Cross-cutting' : a + ' primary'}
                </p>
                <p className="mt-1 font-display text-[22px] font-bold text-ink">
                  {audienceCounts[a]}
                </p>
              </div>
            ))}
          </div>

          {/* Pending candidates */}
          <section className="mt-12">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                Pending ({pending?.length ?? 0})
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                sorted by score desc
              </p>
            </div>

            {pending && pending.length > 0 ? (
              <div className="space-y-5">
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
              <div className="rounded-md border border-line bg-paper-elev px-6 py-8 text-center">
                <p className="font-serif text-[16px] italic text-muted">
                  No candidates in the queue. Run the discovery agent:
                </p>
                <p className="mt-3 font-mono text-[12px] text-ink">
                  npx tsx src/scripts/smoke-deep-dive-discover.ts
                </p>
              </div>
            )}
          </section>

          {/* Recent chosen */}
          {chosen && chosen.length > 0 ? (
            <section className="mt-16">
              <h2 className="mb-6 font-display text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                Recently chosen
              </h2>
              <ul className="divide-y divide-line">
                {chosen.map((c) => (
                  <li key={c.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-serif text-[16px] text-ink">
                        {c.assumption_challenged}
                      </p>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        {c.primary_audience}
                      </span>
                    </div>
                    {c.chosen_issue_id ? (
                      <Link
                        href={`/issue/${c.chosen_issue_id}`}
                        className="mt-1 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-accent hover:text-ink"
                      >
                        Issue {c.chosen_issue_id.slice(0, 8)} →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </>
  )
}
