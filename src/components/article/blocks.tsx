'use client'

import { Check, X, Zap } from 'lucide-react'
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
  | { type: 'glance'; items: string[] }
  | { type: 'layers'; items: { t: string; d: string }[] }
  | {
      type: 'math'
      caption: string
      cols: [string, string, string]
      rows: { metric: string; a: string; b: string; delta: string }[]
    }
  | { type: 'archetype'; quote: string; paras: string[] }
  | { type: 'steal'; kicker: string; body: string; chips: string[] }
  | { type: 'calls'; items: { c: 'HIGH' | 'MED' | 'LOW'; t: string }[] }
  | { type: 'readskip'; read: string[]; skip: string[] }
  | { type: 'pullquote'; text: string; cite?: string }
  | { type: 'stat'; items: { value: string; label: string }[] }
  | { type: 'note'; label: string; body: string }
  | { type: 'chart'; caption: string; unit: string; data: { x: string; y: number }[] }

export function Kicker({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] tracking-label text-fg-subtle">
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
      <h3 className="font-serif text-2xl font-medium tracking-tight text-fg">{text}</h3>
      {sub && <p className="mt-2 text-[14px] text-fg-muted">{sub}</p>}
    </div>
  )
}

function Glance({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-px overflow-hidden border border-line bg-line">
      {items.map((m, i) => (
        <li key={i} className="flex gap-5 bg-bg p-6">
          <span className="font-serif text-2xl font-semibold text-lime">{i + 1}</span>
          <p
            className="text-[15px] leading-relaxed text-cream-dim"
            dangerouslySetInnerHTML={{ __html: m }}
          />
        </li>
      ))}
    </ol>
  )
}

function Layers({ items }: { items: { t: string; d: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      {items.map((l, i) => (
        <div key={l.t} className="flex flex-col bg-bg p-6">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] tracking-label text-lime-soft">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-serif text-lg font-medium text-fg">{l.t}</span>
          </div>
          <div className="mt-4 h-px w-full bg-line" />
          <p
            className="mt-4 text-[13.5px] leading-relaxed text-fg-muted"
            dangerouslySetInnerHTML={{ __html: l.d }}
          />
        </div>
      ))}
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
  return (
    <div>
      <div className="mb-4 font-mono text-[11px] tracking-label text-fg-subtle">
        {caption}
      </div>
      <div className="overflow-hidden border border-line">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] bg-card font-mono text-[10px] tracking-[0.08em] text-fg-subtle">
          <div className="p-3.5">{cols[0]}</div>
          <div className="p-3.5 text-right">{cols[1]}</div>
          <div className="p-3.5 text-right">{cols[2]}</div>
          <div className="p-3.5 text-right">Δ</div>
        </div>
        {rows.map((r) => (
          <div
            key={r.metric}
            className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] border-t border-line text-[13px]"
          >
            <div className="p-3.5 text-cream-dim">{r.metric}</div>
            <div className="p-3.5 text-right font-mono text-fg-muted">{r.a}</div>
            <div className="p-3.5 text-right font-mono text-fg">{r.b}</div>
            <div className="p-3.5 text-right font-mono font-semibold text-lime">
              {r.delta}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Archetype({ quote, paras }: { quote: string; paras: string[] }) {
  return (
    <div className="border-l-2 border-lime bg-bg-raised p-7">
      <p className="font-serif text-xl italic leading-snug text-fg sm:text-2xl">{quote}</p>
      {paras.map((p, i) => (
        <p
          key={i}
          className="mt-5 text-[14.5px] leading-[1.75] text-fg-muted"
          dangerouslySetInnerHTML={{ __html: p }}
        />
      ))}
    </div>
  )
}

function Steal({
  kicker,
  body,
  chips,
}: {
  kicker: string
  body: string
  chips: string[]
}) {
  return (
    <div className="border border-line-strong bg-card p-7">
      <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-label text-lime-soft">
        <Zap size={14} strokeWidth={2} />
        {kicker}
      </div>
      <p
        className="mt-5 text-[14.5px] leading-[1.75] text-cream-dim"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      {chips.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="border border-line bg-bg px-3 py-1.5 font-mono text-[11px] text-fg-muted"
            >
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
  return (
    <div className="flex flex-col gap-4">
      {items.map((p, i) => (
        <div key={i} className="flex items-start gap-4 border-b border-line pb-4">
          <span
            className={`mt-0.5 shrink-0 border px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] ${
              p.c === 'HIGH'
                ? 'border-lime/40 text-lime'
                : p.c === 'MED'
                  ? 'border-cream/30 text-cream-dim'
                  : 'border-line-strong text-fg-subtle'
            }`}
          >
            {p.c}
          </span>
          <p className="text-[14.5px] leading-relaxed text-cream-dim">{p.t}</p>
        </div>
      ))}
    </div>
  )
}

function ReadSkip({ read, skip }: { read: string[]; skip: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
      <div className="bg-bg p-6">
        <div className="mb-5 flex items-center gap-2 font-mono text-[11px] tracking-label text-lime-soft">
          <Check size={14} strokeWidth={2.5} />
          READ THIS WEEK
        </div>
        <ul className="flex flex-col gap-4">
          {read.map((r, i) => (
            <li
              key={i}
              className="flex gap-3 text-[13.5px] leading-relaxed text-cream-dim"
            >
              <span className="mt-1.5 h-1 w-3 shrink-0 bg-lime" />
              <span dangerouslySetInnerHTML={{ __html: r }} />
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-bg p-6">
        <div className="mb-5 flex items-center gap-2 font-mono text-[11px] tracking-label text-danger">
          <X size={14} strokeWidth={2.5} />
          SKIP THIS WEEK
        </div>
        <ul className="flex flex-col gap-4">
          {skip.map((s, i) => (
            <li
              key={i}
              className="flex gap-3 text-[13.5px] leading-relaxed text-fg-muted"
            >
              <span className="mt-1.5 h-1 w-3 shrink-0 bg-danger/60" />
              <span dangerouslySetInnerHTML={{ __html: s }} />
            </li>
          ))}
        </ul>
      </div>
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
        <figcaption className="mt-4 font-mono text-[11px] tracking-label text-fg-subtle">
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
          <div className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-fg-subtle">
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
      <p className="text-[14px] leading-relaxed text-fg-muted">{body}</p>
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
      <div className="mb-5 font-mono text-[11px] tracking-label text-fg-subtle">
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
      return <Steal kicker={block.kicker} body={block.body} chips={block.chips} />
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
    default:
      return null
  }
}
