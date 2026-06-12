// Animated equalizer bars — the "signal" wordmark glyph.
// From the Figr design export (2026-06-13).

type Props = { className?: string; color?: string }

export default function SignalBars({ className = '', color = 'currentColor' }: Props) {
  const delays = ['0s', '0.18s', '0.36s', '0.12s']
  const heights = [10, 16, 13, 8]
  return (
    <span
      className={`inline-flex items-end gap-[2px] ${className}`}
      style={{ height: 16 }}
      aria-hidden
    >
      {delays.map((d, i) => (
        <span
          key={i}
          className="eq-bar block w-[2px] rounded-[1px]"
          style={{ height: heights[i], background: color, animationDelay: d }}
        />
      ))}
    </span>
  )
}
