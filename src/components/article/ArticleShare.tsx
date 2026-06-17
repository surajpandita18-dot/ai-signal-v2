'use client'

// Lenny-style share/copy-URL button — sits inline with the byline on
// /issue/[id]. Copies window.location.href to the clipboard, flips to
// "Link copied" for ~1.5s, then resets. Native share API on supported
// devices (mobile Safari, Chrome Android) takes precedence.

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function ArticleShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof window === 'undefined') return
    const url = window.location.href
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user canceled the share sheet — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — degrade silently
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      {copied ? (
        <>
          <Check size={13} strokeWidth={2.25} className="text-lime-soft" />
          Link copied
        </>
      ) : (
        <>
          <Link2 size={13} strokeWidth={2.25} />
          Share
        </>
      )}
    </button>
  )
}
