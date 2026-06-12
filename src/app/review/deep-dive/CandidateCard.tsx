'use client'

import { useState, useTransition } from 'react'
import { chooseCandidate, rejectCandidate } from './actions'
import type { DeepDiveAudience } from '../../../../db/types/database'

interface Props {
  id: string
  audience: DeepDiveAudience
  score: number | null
  assumption: string
  hook: string
  evidenceUrls: string[]
  discoveredAt: string
}

const AUDIENCE_STYLES: Record<
  DeepDiveAudience,
  { label: string; cls: string }
> = {
  builder: { label: 'Builder primary', cls: 'border-l-accent text-accent' },
  pm: { label: 'PM primary', cls: 'border-l-accent-2 text-accent-2' },
  founder: { label: 'Founder primary', cls: 'border-l-accent text-accent' },
  'cross-cutting': {
    label: 'Cross-cutting',
    cls: 'border-l-muted text-muted',
  },
}

export default function CandidateCard(props: Props) {
  const [pending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const a = AUDIENCE_STYLES[props.audience] ?? AUDIENCE_STYLES['cross-cutting']

  function onChoose() {
    if (!confirm('Pick this assumption as the next deep-dive topic? This will create the issue and queue research.')) return
    startTransition(async () => {
      await chooseCandidate(props.id)
    })
  }

  function onReject() {
    startTransition(async () => {
      await rejectCandidate(props.id, rejectReason)
      setShowReject(false)
      setRejectReason('')
    })
  }

  const dateStr = new Date(props.discoveredAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <article
      className={`rounded-md border-l-4 ${a.cls.split(' ')[0]} bg-paper-elev px-6 py-7 sm:px-8 sm:py-8`}
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span
          className={`font-mono text-[11px] font-semibold uppercase tracking-[0.16em] ${a.cls.split(' ')[1] ?? 'text-muted'}`}
        >
          {a.label}
        </span>
        {typeof props.score === 'number' ? (
          <span className="font-mono text-[11px] text-muted">
            {props.score}/10
          </span>
        ) : null}
        <span className="font-mono text-[11px] text-muted">{dateStr}</span>
      </div>

      <p className="mt-3 font-display text-[20px] font-semibold leading-snug text-ink sm:text-[22px]">
        {props.assumption}
      </p>

      <p className="mt-4 font-serif text-[16px] leading-[1.65] text-body sm:text-[17px] sm:leading-[1.7]">
        {props.hook}
      </p>

      {props.evidenceUrls.length ? (
        <details className="mt-5">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-accent hover:text-ink">
            {props.evidenceUrls.length} anchor URL{props.evidenceUrls.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-3 space-y-1">
            {props.evidenceUrls.map((u, i) => (
              <li
                key={i}
                className="font-mono text-[12px] leading-relaxed text-muted"
              >
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-muted/40 underline-offset-2 hover:text-accent hover:decoration-accent"
                >
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onChoose}
          disabled={pending}
          className="inline-flex items-center rounded bg-ink px-5 py-2.5 font-display text-[13px] font-semibold text-paper transition hover:bg-accent disabled:opacity-50"
        >
          {pending ? 'Picking…' : 'Pick this'}
        </button>
        {showReject ? (
          <>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why reject (optional)"
              className="flex-1 rounded border border-line bg-paper px-3 py-2 font-body text-[13px] text-ink outline-none placeholder:text-muted focus-visible:border-accent"
            />
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="inline-flex items-center rounded border border-accent-2 px-4 py-2.5 font-display text-[13px] font-semibold text-accent-2 transition hover:bg-accent-2 hover:text-paper disabled:opacity-50"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-accent-2 disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>
    </article>
  )
}
