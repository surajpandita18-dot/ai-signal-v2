'use client'

// Manual light/dark toggle. Reads/writes localStorage so the choice
// persists across visits, and writes data-theme on <html> so the CSS
// variables in globals.css flip on the next paint.
//
// Defaults to system preference (no localStorage key) so first-time
// visitors get the OS-appropriate look. The pre-paint script in
// app/layout.tsx applies the stored choice BEFORE React hydrates,
// preventing the flash-of-wrong-theme.

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'aisignal_theme'

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* localStorage unavailable */
  }
  return 'system'
}

function resolveSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: Theme) {
  const html = document.documentElement
  if (t === 'system') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', t)
  }
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  // SSR-safe: render in a neutral state, then hydrate to actual stored theme.
  const [theme, setTheme] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = readStored()
    setTheme(stored)
    setResolved(stored === 'system' ? resolveSystem() : stored)
    setMounted(true)
  }, [])

  // Re-resolve when system pref changes (only matters in 'system' mode)
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setResolved(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function toggle() {
    // Tri-state cycle so the user can return to system: light → dark → system → light…
    const next: Theme = resolved === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
    if (next === 'system') {
      const sys = resolveSystem()
      setResolved(sys)
    } else {
      setResolved(next)
    }
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    applyTheme(next)
  }

  // While unmounted, render a neutral placeholder of fixed size so the layout
  // doesn't shift when client hydrates.
  if (!mounted) {
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center ${className}`}
        aria-hidden="true"
      />
    )
  }

  const label =
    theme === 'system'
      ? 'Theme: system (click to force light)'
      : theme === 'dark'
        ? 'Theme: dark (click to return to system)'
        : 'Theme: light (click to force dark)'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-paper/10 ${className}`}
    >
      {resolved === 'dark' ? (
        // Moon
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
      {theme === 'system' ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent"
          title="Tracking system preference"
        />
      ) : null}
    </button>
  )
}
