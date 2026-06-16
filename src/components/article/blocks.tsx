'use client'


import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Editorial block primitives from Figr design 2026-06-13.
// One block type per editorial moment — prose, glance, layers, math,
// archetype, steal, calls, readskip, pullquote, stat, note, chart.

export type Block =
  | { type: 'prose'; html: string }
  | { type: 'sectionhead'; text: string; sub?: string }
  | {
      type: 'glance'
      items: { verb: string; body: string; isHumanPick: boolean }[]
    }
  | { type: 'layers'; items: { t: string; d: string }[] }
  | {
      type: 'math'
      caption: string
      cols: [string, string, string]
      rows: { metric: string; a: string; b: string; delta: string }[]
    }
  | { type: 'archetype'; quote: string; paras: string[] }
  | { type: 'steal'; body: string; chips: string[] }
  | { type: 'calls'; items: { c: 'HIGH' | 'MED' | 'LOW'; t: string }[] }
  | { type: 'readskip'; read: string[]; skip: string[] }
  | { type: 'pullquote'; text: string; cite?: string }
  | { type: 'stat'; items: { value: string; label: string }[] }
  | { type: 'note'; label: string; body: string }
  | { type: 'chart'; caption: string; unit: string; data: { x: string; y: number }[] }

export function Kicker({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] tracking-label text-fg-muted">
      <span className="text-lime-soft">{n}</span>
      <span className="h-px w-8 bg-line-strong" />
      {label}
    </div>
  )
}

function Prose({ html }: { html: string }) {
  return <div className="editorial" dangerouslySetInnerHTML={{ __html: html }} />
}

function SectionHead({ text, sub }: { text: string; sub?: string }) {
  return (
    <div>
      <h3 className="font-serif text-[26px] font-medium leading-[1.15] tracking-tight text-fg">{text}</h3>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{sub}</p>}
    </div>
  )
}

function Glance({
  items,
}: {
  items: { verb: string; body: string; isHumanPick: boolean }[]
}) {
  // Asymmetric editorial hierarchy: the Ship pick is the moat — bright body 17px
  // FG. Hold/Kill demoted to italic Georgia 16px cream-dim. Keyed off verb
  // identity AND human-pick provenance so the affirmative Ship-tier treatment
  // can never claim an AI candidate (CLAUDE.md rule #1). Spacing differential
  // reinforces the demotion — Ship-to-Hold gets the full gap, demoted-to-demoted
  // rows tighten so the asymmetry reads spatially as well as typographically.
  return (
    <ol className="flex flex-col border-t border-line pt-7">
      {items.map((m, i) => {
        const isShipPick = m.verb === 'Ship' && m.isHumanPick
        // First row has no top margin. Ship→demoted gap is full (24px). Two
        // consecutive demoted rows (Hold→Kill) tighten to 14px.
        const prev = items[i - 1]
        const prevIsShip = prev?.verb === 'Ship' && prev?.isHumanPick
        const top = i === 0 ? '' : prevIsShip ? 'mt-6' : 'mt-3.5'
        if (isShipPick) {
          return (
            <li
              key={i}
              className={`text-[17px] leading-[1.6] text-fg ${top}`}
            >
              <span className="font-serif font-semibold text-fg">{m.verb}.</span>{' '}
              <span dangerouslySetInnerHTML={{ __html: m.body }} />
            </li>
          )
        }
        return (
          <li
            key={i}
            className={`font-serif text-[16px] italic leading-[1.55] text-fg-muted ${top}`}
          >
            <span className="font-semibold not-italic text-cream-dim">{m.verb}.</span>{' '}
            <span dangerouslySetInnerHTML={{ __html: m.body }} />
          </li>
        )
      })}
    </ol>
  )
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

function Layers({ items }: { items: { t: string; d: string }[] }) {
  // Identical skeleton per beat (CLAUDE.md spec). Roman numeral + serif
  // title hanging-left, body right. Lime accent on the numeral is the
  // structural beat anchor. Hairline rule between beats for print-brief
  // cadence — the eye needs a rest between six discrete diffs.
  return (
    <div className="flex flex-col">
      {items.map((l, i) => {
        const numeral = ROMAN[i] ?? String(i + 1)
        return (
          <div
            key={l.t}
            className={`flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-8 ${
              i === 0 ? 'pt-2' : 'border-t border-line pt-10'
            } pb-10 last:pb-2`}
          >
            <div className="flex shrink-0 items-baseline gap-3 sm:w-40">
              <span className="w-5 shrink-0 font-serif text-[18px] italic text-lime">
                {numeral}.
              </span>
              <h3 className="font-serif text-[22px] font-medium leading-tight tracking-tight text-fg">
                {l.t}
              </h3>
            </div>
            <p
              className="text-[16px] leading-[1.7] text-fg-muted"
              dangerouslySetInnerHTML={{ __html: l.d }}
            />
          </div>
        )
      })}
    </div>
  )
}

// Parse INR values from a Math row's `b` string ("₹75L/month", "₹12.5L",
// "₹62L", "~$15K/month ≈ ₹12.5L/month"). Returns the rupee value in lakhs
// for charting. Skips rows we can't parse — chart is "nice to have", not
// the source of truth (the table below is the source of truth).
function parseChartRows(
  rows: { metric: string; b: string }[]
): { metric: string; value: number; label: string }[] {
  const out: { metric: string; value: number; label: string }[] = []
  for (const r of rows) {
    // Find the FIRST INR amount in the value string. Format variants:
    //   ₹75L, ₹12.5L, ₹62L, ₹7.5Cr, ₹500/M, ₹6.3
    const m = r.b.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(Cr|L|K)?/i)
    if (!m) continue
    const n = parseFloat(m[1].replace(/,/g, ''))
    if (!Number.isFinite(n)) continue
    const unit = (m[2] ?? '').toUpperCase()
    // Normalize to lakhs (₹1L = 100K). Cr → ×100, K → ÷100, bare ÷ 100000.
    const inLakhs =
      unit === 'CR'
        ? n * 100
        : unit === 'L'
          ? n
          : unit === 'K'
            ? n / 100
            : n / 100000
    out.push({ metric: r.metric, value: inLakhs, label: r.b.trim() })
  }
  return out
}

function InrBarChart({
  rows,
}: {
  rows: { metric: string; value: number; label: string }[]
}) {
  const max = globalThis.Math.max(...rows.map((r) => r.value))
  if (!Number.isFinite(max) || max <= 0) return null
  return (
    <div className="mb-7 border-y border-line py-5">
      <div className="mb-3 font-mono text-[10px] tracking-[0.14em] text-fg-muted">
        ₹ LAKHS · WIDTH PROPORTIONAL
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => {
          const pct = (r.value / max) * 100
          // First and largest row gets lime; the rest cream. The delta /
          // savings row often comes second; if it's bigger than the
          // baseline (which it can be when the chart is showing a
          // savings figure), the lime tracks that.
          const isPrimary = r.value === max
          return (
            <div key={i} className="grid grid-cols-[minmax(120px,1.2fr)_3fr_auto] items-center gap-3">
              <div className="truncate text-[13px] text-cream-dim" title={r.metric}>
                {r.metric}
              </div>
              <div className="relative h-[14px] w-full bg-bg-raised">
                <div
                  className={`absolute left-0 top-0 h-full ${isPrimary ? 'bg-lime-bright' : 'bg-line-strong'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="font-mono text-[13px] tabular-nums text-fg">
                {r.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Math({
  caption,
  cols,
  rows,
}: {
  caption: string
  cols: [string, string, string]
  rows: { metric: string; a: string; b: string; delta: string }[]
}) {
  // Hierarchy: caption (mono small) → HEADLINE (huge lime, the savings/delta
  // number or the biggest value) → before/after comparison cards → annual /
  // footnote rows. The bar chart is dropped — the headline IS the visual.
  // Fresh-model audit 2026-06-16: "the big savings number is buried."
  //
  // Row classification:
  // - "headline" row matches /delta|saved|savings/i in metric. Promoted huge.
  // - "annual"/"yearly" rows + bare ₹Cr values render as small footnote.
  // - The remaining 2-3 rows become side-by-side comparison cards.

  const headlineIdx = rows.findIndex((r) =>
    /\b(delta|saved|savings)\b/i.test(r.metric)
  )
  const headline = headlineIdx >= 0 ? rows[headlineIdx] : null

  const footnoteIdxs = new Set<number>()
  rows.forEach((r, i) => {
    if (i === headlineIdx) return
    if (/\b(annual|yearly|per year)\b/i.test(r.metric)) footnoteIdxs.add(i)
    else if (/₹\s*[\d.]+\s*Cr/i.test(r.b)) footnoteIdxs.add(i)
  })

  const comparisonRows = rows.filter(
    (_, i) => i !== headlineIdx && !footnoteIdxs.has(i)
  )
  const footnoteRows = rows.filter((_, i) => footnoteIdxs.has(i))

  // Fallback: if no explicit delta row, promote the biggest INR value in the
  // remaining rows as the headline (still informative — the reader sees the
  // largest number first).
  const headlineRow =
    headline ??
    (() => {
      const parsed = parseChartRows(comparisonRows)
      if (parsed.length === 0) return null
      const biggest = parsed.reduce((a, b) => (b.value > a.value ? b : a))
      return { metric: biggest.metric, a: '', b: biggest.label, delta: '' }
    })()

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
        {caption}
      </p>
      {headlineRow && (() => {
        // Some payloads pack two metric:value pairs on one line ("Monthly
        // delta: ₹62L. Annual: ~₹7.5Cr."). Extract just the first ₹<n><unit>
        // so the huge headline reads as one number, not a mashup.
        const firstNum = headlineRow.b.match(/[₹$]\s*[\d,]+(?:\.\d+)?\s*(?:Cr|L|K|M)?/i)
        const headlineDisplay = firstNum ? firstNum[0].trim() : headlineRow.b
        return (
          <div className="border-y border-line-strong py-9 sm:py-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
              {headlineRow.metric}
            </p>
            <p className="mt-2 font-serif text-[56px] font-semibold leading-[0.95] tracking-tight text-lime sm:text-[80px]">
              {headlineDisplay}
            </p>
          </div>
        )
      })()}
      {comparisonRows.length > 0 && (
        <div className={`mt-8 grid gap-px bg-line ${comparisonRows.length === 2 ? 'sm:grid-cols-2' : ''}`}>
          {comparisonRows.map((r, i) => {
            const first = r.b.match(/[₹$]\s*[\d,]+(?:\.\d+)?\s*(?:Cr|L|K|M)?/i)
            return (
              <div key={r.metric} className="bg-bg p-6 sm:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
                  {i === 0 ? 'Today' : i === 1 ? 'Routed' : `Scenario ${i + 1}`}
                </p>
                <p className="mt-3 text-[15px] leading-[1.5] text-cream-dim">
                  {r.metric}
                </p>
                <p className="mt-3 font-serif text-[28px] font-semibold leading-tight text-fg">
                  {first ? first[0].trim() : r.b}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {footnoteRows.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 border-t border-line pt-5">
          {footnoteRows.map((r) => (
            <p
              key={r.metric}
              className="font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted"
            >
              <span className="text-cream-dim">{r.metric}</span>
              <span className="mx-2 text-line-strong">·</span>
              <span className="text-fg">{r.b}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function Archetype({ quote, paras }: { quote: string; paras: string[] }) {
  return (
    <div className="border-l-2 border-lime pl-6 sm:pl-7">
      <p className="font-serif text-[20px] italic leading-snug text-fg sm:text-[22px]">{quote}</p>
      {paras.map((p, i) => (
        <p
          key={i}
          className="mt-5 text-[16px] leading-[1.7] text-fg-muted"
          dangerouslySetInnerHTML={{ __html: p }}
        />
      ))}
    </div>
  )
}

function Steal({
  body,
  chips,
}: {
  body: string
  chips: string[]
}) {
  // Parse inline strong tags as inline editorial subheads (Why it matters. / How
  // to apply.). No more bordered card, no lime bolt — render flowing on the page.
  // Widened regex matches `[\s\S]+?` so nested tags or cross-line content inside
  // <strong>…</strong> still pair label↔body correctly. A labeled section is
  // kept even when its body is empty so the editorial subhead never vanishes.
  const parts: { label: string | null; html: string }[] = []
  // The Steal subhead labels are HARDCODED by payload-adapter.ts. Match ONLY
  // those exact literal label strings; never scan freely. Otherwise an inline
  // `**word.**` from the synthesizer (e.g. "ship by **Monday.**" routed through
  // inline()) would also end in `.` and falsely promote into a new section,
  // fracturing the body.
  const re = /<strong>(Why it matters\.|How to apply\.)<\/strong>/g
  let lastIndex = 0
  let lastLabel: string | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (m.index > lastIndex || lastLabel) {
      parts.push({
        label: lastLabel,
        html: body.slice(lastIndex, m.index).trim(),
      })
    }
    lastLabel = m[1]
    lastIndex = m.index + m[0].length
  }
  parts.push({ label: lastLabel, html: body.slice(lastIndex).trim() })
  // Keep labeled sections even with empty body so a "Why it matters." subhead
  // is never silently lost. Drop only truly empty (no label, no body) leading
  // entries from the first split.
  const sections = parts.filter((p) => p.label != null || p.html.length > 0)

  return (
    <div className="flex flex-col gap-7">
      {sections.map((s, i) => (
        <div key={i}>
          {s.label ? (
            <h4 className="mb-2 font-serif text-[19px] font-medium italic leading-snug text-fg">
              {s.label.replace(/[.:]\s*$/, '')}.
            </h4>
          ) : null}
          <div
            className="text-[17px] leading-[1.7] text-cream-dim"
            dangerouslySetInnerHTML={{ __html: s.html }}
          />
        </div>
      ))}
      {chips.length ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-fg-muted">
          {chips.map((chip, i) => (
            <span key={chip} className="flex items-center gap-3">
              {i > 0 ? <span className="text-line-strong">·</span> : null}
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Calls({
  items,
}: {
  items: { c: 'HIGH' | 'MED' | 'LOW'; t: string }[]
}) {
  // Confidence inline as italic serif tone (high/medium/low) — pairs with
  // the body argument rather than floating as an orphan mono label. Lime
  // tick stays on the HIGH item only as the structural anchor.
  const wordFor = (c: 'HIGH' | 'MED' | 'LOW') =>
    c === 'HIGH' ? 'high confidence' : c === 'MED' ? 'medium confidence' : 'low confidence'
  return (
    <div className="flex flex-col">
      {items.map((p, i) => (
        <div
          key={i}
          className={`py-6 ${i === 0 ? '' : 'border-t border-line'}`}
        >
          <p
            className="text-[16px] leading-[1.6] text-cream-dim"
            dangerouslySetInnerHTML={{ __html: p.t }}
          />
          <p className="mt-2 font-serif text-[14px] italic text-fg-muted">
            <span className={p.c === 'HIGH' ? 'text-lime' : ''}>—</span>{' '}
            {wordFor(p.c)}.
          </p>
        </div>
      ))}
    </div>
  )
}

function ReadSkip({ read, skip }: { read: string[]; skip: string[] }) {
  return (
    <div className="flex flex-col gap-10">
      <ul className="flex flex-col gap-6">
        {read.map((r, i) => (
          <li
            key={i}
            className="text-[17px] leading-[1.6] text-cream-dim"
            dangerouslySetInnerHTML={{ __html: r }}
          />
        ))}
      </ul>
      {skip.length ? (
        <div className="border-t border-line pt-8">
          <p className="font-serif text-[16px] italic text-fg-muted">
            And the ones you can skip:
          </p>
          <ul className="mt-4 flex flex-col gap-2 font-serif text-[15px] italic leading-[1.5] text-fg-muted">
            {skip.map((s, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function PullQuote({ text, cite }: { text: string; cite?: string }) {
  return (
    <figure className="border-y border-line py-8">
      <blockquote className="font-serif text-2xl font-medium leading-snug tracking-tight text-fg sm:text-[28px]">
        <span className="text-lime">&ldquo;</span>
        {text}
        <span className="text-lime">&rdquo;</span>
      </blockquote>
      {cite && (
        <figcaption className="mt-4 font-mono text-[11px] tracking-label text-fg-muted">
          — {cite}
        </figcaption>
      )}
    </figure>
  )
}

function StatBand({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="bg-bg p-5">
          <div className="font-serif text-3xl font-semibold tracking-tight text-lime">
            {s.value}
          </div>
          <div className="mt-2 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-fg-muted">
            {s.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  )
}

function NoteBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="border border-line-strong bg-bg-raised p-6">
      <div className="mb-3 font-mono text-[11px] tracking-label text-danger">
        {label}
      </div>
      <p className="text-[15px] leading-[1.65] text-fg-muted">{body}</p>
    </div>
  )
}

function ChartBlock({
  caption,
  unit,
  data,
}: {
  caption: string
  unit: string
  data: { x: string; y: number }[]
}) {
  return (
    <div className="border border-line bg-bg-raised p-5">
      <div className="mb-5 font-mono text-[11px] tracking-label text-fg-muted">
        {caption}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="limeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c2f53d" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#c2f53d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="x"
              tick={{ fill: '#6b7062', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#20241c' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7062', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(v) => `${unit}${v}`}
            />
            <Tooltip
              cursor={{ stroke: '#cdc9bf' }}
              contentStyle={{
                background: '#fffefb',
                border: '1px solid #cdc9bf',
                borderRadius: 0,
                fontFamily: 'JetBrains Mono',
                fontSize: 12,
                color: '#1a1a1a',
              }}
              formatter={(v) => [`${unit}${v}`, 'price']}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke="#c2f53d"
              strokeWidth={2}
              fill="url(#limeFill)"
              dot={{ fill: '#c2f53d', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'prose':
      return <Prose html={block.html} />
    case 'sectionhead':
      return <SectionHead text={block.text} sub={block.sub} />
    case 'glance':
      return <Glance items={block.items} />
    case 'layers':
      return <Layers items={block.items} />
    case 'math':
      return <Math caption={block.caption} cols={block.cols} rows={block.rows} />
    case 'archetype':
      return <Archetype quote={block.quote} paras={block.paras} />
    case 'steal':
      return <Steal body={block.body} chips={block.chips} />
    case 'calls':
      return <Calls items={block.items} />
    case 'readskip':
      return <ReadSkip read={block.read} skip={block.skip} />
    case 'pullquote':
      return <PullQuote text={block.text} cite={block.cite} />
    case 'stat':
      return <StatBand items={block.items} />
    case 'note':
      return <NoteBlock label={block.label} body={block.body} />
    case 'chart':
      return <ChartBlock caption={block.caption} unit={block.unit} data={block.data} />
    default: {
      // Exhaustiveness check — adding a new Block variant without a renderer
      // case fails compilation here instead of silently returning null at runtime.
      const _exhaustive: never = block
      void _exhaustive
      return null
    }
  }
}

// Canonical list of block-type identifiers. Any surface that renders blocks
// (web BlockRenderer above, email-template.ts, future LinkedIn/WhatsApp) MUST
// be able to handle every entry. A compile-time assertion enforces parity.
export const BLOCK_TYPES = [
  'prose',
  'sectionhead',
  'glance',
  'layers',
  'math',
  'archetype',
  'steal',
  'calls',
  'readskip',
  'pullquote',
  'stat',
  'note',
  'chart',
] as const

// Bidirectional parity check between BLOCK_TYPES (runtime constant) and
// Block['type'] (TS union). Adding a Block variant without touching BLOCK_TYPES
// makes `_b` resolve to `false` and the explicit `: true` annotation rejects it.
// Adding to BLOCK_TYPES without the union sees `_a` become `false`. Either side
// drifting fails the build.
type _BT = (typeof BLOCK_TYPES)[number]
const _bt_covers_block: _BT extends Block['type'] ? true : false = true
const _block_covered_by_bt: Block['type'] extends _BT ? true : false = true
void _bt_covers_block
void _block_covered_by_bt
