import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import ShkPicker from './ShkPicker'
import type { IssuePayload } from '../../../../db/types/database'

export const dynamic = 'force-dynamic'

function deriveHeadline(p: IssuePayload): string {
  if (p.headline) return p.headline
  const firstClause = (p.throughline ?? '').split(/[—,]/)[0].trim()
  const words = firstClause.split(/\s+/)
  return words.length <= 9 ? firstClause : words.slice(0, 8).join(' ') + '…'
}

const BEAT_LABEL: Record<string, string> = {
  'frontier-api': 'Frontier APIs',
  'india-infra': 'India Infra',
  regulation: 'Regulation',
  'indic-models': 'Indic Models',
  'talent-comp': 'Talent & Comp',
  'enterprise-deals': 'Enterprise Deals',
}

const BEAT_ORDER = [
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals',
] as const

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  const supabase = createAdminSupabaseClient()

  const { data: issue } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single()
  if (!issue) notFound()

  const payload: IssuePayload | null = issue.payload
  const isAlreadyDrafted = issue.status === 'drafted'
  const isFailed = issue.status === 'failed'
  const isNoSignal = issue.status === 'no_signal'
  const isAwaitingHuman = issue.status === 'awaiting_human'

  return (
    <>
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-6">
          <a href="/" className="font-display text-[15px] font-semibold tracking-tight text-paper">
            AI SIGNAL <span className="font-mono text-[12px] text-paper/60">· REVIEW</span>
          </a>
          <a
            href={`/issue/${issueId}`}
            className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80 hover:text-paper"
          >
            Reader view →
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-reader px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 border-b border-line pb-6">
          <p className="meta">
            ISSUE {issue.id.slice(0, 8)} · STATUS {issue.status.toUpperCase()}
            {issue.set_aside_count != null ? <> · SET-ASIDE {issue.set_aside_count}</> : null}
          </p>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-ink sm:text-[36px]">
            Pick this week&rsquo;s Ship / Hold / Kill.
          </h1>
          {payload ? (
            <p className="mt-3 font-body text-[16px] italic text-muted">
              {deriveHeadline(payload)}
            </p>
          ) : null}
        </div>

      {isAlreadyDrafted ? (
        <DraftedBanner markdownPath={issue.markdown_path} issueId={issueId} />
      ) : null}

      {isFailed ? (
        <div className="mb-8 rounded border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-ink">
          Draft failed: {issue.failure_reason ?? 'unknown error'}
        </div>
      ) : null}

      {isNoSignal ? (
        <div className="mb-8 rounded border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
          <strong>No signal this week.</strong> {issue.failure_reason ?? ''}
        </div>
      ) : null}

      {!payload ? (
        <div className="mt-6 text-sm text-muted">
          No payload yet. Run Stage 3 (synthesize) for this issue first.
        </div>
      ) : (
        <>
          {/* Auto-generated content — read-only preview */}
          <section className="mb-12">
            <p className="eyebrow">The throughline · auto</p>
            <h2 className="mt-3 font-display text-[26px] font-semibold leading-snug text-ink sm:text-[30px]">
              {payload.throughline}
            </h2>
            {payload.throughline_lead ? (
              <p className="mt-5 text-[17px] leading-relaxed text-ink">
                {payload.throughline_lead}
              </p>
            ) : null}
          </section>

          {payload.six_layer_diff && payload.six_layer_diff.length > 0 ? (
            <section className="mb-12">
              <p className="eyebrow mb-5">The 6-layer diff · auto</p>
              <div className="space-y-7">
                {[...payload.six_layer_diff]
                  .sort(
                    (a, b) =>
                      (BEAT_ORDER as readonly string[]).indexOf(a.beat) -
                      (BEAT_ORDER as readonly string[]).indexOf(b.beat)
                  )
                  .map((d, i) => (
                    <div key={i}>
                      <p className="meta">
                        <span className="text-accent">
                          {String(i + 1).padStart(2, '0')}
                        </span>{' '}
                        · {BEAT_LABEL[d.beat] ?? d.beat}
                      </p>
                      <p className="mt-2 text-[17px] leading-relaxed text-ink">
                        {d.bullet}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          {payload.persona ? (
            <section className="mb-12 rounded border border-line bg-paper/60 p-6">
              <p className="eyebrow">What this means for you · auto</p>
              <p className="mt-2 text-sm italic text-muted">
                {payload.persona.archetype}
              </p>
              <p className="mt-5 whitespace-pre-line text-[17px] leading-relaxed text-ink">
                {payload.persona.translation}
              </p>
              {payload.persona.inr_math ? (
                <div className="mt-6 border-t border-line pt-4">
                  <p className="eyebrow">The math</p>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-ink">
                    {payload.persona.inr_math}
                  </pre>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* The human gate */}
          {isAwaitingHuman || isAlreadyDrafted ? (
            <ShkPicker
              issueId={issueId}
              alreadyDrafted={isAlreadyDrafted}
              candidates={payload.shk_candidates}
              previousChoices={issue.chosen_calls}
              keepSkip={payload.keep_skip}
              setAsideObservation={payload.set_aside_observation}
            />
          ) : null}
        </>
      )}
      </main>
    </>
  )
}

function DraftedBanner({
  markdownPath,
  issueId,
}: {
  markdownPath: string | null
  issueId: string
}) {
  return (
    <div className="mb-8 rounded border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
      <strong>This issue has been drafted.</strong> Markdown saved to{' '}
      <code className="font-mono text-[11px]">{markdownPath ?? '(unknown)'}</code>.{' '}
      <a
        href={`/issue/${issueId}`}
        className="underline decoration-accent decoration-2 underline-offset-2"
      >
        View the reader page →
      </a>
    </div>
  )
}
