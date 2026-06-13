'use client'

import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
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

const AUDIENCE_LABEL: Record<DeepDiveAudience, string> = {
  builder: 'BUILDER PRIMARY',
  pm: 'PM PRIMARY',
  founder: 'FOUNDER PRIMARY',
  'cross-cutting': 'CROSS-CUTTING',
}

export default function CandidateCard(props: Props) {
  const [pending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  function onChoose() {
    if (
      !confirm(
        'Pick this assumption as the next deep-dive topic? Creates the issue and queues research.'
      )
    )
      return
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
    <article className="border-l-2 border-lime bg-card px-6 py-7 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-[11px] font-semibold tracking-label text-lime-soft">
          {AUDIENCE_LABEL[props.audience]}
        </span>
        {typeof props.score === 'number' ? (
          <span className="font-mono text-[11px] text-fg-subtle">
            {props.score}/10
          </span>
        ) : null}
        <span className="font-mono text-[11px] text-fg-subtle">{dateStr}</span>
      </div>

      <p className="mt-3 font-serif text-[20px] font-semibold leading-snug text-fg sm:text-[22px]">
        {props.assumption}
      </p>

      <p className="mt-4 text-[14.5px] leading-[1.7] text-cream-dim sm:text-[15px]">
        {props.hook}
      </p>

      {props.evidenceUrls.length ? (
        <details className="mt-5">
          <summary className="cursor-pointer font-mono text-[11px] tracking-label text-lime hover:text-fg">
            {props.evidenceUrls.length} ANCHOR URL{props.evidenceUrls.length === 1 ? '' : 'S'}
          </summary>
          <ul className="mt-3 space-y-1.5">
            {props.evidenceUrls.map((u, i) => (
              <li key={i} className="font-mono text-[12px] leading-relaxed text-fg-muted">
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-fg-subtle underline-offset-2 hover:text-lime hover:decoration-lime"
                >
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onChoose}
          disabled={pending}
          className="group inline-flex items-center gap-2 bg-lime px-5 py-3 font-mono text-[12px] font-semibold tracking-[0.04em] text-bg transition-colors hover:bg-[#d4ff52] disabled:opacity-50"
        >
          {pending ? 'PICKING…' : 'PICK THIS'}
          <ArrowRight size={14} strokeWidth={2.25} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        {showReject ? (
          <>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why reject (optional)"
              className="flex-1 border border-line-strong bg-bg px-3 py-2.5 font-mono text-[12px] text-fg outline-none placeholder:text-fg-subtle focus:border-lime"
            />
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="inline-flex items-center border border-danger px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.04em] text-danger transition-colors hover:bg-danger hover:text-bg disabled:opacity-50"
            >
              CONFIRM
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="font-mono text-[11px] tracking-label text-fg-subtle hover:text-fg"
            >
              CANCEL
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowReject(true)}
            disabled={pending}
            className="font-mono text-[11px] tracking-label text-fg-subtle hover:text-danger disabled:opacity-50"
          >
            REJECT
          </button>
        )}
      </div>
    </article>
  )
}
