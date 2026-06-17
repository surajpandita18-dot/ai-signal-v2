'use client'

import { useId, useState } from 'react'
import { ArrowRight } from 'lucide-react'

// Figr-style subscribe form: caret prefix + email input + lime CTA.
// Mirrors /subscribe submission to /api/subscribe.
export default function HomeSubscribeForm() {
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
        className="flex flex-col gap-1 rounded-xl border border-lime/40 bg-card px-5 py-4"
      >
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-lime-soft">
          On the list
        </div>
        <p className="text-[15px] leading-relaxed text-fg-muted">
          Your first brief lands Monday 7:30 AM IST. If you don&rsquo;t see
          it, check Promotions or Spam.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0"
    >
      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <div className="flex flex-1 items-center rounded-xl border border-line-strong bg-card focus-within:border-lime sm:rounded-r-none sm:border-r-0">
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          placeholder="you@startup.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent px-5 py-4 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-lime-bright px-6 py-4 text-[15px] font-semibold text-fg transition-colors hover:bg-[#d4ff52] disabled:opacity-60 sm:rounded-l-none"
      >
        {submitting ? 'Joining…' : 'Get the brief'}
        <ArrowRight
          size={16}
          strokeWidth={2.25}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </button>

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[14px] text-fg sm:col-span-2"
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
