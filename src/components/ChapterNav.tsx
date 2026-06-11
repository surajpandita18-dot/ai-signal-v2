'use client'

// Sticky chapter nav strip. Tracks the most-visible chapter section via
// IntersectionObserver and highlights it. Mobile: horizontal-scroll, numbers only.

import { useEffect, useState } from 'react'

export interface ChapterNavItem {
  id: string
  num: string
  label: string
}

export function ChapterNav({ chapters }: { chapters: ChapterNavItem[] }) {
  const [activeId, setActiveId] = useState<string>(chapters[0]?.id ?? '')

  useEffect(() => {
    if (!chapters.length) return
    const elements = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null)

    if (!elements.length) return

    // Track ratios; pick the most-visible chapter as active.
    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio)
        }
        let bestId = ''
        let bestRatio = -1
        for (const [id, ratio] of ratios.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }
        if (bestId && bestRatio > 0) setActiveId(bestId)
      },
      {
        rootMargin: '-64px 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [chapters])

  if (!chapters.length) return null

  return (
    <nav
      aria-label="Chapters"
      className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md"
    >
      <div
        className="mx-auto flex max-w-reader gap-1 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {chapters.map((c) => {
          const isActive = c.id === activeId
          const base =
            'inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition'
          const state = isActive
            ? 'border-accent text-accent'
            : 'border-transparent text-muted hover:text-ink'
          return (
            <a key={c.id} href={`#${c.id}`} className={`${base} ${state}`}>
              <span>{c.num}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
