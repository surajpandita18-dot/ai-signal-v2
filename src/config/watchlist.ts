// The Watchlist — defensible institutional memory of the Indian AI market.
// Three living tables that compound across issues:
//   1. API price log         — frontier + Indic models in USD AND INR
//   2. Regulation status     — DPDP, RBI agent-payments, NPCI SBMD
//   3. Enterprise deal log   — recent Indian AI signings (vendor + value + beat)
//
// v1 — static config updated weekly. v2 will move to a `watchlist_rows`
// table + admin UI so the synthesizer can append automatically. For now:
// edit this file each Friday before publishing.
//
// Anchor: CLAUDE.md "structured trackers ... become defensible knowledge
// base." Audit findings: .claude/learnings-user-audit.md → "Weekly
// Watchlist tracker — biggest untapped move".

export type PriceRow = {
  // Provider + model row. `inr_per_m` is computed at edit time from
  // `usd_per_m` * the snapshot fx rate (recorded in WATCHLIST_META). Don't
  // try to live-fetch FX — the comparison week-over-week needs a stable
  // basis, and INR/USD volatility is part of the story you tell.
  vendor: string
  model: string
  context: 'input' | 'output'
  usd_per_m: number               // USD per 1M tokens
  inr_per_m: number               // INR per 1M tokens (at WATCHLIST_META.fx)
  delta_last_week: 'up' | 'down' | 'flat'
  delta_pct?: number              // optional week-over-week % move
  note?: string                   // ≤14 words context
}

export type RegulationRow = {
  policy: string                  // short name ("DPDP — Sensitive Categories")
  body: 'MeitY' | 'RBI' | 'NPCI' | 'SEBI' | 'TRAI' | 'Other'
  status: 'draft' | 'in-force' | 'consultation' | 'expected'
  last_update: string             // ISO date — when it last moved
  next_milestone?: string         // ≤18 words ("Final rules expected Q3 2026")
  builder_impact: string          // ≤24 words — what this means for your stack
}

export type DealRow = {
  buyer: string                   // "HDFC Bank", "Tata Communications"
  vendor: string                  // "Anthropic via TCS", "Sarvam direct"
  beat:
    | 'frontier-api'
    | 'india-infra'
    | 'regulation'
    | 'indic-models'
    | 'talent-comp'
    | 'enterprise-deals'
  value_inr_cr?: number           // contract value in INR crore, if disclosed
  signed: string                  // ISO date or "Q2 2026"
  note: string                    // ≤24 words — what's interesting
}

export const WATCHLIST_META = {
  // Edit weekly before publish. fx is the INR/USD rate used to compute
  // inr_per_m on PriceRow; keep stable for a quarter so deltas are
  // visible, not FX noise.
  updated: '2026-06-16',
  fx_inr_per_usd: 83.5,
  next_update: '2026-06-23',
}

export const PRICE_LOG: PriceRow[] = [
  {
    vendor: 'Anthropic',
    model: 'Claude 5 Sonnet',
    context: 'input',
    usd_per_m: 3.0,
    inr_per_m: 250.5,
    delta_last_week: 'flat',
    note: 'Post-Fable apology week — pricing held.',
  },
  {
    vendor: 'OpenAI',
    model: 'GPT-4o-mini',
    context: 'input',
    usd_per_m: 0.15,
    inr_per_m: 12.5,
    delta_last_week: 'down',
    delta_pct: -10,
    note: 'Codex+Ona acquisition framed as cost-down signal.',
  },
  {
    vendor: 'Google',
    model: 'Gemini 2.5 Flash',
    context: 'input',
    usd_per_m: 0.075,
    inr_per_m: 6.3,
    delta_last_week: 'flat',
    note: 'Cheapest frontier input — router default.',
  },
  {
    vendor: 'Sarvam AI',
    model: 'Sarvam-M (28B)',
    context: 'input',
    usd_per_m: 0.2,
    inr_per_m: 16.7,
    delta_last_week: 'flat',
    note: 'Cheap Indic slot inside a routed stack.',
  },
  {
    vendor: 'Anthropic',
    model: 'Claude 5 Sonnet',
    context: 'output',
    usd_per_m: 15.0,
    inr_per_m: 1252.5,
    delta_last_week: 'flat',
  },
  {
    vendor: 'OpenAI',
    model: 'GPT-4o',
    context: 'output',
    usd_per_m: 10.0,
    inr_per_m: 835.0,
    delta_last_week: 'down',
    delta_pct: -5,
  },
]

export const REGULATION_LOG: RegulationRow[] = [
  {
    policy: 'DPDP — Sensitive Categories Rules',
    body: 'MeitY',
    status: 'consultation',
    last_update: '2026-05-30',
    next_milestone: 'Final rules expected Q3 2026',
    builder_impact:
      'Agent prompt + output retention windows will be capped. Audit log + consent registry required before launch.',
  },
  {
    policy: 'RBI Agent-Initiated Payments',
    body: 'RBI',
    status: 'draft',
    last_update: '2026-06-04',
    next_milestone: 'Working group findings expected by August',
    builder_impact:
      'Per-spend-tier explicit consent + kill-switch SLA will become hard requirements. Plan now or rebuild later.',
  },
  {
    policy: 'NPCI SBMD Expansion (Standing Instructions)',
    body: 'NPCI',
    status: 'in-force',
    last_update: '2026-06-12',
    builder_impact:
      'Agent payments under SBMD only if explicit per-tier consent captured. Without it, technically unauthorized.',
  },
  {
    policy: 'SEBI AI Disclosure for Listed Cos',
    body: 'SEBI',
    status: 'expected',
    last_update: '2026-04-18',
    next_milestone: 'Discussion paper expected by year-end',
    builder_impact:
      'If you sell to listed Indian banks/insurers, expect quarterly AI-stack disclosure questions in 2027.',
  },
]

export const DEAL_LOG: DealRow[] = [
  {
    buyer: 'TCS (for BFSI customer)',
    vendor: 'Anthropic',
    beat: 'enterprise-deals',
    value_inr_cr: 42,
    signed: 'Q2 2026',
    note: 'Multi-year — now the canary deal everyone watches after the Fable regression.',
  },
  {
    buyer: 'HDFC Life',
    vendor: 'Sarvam AI',
    beat: 'indic-models',
    value_inr_cr: 12,
    signed: 'May 2026',
    note: 'Hindi-Tamil agent for claims intake — first big Indic-first prod deal.',
  },
  {
    buyer: 'Pine Labs',
    vendor: 'OpenAI (via Microsoft)',
    beat: 'enterprise-deals',
    value_inr_cr: 28,
    signed: 'June 2026',
    note: 'Agentic checkout platform — the ₹5L spend-cap reference architecture.',
  },
]
