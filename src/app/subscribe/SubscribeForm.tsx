'use client'

import { useId, useState } from 'react'

export default function SubscribeForm() {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
      } else {
        setDone(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded border border-line bg-accent-soft p-5"
      >
        <p className="font-heading text-[17px] font-semibold text-ink">
          You’re on the list.
        </p>
        <p className="mt-2 font-body text-[15px] leading-relaxed text-ink/85">
          Issue #001 lands Monday at 7:30 AM IST. If you don’t see it, check
          Promotions or Spam.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        required
        placeholder="you@yourstartup.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded border border-line bg-paper px-4 py-3 font-body text-[16px] text-ink outline-none placeholder:text-muted focus-visible:border-accent"
      />
      <button
        type="submit"
        disabled={submitting}
        className={`rounded px-5 py-3 font-heading text-[15px] font-semibold transition ${
          submitting
            ? 'cursor-not-allowed border border-line text-muted'
            : 'bg-ink text-paper hover:bg-accent'
        }`}
      >
        {submitting ? 'Subscribing…' : 'Subscribe'}
      </button>

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="sm:col-span-2 rounded border border-clay/40 bg-clay/10 px-3 py-2 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
