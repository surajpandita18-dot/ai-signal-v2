// One-off script: write hand-curated `appendix` blocks into the two
// pre-rebuild issues (38201c30 weekly + 9eeaa09c deep-dive). Round 2
// synthesizer rewrite will generate these from payload context; until then,
// hand-curated keeps the appendix shipping today.
//
// Usage: npx tsx src/scripts/seed-appendix.ts

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import type { AppendixPack, IssuePayload, DeepDivePayload } from '../../db/types/database'

// Weekly 38201c30 — "The router just ate vendor lock-in"
// Beats: frontier-api, india-infra, regulation, indic-models, talent-comp,
// enterprise-deals. INR delta: ₹62L/month. Steal: Portkey gateway.
const WEEKLY_APPENDIX: AppendixPack = {
  interview_drills: [
    {
      kind: 'system-design',
      question:
        'Design a multi-vendor LLM router for a 10M-token/day Indian SaaS handling English + Hindi + Tamil. Where does p95 break first, what is the eval gate, and what is the fallback ladder when Claude 5xx-spikes?',
      asked_at: [
        'Sarvam Sr. AI Eng',
        'Anthropic India Solutions',
        'Krutrim platform',
        'GCC AI lead',
      ],
      answer_skeleton:
        'Start with the routing tier (Portkey/LiteLLM, config-driven, conditional on language + intent), then the eval gate (top-20 prompt deterministic scorer running per swap), then the fallback ladder (Claude → GPT-4o → Sarvam M, with circuit-breaker on guardrail-block / 429 / timeout). p95 breaks first on the Indic prompts because Claude latency is US-routed — that is where you route to Sarvam-M and accept a quality tradeoff your gate measures.',
    },
    {
      kind: 'product-strategy',
      question:
        'Walk me through the framework you would use to convince a Series-B board to de-standardize from Claude. What does the new slide replacing "We run on Claude" actually say?',
      asked_at: [
        'OpenAI Bangalore PM',
        'Founder pitch (Series-B Indian fund)',
        'CTO interview at AI-native startup',
      ],
      answer_skeleton:
        'Frame the standardization as a 2024 decision the market has repriced — show the Fable 5 regression as the inflection point, not a one-off. The new slide reads: "Routed stack across Claude, GPT, Gemini, Sarvam with a quality gate — 60% lower inference cost, zero rip-cost on regression." Lead with the rip-cost line; boards understand insurance better than they understand routing.',
    },
    {
      kind: 'regulation-india',
      question:
        'How would you architect a DPDP-defensible agentic checkout flow with a kill-switch SLA you can commit to RBI? What is the audit trail and what happens on guardrail-block in flight?',
      asked_at: [
        'Razorpay AI lead',
        'Pine Labs platform',
        'NPCI SBMD review',
        'GCC AI compliance lead',
      ],
      answer_skeleton:
        'Treat every agentic action as a logged, reversible transaction with explicit consent capture per spend tier. Kill-switch SLA is sub-second to halt new actions + 5-minute reverse window. On guardrail-block, the agent surrenders to a human-in-the-loop queue with the full prompt + tool-call trace appended — DPDP requires the data subject can audit the decision path.',
    },
  ],
  further_reading: {
    articles: [
      {
        title:
          'Smart model routing is the new default for senior AI engineers',
        source: 'Pragmatic Engineer',
        url: 'https://newsletter.pragmaticengineer.com/',
        why: 'The Friday piece that named the shift this issue tracks.',
      },
      {
        title: 'Claude 5 Fable safeguards retrospective',
        source: 'Anthropic',
        url: 'https://www.anthropic.com/news',
        why: 'Anthropic\'s own framing of the regression — read for what they DON\'T say.',
      },
      {
        title: 'Portkey AI gateway docs — fallbacks + conditional routing',
        source: 'Portkey',
        url: 'https://docs.portkey.ai/docs/product/ai-gateway',
        why: 'The exact config a senior eng would copy this sprint.',
      },
    ],
    video: {
      title: 'Latent Space — Building the model-agnostic stack',
      source: 'Latent Space pod',
      url: 'https://www.latent.space/',
      why: 'Engineers who already did this, what broke first.',
    },
    paper: {
      title: 'RouteLLM: Learning to Route LLMs with Preference Data',
      source: 'arXiv 2406.18665',
      url: 'https://arxiv.org/abs/2406.18665',
      why: 'The eval-gate math behind a routed stack, not vibes.',
    },
    indian_builder: {
      title: 'Portkey @ Bangalore — how they ship the gateway in prod',
      source: 'Rohit Agarwal (Portkey co-founder, X)',
      url: 'https://twitter.com/jumbld',
      why: 'A Bangalore founder shipping the exact pattern this issue argues for.',
    },
  },
}

// Deep-dive 9eeaa09c — "Your agentic checkout is a ₹5L bet"
// Theme: agentic spend caps, DPDP audit trail, ₹5L FTP limit, Pine Labs framing.
const DEEPDIVE_APPENDIX: AppendixPack = {
  interview_drills: [
    {
      kind: 'system-design',
      question:
        'You are wiring an LLM agent into checkout for an Indian D2C brand. Spend cap is ₹5L per agent-session per day. Design the kill-switch + audit trail + reversal window. What happens when the agent loops?',
      asked_at: [
        'Razorpay platform eng',
        'Pine Labs agent platform',
        'Indian D2C CTO',
      ],
      answer_skeleton:
        'Spend cap is a hard rate-limit at the gateway (per-session, per-merchant, per-tier), not a soft model instruction — agents lie. Audit trail captures every tool call + prompt + RBAC context with a 7-year retention. Reversal window is 5 minutes via a sweeper job that surfaces unconfirmed actions to a human queue. On loop: circuit-breaker after 3 sequential same-tool calls, freeze the session, page on-call.',
    },
    {
      kind: 'product-strategy',
      question:
        'You are pitching an agentic checkout to a 2026 Indian D2C buyer who reads about agent fraud weekly. What is the trust delta you ship in the first 90 days, and what is the demo move that closes the contract?',
      asked_at: [
        'OpenAI Bangalore enterprise PM',
        'D2C founder (Series-A)',
        'Pine Labs product lead',
      ],
      answer_skeleton:
        'Trust delta: lower the spend cap from ₹5L → ₹50K for the first 30 days, then graduate based on a deterministic audit score. The demo move is showing the buyer their own data + the kill-switch — let them trigger it live. Close on the agent SLA, not the agent intelligence.',
    },
    {
      kind: 'regulation-india',
      question:
        'NPCI just expanded SBMD (Standing Instructions). How does that interact with agent-initiated payments, and what is the consent architecture you ship before legal blocks the launch?',
      asked_at: [
        'NPCI compliance review',
        'Razorpay legal',
        'RBI agent-payments working group',
      ],
      answer_skeleton:
        'Agent-initiated payments fall under SBMD only if the merchant collected explicit per-spend-tier consent at agent-onboarding, with a re-confirm window per tier change. Architecture: a consent registry separate from the agent state, queried before every tool-call that touches money. Without that, every payment is technically unauthorized.',
    },
  ],
  further_reading: {
    articles: [
      {
        title: 'Simon Willison — Agents are going to scale up runaway costs',
        source: 'simonwillison.net',
        url: 'https://simonwillison.net/2024/Aug/20/agents/',
        why: 'The blog post this deep-dive\'s "the assumption" pull-quote builds on.',
      },
      {
        title: 'Pine Labs — Agent commerce platform launch',
        source: 'Pine Labs press',
        url: 'https://www.pinelabs.com/press',
        why: 'The India-shipping reference case for agentic checkout in 2026.',
      },
      {
        title: 'NPCI SBMD expansion circular',
        source: 'NPCI',
        url: 'https://www.npci.org.in/what-we-do/standing-instructions',
        why: 'The regulation that flipped agent payments from grey to scoped.',
      },
    ],
    video: {
      title: 'Latent Space — Tool use, cost overruns, and agent ROI',
      source: 'Latent Space pod',
      url: 'https://www.latent.space/',
      why: 'Production debug stories from teams shipping agents at scale.',
    },
    paper: {
      title: 'Qwen3-4B retail tool-use benchmark',
      source: 'arXiv (Alibaba Cloud)',
      url: 'https://arxiv.org/abs/2505.09388',
      why: 'The 4B-param tool-use evidence under-pinning the cost math here.',
    },
    indian_builder: {
      title: 'Sarvam-1 + agent harness — building tool-use in production',
      source: 'Sarvam blog',
      url: 'https://www.sarvam.ai/blogs',
      why: 'A Bangalore team running the exact tool-use loop discussed.',
    },
  },
}

async function main() {
  const s = createAdminSupabaseClient()

  const weekly = await s
    .from('issues')
    .select('id, payload')
    .eq('id', '38201c30-8db1-422e-a29e-34c70b07b988')
    .single()
  if (weekly.error || !weekly.data) throw new Error(`weekly not found: ${weekly.error?.message}`)
  const weeklyPayload = weekly.data.payload as IssuePayload
  const newWeekly = { ...weeklyPayload, appendix: WEEKLY_APPENDIX }
  const w = await s
    .from('issues')
    .update({ payload: newWeekly })
    .eq('id', '38201c30-8db1-422e-a29e-34c70b07b988')
  if (w.error) throw new Error(`weekly update: ${w.error.message}`)
  console.log('✓ weekly appendix written')

  const dd = await s
    .from('issues')
    .select('id, payload')
    .eq('id', '9eeaa09c-d680-4d0c-bd96-8ab930f687fb')
    .single()
  if (dd.error || !dd.data) throw new Error(`deep-dive not found: ${dd.error?.message}`)
  const ddPayload = dd.data.payload as unknown as DeepDivePayload
  // Deep-dive payload is DeepDivePayload (different shape); store appendix
  // under the same key — the issue page checks payload.appendix regardless.
  const newDd = {
    ...(ddPayload as object),
    appendix: DEEPDIVE_APPENDIX,
  } as unknown as DeepDivePayload
  const d = await s
    .from('issues')
    .update({ payload: newDd })
    .eq('id', '9eeaa09c-d680-4d0c-bd96-8ab930f687fb')
  if (d.error) throw new Error(`deep-dive update: ${d.error.message}`)
  console.log('✓ deep-dive appendix written')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
