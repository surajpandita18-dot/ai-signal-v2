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
        className="flex flex-col gap-2 border border-lime/40 bg-card px-5 py-4"
      >
        <div className="font-mono text-[11px] tracking-label text-lime">
          ON THE LIST ✓
        </div>
        <p className="text-[15px] leading-relaxed text-fg-muted">
          Your first brief lands Monday 7:30 AM IST. If you don&rsquo;t see
          it, check Promotions or Spam.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row">
      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <div className="flex flex-1 items-center border border-line-strong bg-card focus-within:border-lime">
        <span className="caret pl-4 font-mono text-lime">_</span>
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
          className="w-full bg-transparent px-2.5 py-4 text-[16px] text-fg placeholder:text-fg-muted focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="group mt-px flex items-center justify-center gap-2 bg-lime-bright px-6 py-4 font-mono text-[13px] font-semibold tracking-[0.04em] text-fg transition-colors hover:bg-[#d4ff52] disabled:opacity-60"
      >
        {submitting ? 'JOINING…' : "GET MONDAY'S BRIEF"}
        <ArrowRight
          size={15}
          strokeWidth={2.25}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </button>

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="mt-2 border border-danger/40 bg-danger/10 px-3 py-2 text-[14px] text-fg sm:col-span-2"
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
