'use client'

// Highlight-to-share popover — when a user selects text inside <main id="main">,
// show a small dark pill near the selection with Copy / WhatsApp / X buttons.
// Hides on empty selection, scroll, or click outside.

import { useCallback, useEffect, useRef, useState } from 'react'

type Position = { top: number; left: number; placement: 'above' | 'below' }

const POPOVER_HEIGHT = 36 // approx; used for above-vs-below decision
const POPOVER_GAP = 8
const IOS_OFFSET = 48 // push above iOS Safari's native callout when above

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function getSelectedText(): { text: string; rect: DOMRect | null } {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return { text: '', rect: null }
  const text = sel.toString().trim()
  if (!text) return { text: '', rect: null }
  const range = sel.getRangeAt(0)
  // Must be inside the article body.
  const main = document.getElementById('main')
  if (!main) return { text: '', rect: null }
  const node = range.commonAncestorContainer
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  if (!el || !main.contains(el)) return { text: '', rect: null }
  const rect = range.getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) return { text: text, rect: null }
  return { text, rect }
}

function computePosition(rect: DOMRect): Position {
  const ios = isIOS()
  const above = rect.top - POPOVER_HEIGHT - POPOVER_GAP - (ios ? IOS_OFFSET : 0)
  const placement: 'above' | 'below' = above > 8 ? 'above' : 'below'
  const top =
    placement === 'above'
      ? rect.top - POPOVER_HEIGHT - POPOVER_GAP - (ios ? IOS_OFFSET : 0)
      : rect.bottom + POPOVER_GAP
  const left = rect.left + rect.width / 2
  return { top, left, placement }
}

export function SelectionShare() {
  const [mounted, setMounted] = useState(false)
  const [text, setText] = useState('')
  const [pos, setPos] = useState<Position | null>(null)
  const [copied, setCopied] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<number | null>(null)
  const copiedTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const update = useCallback(() => {
    const { text: t, rect } = getSelectedText()
    if (!t || !rect) {
      setText('')
      setPos(null)
      return
    }
    setText(t)
    setPos(computePosition(rect))
  }, [])

  const hide = useCallback(() => {
    setText('')
    setPos(null)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const onSelectionChange = () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        update()
      }, 80)
    }
    const onMouseUp = () => {
      // Small delay so the selection has settled.
      window.setTimeout(update, 10)
    }
    const onTouchEnd = () => {
      window.setTimeout(update, 10)
    }
    const onScroll = () => {
      hide()
    }
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (popoverRef.current && target && popoverRef.current.contains(target)) return
      // Will be re-evaluated on selectionchange/mouseup
      hide()
    }

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchend', onTouchEnd)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mousedown', onMouseDown)

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousedown', onMouseDown)
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current)
    }
  }, [mounted, update, hide])

  if (!mounted || !pos || !text) return null

  const truncatedForX = text.length > 280 ? text.slice(0, 277) + '…' : text
  const url = typeof window !== 'undefined' ? window.location.href : ''

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} — AI Signal`)
      setCopied(true)
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${text} — ${url}`)}`
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(truncatedForX)}&url=${encodeURIComponent(url)}`

  return (
    <div
      ref={popoverRef}
      role="toolbar"
      aria-label="Share selected text"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 60,
        transition: reducedMotion ? 'none' : 'opacity 120ms ease-out',
      }}
      className="flex items-center gap-1 rounded-full bg-[#0e0c08] text-[#f4efe6] shadow-md px-1 py-1 font-mono text-[12px] uppercase"
    >
      <button
        type="button"
        onClick={onCopy}
        className="px-3 py-1.5 rounded-full hover:bg-white/10"
        aria-label="Copy selection"
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-full hover:bg-white/10"
        aria-label="Share on WhatsApp"
      >
        WhatsApp
      </a>
      <a
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 rounded-full hover:bg-white/10"
        aria-label="Share on X"
      >
        X
      </a>
    </div>
  )
}
