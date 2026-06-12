'use client'

// INR count-up — when a math row scrolls into view, animate each numeric token
// from 0 → final, 600ms easeOut, fires ONCE. Preserves the surrounding string
// (currency, suffixes, separators) and decimal precision.

import { useEffect, useRef, useState } from 'react'

const NUM_RE = /(\d+(?:\.\d+)?)/g

type Token =
  | { kind: 'static'; text: string }
  | { kind: 'num'; final: number; precision: number }

function tokenize(value: string): Token[] {
  const tokens: Token[] = []
  let lastIndex = 0
  for (const match of value.matchAll(NUM_RE)) {
    const idx = match.index ?? 0
    if (idx > lastIndex) {
      tokens.push({ kind: 'static', text: value.slice(lastIndex, idx) })
    }
    const raw = match[1]
    const dot = raw.indexOf('.')
    const precision = dot >= 0 ? raw.length - dot - 1 : 0
    tokens.push({ kind: 'num', final: parseFloat(raw), precision })
    lastIndex = idx + raw.length
  }
  if (lastIndex < value.length) {
    tokens.push({ kind: 'static', text: value.slice(lastIndex) })
  }
  return tokens
}

function formatToken(t: Extract<Token, { kind: 'num' }>, progress: number): string {
  const current = t.final * progress
  if (t.precision === 0) return String(Math.round(current))
  return current.toFixed(t.precision)
}

function renderTokens(tokens: Token[], progress: number): string {
  let out = ''
  for (const t of tokens) {
    if (t.kind === 'static') out += t.text
    else out += formatToken(t, progress)
  }
  return out
}

export function AnimatedValue({
  value,
  durationMs = 600,
}: {
  value: string
  durationMs?: number
}) {
  const [mounted, setMounted] = useState(false)
  const [display, setDisplay] = useState(value)
  const ref = useRef<HTMLSpanElement | null>(null)
  const hasAnimated = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const node = ref.current
    if (!node) return

    const tokens = tokenize(value)
    const hasNumeric = tokens.some((t) => t.kind === 'num')
    if (!hasNumeric) {
      setDisplay(value)
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setDisplay(value)
      hasAnimated.current = true
      return
    }

    // Start the animation at progress 0 (so we don't briefly flash the final value
    // before IntersectionObserver fires).
    setDisplay(renderTokens(tokens, 0))

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true
            observer.disconnect()
            const start = performance.now()
            const tick = (now: number) => {
              const linear = Math.min(1, (now - start) / durationMs)
              const eased = 1 - Math.pow(1 - linear, 3)
              setDisplay(renderTokens(tokens, eased))
              if (linear < 1) {
                rafRef.current = requestAnimationFrame(tick)
              } else {
                // Ensure we land exactly on the final string.
                setDisplay(value)
              }
            }
            rafRef.current = requestAnimationFrame(tick)
          }
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [mounted, value, durationMs])

  return <span ref={ref}>{mounted ? display : value}</span>
}
