'use client'

import { useEffect, useState } from 'react'

export interface ChapterNavItem {
  id: string
  label: string
}

export default function ChapterNav({ chapters }: { chapters: ChapterNavItem[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? '')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    chapters.forEach((c) => {
      const el = document.getElementById(c.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [chapters])

  return (
    <div className="sticky top-14 z-30 border-b border-line bg-bg/95">
      <div className="mx-auto flex max-w-shell gap-5 overflow-x-auto px-5 py-3 sm:gap-7 sm:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chapters.map((c, i) => {
          const on = active === c.id
          return (
            <a
              key={c.id}
              href={`#${c.id}`}
              className={`shrink-0 border-b-2 pb-1 font-mono text-[11px] tracking-label transition-colors ${
                on
                  ? 'border-lime text-lime'
                  : 'border-transparent text-fg-subtle hover:text-fg-muted'
              }`}
            >
              {String(i + 1).padStart(2, '0')} {c.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}
