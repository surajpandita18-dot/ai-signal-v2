// AI SIGNAL wordmark with animated equalizer bars (signal motif).
// Replaces the v2 peacock-dot logo. From Figr design 2026-06-13.

import SignalBars from './SignalBars'

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[15px] font-semibold tracking-[0.12em] ${className ?? ''}`}
      translate="no"
    >
      <SignalBars color="currentColor" />
      AI SIGNAL
    </span>
  )
}
