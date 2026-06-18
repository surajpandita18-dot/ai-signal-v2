// Heartbeat/EKG-style waveform with a traveling bright pulse.
// Visible, not buried. Flat baseline with a sharp P-wave + QRS-spike + T-wave
// pattern repeated across the width.

type Props = { className?: string }

// Three EKG beats across 1200px, with long flat baselines in between.
// Each beat: small P-wave dip, sharp QRS spike (down then UP-spike then down),
// rounded T-wave.
const WAVE = [
  'M0 60',
  // baseline
  'L120 60',
  // beat 1
  'L160 60 L170 54 L180 60', // P-wave
  'L200 60',
  'L208 70 L214 28 L222 90 L230 60', // QRS spike (the BIG one)
  'L260 60 L275 50 L290 60', // T-wave
  // baseline
  'L460 60',
  // beat 2
  'L500 60 L510 54 L520 60',
  'L540 60',
  'L548 70 L554 28 L562 90 L570 60',
  'L600 60 L615 50 L630 60',
  // baseline
  'L800 60',
  // beat 3
  'L840 60 L850 54 L860 60',
  'L880 60',
  'L888 70 L894 28 L902 90 L910 60',
  'L940 60 L955 50 L970 60',
  // baseline to end
  'L1200 60',
].join(' ')

export default function SignalTrace({ className = '' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <defs>
        <filter id="trace-glow" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Baseline — bright enough to read at rest */}
      <path
        d={WAVE}
        stroke="rgb(var(--lime-bright))"
        strokeWidth="2"
        strokeOpacity="0.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#trace-glow)"
      />
      {/* Traveling chase — short bright segment with glow */}
      <path
        d={WAVE}
        pathLength={1000}
        className="signal-pulse"
        stroke="rgb(var(--lime-bright))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#trace-glow)"
      />
    </svg>
  )
}
