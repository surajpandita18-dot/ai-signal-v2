// Oscilloscope-style waveform with a traveling bright pulse. Decorative only.
// From the Figr design export (2026-06-13).

type Props = { className?: string }

const WAVE =
  'M0 60 L120 60 L150 60 L168 28 L182 92 L196 44 L210 60 L360 60 L388 60 L404 38 L420 60 L640 60 L662 60 L676 18 L690 100 L704 52 L716 60 L900 60 L928 60 L946 46 L962 60 L1200 60'

export default function SignalTrace({ className = '' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <path d={WAVE} stroke="var(--line-strong)" strokeWidth="1.5" opacity="0.7" />
      <path
        d={WAVE}
        pathLength={1000}
        className="signal-pulse"
        stroke="var(--lime)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
