'use client'

import { useId, useState } from 'react'
import type {
  ChosenCalls,
  IssuePayload,
  ShkCall,
} from '../../../../db/types/database'

type Kind = 'ship' | 'hold' | 'kill'
const KINDS: Kind[] = ['ship', 'hold', 'kill']
const KIND_LABEL: Record<Kind, string> = {
  ship: 'SHIP',
  hold: 'HOLD',
  kill: 'KILL',
}
const KIND_HELP: Record<Kind, string> = {
  ship: 'One thing to add / migrate / launch this week.',
  hold: 'One thing to NOT decide yet — and why.',
  kill: 'One thing to deprecate / cancel from your stack.',
}

interface SelectionState {
  ship: { pickedIndex: number | null; custom: string; customRationale: string }
  hold: { pickedIndex: number | null; custom: string; customRationale: string }
  kill: { pickedIndex: number | null; custom: string; customRationale: string }
}

interface ShkPickerProps {
  issueId: string
  candidates: IssuePayload['shk_candidates']
  previousChoices: ChosenCalls | null
  keepSkip: IssuePayload['keep_skip']
  setAsideObservation: string | null
  alreadyDrafted: boolean
}

function deriveInitialState(
  candidates: IssuePayload['shk_candidates'],
  previous: ChosenCalls | null
): SelectionState {
  const init = (kind: Kind) => {
    const prev = previous?.[kind]
    if (!prev) return { pickedIndex: null, custom: '', customRationale: '' }
    const idx = candidates[kind]?.findIndex((c) => c.label === prev.label) ?? -1
    if (idx >= 0) return { pickedIndex: idx, custom: '', customRationale: '' }
    return { pickedIndex: null, custom: prev.label, customRationale: prev.rationale }
  }
  return { ship: init('ship'), hold: init('hold'), kill: init('kill') }
}

function resolveSelection(
  state: SelectionState[Kind],
  cands: ShkCall[]
): { label: string; rationale: string } | null {
  if (state.pickedIndex !== null && cands[state.pickedIndex]) {
    const c = cands[state.pickedIndex]
    return { label: c.label, rationale: c.rationale }
  }
  if (state.custom.trim()) {
    return {
      label: state.custom.trim(),
      rationale: state.customRationale.trim(),
    }
  }
  return null
}

export default function ShkPicker({
  issueId,
  candidates,
  previousChoices,
  keepSkip,
  setAsideObservation,
  alreadyDrafted,
}: ShkPickerProps) {
  const [state, setState] = useState<SelectionState>(
    deriveInitialState(candidates, previousChoices)
  )
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<
    | { ok: true; markdownPath: string; issueNumber: number; wordCount: number }
    | null
  >(null)
  const [error, setError] = useState<string | null>(null)

  const picks: ChosenCalls = {
    ship: resolveSelection(state.ship, candidates.ship ?? []),
    hold: resolveSelection(state.hold, candidates.hold ?? []),
    kill: resolveSelection(state.kill, candidates.kill ?? []),
  }
  const someChosen = Boolean(picks.ship || picks.hold || picks.kill)

  function updateKind(kind: Kind, patch: Partial<SelectionState[Kind]>) {
    setState((s) => ({ ...s, [kind]: { ...s[kind], ...patch } }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/choose-throughline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueId, picks }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`)
      else setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded border border-line bg-accent-soft p-6"
      >
        <h2 className="font-heading text-xl font-semibold text-ink">Drafted.</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          Issue #{String(result.issueNumber).padStart(3, '0')} saved as{' '}
          <code className="font-mono text-[12px]">{result.markdownPath}</code>{' '}
          ({result.wordCount} words).
        </p>
        <p className="mt-3 text-sm">
          <a
            href={`/issue/${issueId}`}
            className="text-accent underline decoration-2 underline-offset-2"
          >
            View the reader page →
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <p className="eyebrow">Pick one per kind · human gate</p>

      {KINDS.map((kind) => {
        const cands = candidates[kind] ?? []
        const st = state[kind]
        return (
          <section
            key={kind}
            className="rounded border border-line bg-paper/40 p-6"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-heading text-[15px] font-semibold tracking-[0.12em] text-ink">
                {KIND_LABEL[kind]}
              </h3>
              <p className="text-xs italic text-muted">{KIND_HELP[kind]}</p>
            </div>

            {cands.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No candidates from synthesizer.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {cands.map((c, i) => {
                  const checked = st.pickedIndex === i
                  return (
                    <li key={i}>
                      <label
                        className={`block cursor-pointer rounded border p-4 transition ${
                          checked
                            ? 'border-accent bg-accent-soft'
                            : 'border-line hover:border-ink'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name={`pick-${kind}`}
                            className="mt-1.5 accent-accent"
                            checked={checked}
                            onChange={() =>
                              updateKind(kind, {
                                pickedIndex: i,
                                custom: '',
                                customRationale: '',
                              })
                            }
                          />
                          <div>
                            <p className="font-heading font-medium text-ink">
                              {c.label}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-ink/85">
                              {c.rationale}
                            </p>
                          </div>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <CustomCallInput
                kind={kind}
                label={st.custom}
                rationale={st.customRationale}
                onLabelChange={(v) =>
                  updateKind(kind, {
                    custom: v,
                    pickedIndex: v.trim() ? null : st.pickedIndex,
                  })
                }
                onRationaleChange={(v) =>
                  updateKind(kind, { customRationale: v })
                }
              />
            </div>
          </section>
        )
      })}

      {keepSkip && (keepSkip.keep?.length || keepSkip.skip?.length) ? (
        <section className="rounded border border-dashed border-line p-6">
          <p className="eyebrow">Keep / Skip preview · auto</p>
          {keepSkip.keep?.length ? (
            <>
              <p className="mt-3 font-heading text-sm font-medium text-ink">Keep</p>
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-ink/90">
                {keepSkip.keep.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </>
          ) : null}
          {keepSkip.skip?.length ? (
            <>
              <p className="mt-4 font-heading text-sm font-medium text-ink">Skip</p>
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-ink/90">
                {keepSkip.skip.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {setAsideObservation ? (
        <p className="text-sm italic text-muted">
          Set-aside observation: {setAsideObservation}
        </p>
      ) : null}

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded border border-line bg-paper px-5 py-4 shadow-sm">
        <div className="text-xs text-muted">
          {someChosen
            ? `Picked: ${[picks.ship, picks.hold, picks.kill].filter(Boolean).length}/3`
            : 'Pick or write at least one of Ship/Hold/Kill.'}
          {alreadyDrafted ? ' · Re-drafting overwrites markdown.' : null}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !someChosen}
          className={`rounded px-5 py-2 text-sm font-medium transition ${
            !submitting && someChosen
              ? 'bg-ink text-paper hover:bg-accent'
              : 'cursor-not-allowed border border-line text-muted'
          }`}
        >
          {submitting ? 'Drafting…' : 'Draft this issue'}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-ink"
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}

function CustomCallInput({
  kind,
  label,
  rationale,
  onLabelChange,
  onRationaleChange,
}: {
  kind: 'ship' | 'hold' | 'kill'
  label: string
  rationale: string
  onLabelChange: (v: string) => void
  onRationaleChange: (v: string) => void
}) {
  const labelId = useId()
  const rationaleId = useId()
  return (
    <>
      <p className="text-xs text-muted" id={`${labelId}-help`}>
        Or write your own:
      </p>
      <label htmlFor={labelId} className="sr-only">
        Your {kind.toUpperCase()} call (one line)
      </label>
      <input
        id={labelId}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={`Your ${kind.toUpperCase()} call (one line)…`}
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        aria-describedby={`${labelId}-help`}
        className="mt-2 w-full rounded border border-line bg-paper p-2 text-sm text-ink outline-none focus-visible:border-accent"
      />
      {label.trim() ? (
        <>
          <label htmlFor={rationaleId} className="sr-only">
            Rationale for your {kind.toUpperCase()} call
          </label>
          <textarea
            id={rationaleId}
            placeholder="Rationale (1–3 sentences)…"
            autoComplete="off"
            value={rationale}
            onChange={(e) => onRationaleChange(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded border border-line bg-paper p-2 text-sm text-ink outline-none focus-visible:border-accent"
          />
        </>
      ) : null}
    </>
  )
}
