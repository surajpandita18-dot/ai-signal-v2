// Typographic logo. Editorial-style (Stratechery/Every-aligned). Uses currentColor
// so it inherits light/dark. The peacock-green dot is the brand mark.

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 font-display text-[16px] font-bold tracking-[-0.01em] ${className ?? ''}`}
      translate="no"
    >
      <span className="inline-flex items-center">
        AI&nbsp;SIGNAL
        <span
          aria-hidden="true"
          className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#0f4c3a]"
        />
      </span>
    </span>
  )
}
