'use client'

// Reading progress bar — 2px peacock line fixed at the top of the viewport.
// Fills based on scroll position WITHIN the article body (not the whole document),
// so the masthead, sticky chapter nav, and footer don't dilute the felt progress.

import { useEffect, useState } from 'react'

export function ReadingProgress({ targetSelector = '#main' }: { targetSelector?: string }) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onMqChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onMqChange)

    const compute = () => {
      const target = document.querySelector<HTMLElement>(targetSelector)
      if (!target) {
        setProgress(0)
        return
      }
      const start = target.offsetTop
      const total = target.scrollHeight - window.innerHeight
      if (total <= 0) {
        setProgress(0)
        return
      }
      const raw = (window.scrollY - start) / total
      const clamped = Math.max(0, Math.min(1, raw))
      setProgress(clamped)
    }

    compute()
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
      mq.removeEventListener('change', onMqChange)
    }
  }, [targetSelector])

  if (!mounted) return null
  if (progress < 0.005) return null

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '2px',
        width: `${progress * 100}%`,
        background: 'rgb(var(--accent))',
        zIndex: 50,
        transition: reducedMotion ? 'none' : 'width 80ms ease-out',
        pointerEvents: 'none',
      }}
    />
  )
}
