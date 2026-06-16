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

function Math({
  caption,
  cols,
  rows,
}: {
  caption: string
  cols: [string, string, string]
  rows: { metric: string; a: string; b: string; delta: string }[]
}) {
  // Adaptive: when the synthesizer can't supply baseline (a) AND delta values
  // (the common case today), collapse the 4-col scaffold to a 2-col metric/value
  // table. A 4-col table where two columns are universally blank looks like a
  // parse bug, which violates "INR math defends against AI-slop" per CLAUDE.md.
  const hasBaseline = rows.some((r) => r.a && r.a !== '—' && r.a !== '')
  const hasDelta = rows.some((r) => r.delta && r.delta !== '')
  const compact = !hasBaseline && !hasDelta

  return (
    <div>
      <p className="mb-5 font-serif text-[15px] italic text-fg-muted">
        {caption.toLowerCase().replace(/^./, (c) => c.toUpperCase())}.
      </p>
      <div className="overflow-x-auto">
        {compact ? (
          <div className="min-w-[320px] border-t border-b border-line-strong">
            <div className="grid grid-cols-[1.6fr_1fr] border-b border-line font-mono text-[10px] tracking-[0.14em] text-fg-muted">
              <div className="py-3">{cols[0]}</div>
              <div className="py-3 text-right">{cols[2]}</div>
            </div>
            {rows.map((r) => (
              <div
                key={r.metric}
                className="grid grid-cols-[1.6fr_1fr] items-baseline border-b border-line text-[15px] last:border-b-0"
              >
                <div className="py-4 text-cream-dim">{r.metric}</div>
                <div className="py-4 text-right font-mono text-fg">{r.b}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-w-[440px] border-t border-b border-line-strong">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] border-b border-line font-mono text-[10px] tracking-[0.14em] text-fg-muted">
              <div className="py-3">{cols[0]}</div>
              <div className="py-3 text-right">{cols[1]}</div>
              <div className="py-3 text-right">{cols[2]}</div>
              <div className="py-3 text-right font-semibold text-lime-soft">DELTA</div>
            </div>
            {rows.map((r) => (
              <div
                key={r.metric}
                className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] items-baseline border-b border-line text-[15px] last:border-b-0"
              >
                <div className="py-4 text-cream-dim">{r.metric}</div>
                <div className="py-4 text-right font-mono text-fg-muted">
                  {r.a === '—' || r.a === '' ? null : r.a}
                </div>
                <div className="py-4 text-right font-mono text-fg">{r.b}</div>
                <div className="py-4 text-right font-mono text-[17px] font-semibold text-lime">
                  {r.delta}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
              cursor={{ stroke: '#2c3127' }}
              contentStyle={{
                background: '#131712',
                border: '1px solid #2c3127',
                borderRadius: 0,
                fontFamily: 'JetBrains Mono',
                fontSize: 12,
                color: '#f4f2ec',
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
