'use client'

// Lenny-style inline subscribe panel — rendered mid-article on /issue/[id]
// between the appendix and the closure. Reuses /api/subscribe so behavior
// stays in sync with the homepage form.
//
// Visual lock (June 2026): joined input+button pill, no caret prefix, no
// mono cap labels. Reads as one tap-target on mobile, two visually-joined
// elements on desktop. Soft lime CTA inside the same border.

import { useId, useState } from 'react'
import { ArrowRight } from 'lucide-react'

export default function InlineSubscribe() {
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
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`)
      else setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-read px-5 py-16 sm:px-8 sm:py-20">
        <div className="rounded-2xl border border-line bg-bg-raised p-7 sm:p-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-lime-soft">
            Keep reading
          </p>
          <h3 className="mt-3 font-serif text-[26px] font-semibold leading-[1.15] tracking-[-0.01em] text-fg sm:text-[34px]">
            Get the Monday brief, free forever.
          </h3>
          <p className="mt-3 max-w-[520px] text-[16px] leading-[1.6] text-fg-muted">
            One AI shift, who it&apos;s for, what to ship — in your inbox
            every Monday at 7:30 AM IST. No roundup. No upsell.
          </p>

          {done ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-7 flex flex-col gap-1 rounded-xl border border-lime/40 bg-card px-5 py-4"
            >
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-lime-soft">
                On the list
              </p>
              <p className="text-[15px] leading-relaxed text-fg-muted">
                Your first brief lands Monday 7:30 AM IST. Check Promotions or
                Spam if you don&apos;t see it.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-7 flex max-w-[520px] flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0"
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
                {submitting ? 'Joining…' : 'Subscribe'}
                <ArrowRight
                  size={16}
                  strokeWidth={2.25}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </form>
          )}

          {error ? (
            <p
              role="alert"
              aria-live="polite"
              className="mt-3 max-w-[520px] rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[14px] text-fg"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
