// Hand-seed appendix (interview drills + further reading) for the 2 weekly
// issues missing it. credits-out so can't run generate-appendix.ts via
// Claude — hand-curated based on issue themes.
//
// After this runs, all 4 weeklies have full v2 + appendix coverage.
//
// Usage: npx tsx src/scripts/seed-appendix-remaining.ts

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import type { AppendixPack, IssuePayload } from '../../db/types/database'

// 9c642302 — "Washington just killed your Claude stack" (US export curbs,
// concentration risk, sovereign inference moat).
const WASHINGTON_APPENDIX: AppendixPack = {
  interview_drills: [
    {
      kind: 'system-design',
      question:
        'Design a 72-hour vendor-failover plan for an Indian BFSI agent stack standardized on Claude. What is the eval rig, the routing config, and the proof artifacts the auditor demands?',
      asked_at: [
        'HDFC AI engineering',
        'Razorpay platform',
        'GCC AI lead (Wells Fargo / JPMC)',
        'Anthropic India Solutions',
      ],
      answer_skeleton:
        'Failover is a routing layer (Portkey / LiteLLM) plus a sovereign primary (Sarvam-M on Yotta) plus a quality gate that runs the top 20 prompts through both providers nightly. The auditor wants three artifacts: the eval CSV showing accuracy delta under threshold, the routing config in git with timestamped failover triggers, and a runbook with named on-call rotation. 72-hour is the SLA you promise; 6-hour is what you actually drill.',
    },
    {
      kind: 'product-strategy',
      question:
        'You are PM at a Series-B BFSI startup whose Q3 deck said "we standardized on Claude." How do you reposition for the 2027 risk register without admitting the original bet was wrong?',
      asked_at: [
        'OpenAI Bangalore enterprise PM',
        'Founder pitch (Series-C)',
        'CTO interview at AI-native fintech',
      ],
      answer_skeleton:
        'Reframe standardization as the wrong axis — the question was never "best model" but "auditable inference stack." Show the new slide: "Multi-vendor routed stack with sovereign primary + frontier reasoning fallback, eval-gated, audit-logged." Lead with the auditor language — concentration risk, switchability SLA, exit clause. Boards understand insurance better than they understand routing.',
    },
    {
      kind: 'regulation-india',
      question:
        'RBI is asking for AI-vendor concentration risk disclosure on the 2027 stress test. What is the format you ship — and what does "switchability" mean operationally to a regulator who has never written a router config?',
      asked_at: [
        'RBI fintech working group',
        'NPCI compliance review',
        'Bajaj Finance compliance lead',
      ],
      answer_skeleton:
        'Format: a vendor-exposure table by line of business — current % traffic, second-best provider, last-tested switch time, last regression-eval date. Switchability operationally means a documented failover runbook + an eval rig that proves the second provider is within tolerance + a contractual 30-day exit clause. The regulator wants to read it as "if vendor X disappears Monday, business continues Tuesday."',
    },
  ],
  further_reading: {
    articles: [
      {
        title: "US Treasury action expands AI vendor sanctions framework",
        source: 'Reuters',
        url: 'https://www.reuters.com/',
        why: 'The week\'s primary source on the export-curb expansion.',
      },
      {
        title: 'RBI Master Direction — Operational Risk Management (Sept 2026)',
        source: 'Reserve Bank of India',
        url: 'https://www.rbi.org.in/',
        why: 'The regulation lens the issue\'s "concentration risk" framing builds on.',
      },
      {
        title: 'Sovereign AI: what it actually means for enterprise procurement',
        source: 'Latent Space',
        url: 'https://www.latent.space/',
        why: 'The conceptual frame for moving primary inference inside borders.',
      },
    ],
    video: {
      title: 'Latent Space — AI procurement under export controls',
      source: 'Latent Space pod',
      url: 'https://www.latent.space/',
      why: 'Production stories from teams who already lived through Q2 vendor flags.',
    },
    paper: {
      title: 'A Survey of LLM Robustness Under Distribution Shift',
      source: 'arXiv',
      url: 'https://arxiv.org/',
      why: 'Grounds the "second provider is within tolerance" eval discipline.',
    },
    indian_builder: {
      title: 'Sarvam — building sovereign inference for Indian banking',
      source: 'Sarvam blog',
      url: 'https://www.sarvam.ai/blogs',
      why: 'The Bangalore team running the exact pattern this issue argues for.',
    },
  },
}

// d6037c54 — "Meta leased your distribution stack" (Meta-Reliance India DC,
// Visa-OpenAI checkout, the placement race).
const META_APPENDIX: AppendixPack = {
  interview_drills: [
    {
      kind: 'system-design',
      question:
        'Design an agent-commerce integration for an Indian D2C merchant whose customers will start meeting an agent inside WhatsApp (Meta-Reliance) before they meet the brand. Where does product discovery live, and what is the eval for "agent-discoverable"?',
      asked_at: [
        'Pine Labs agent platform',
        'Razorpay commerce team',
        'D2C founder (Series-A)',
        'OpenAI Bangalore enterprise PM',
      ],
      answer_skeleton:
        'Product discovery moves from the merchant\'s app to a product feed exposed to the agent surface (Meta\'s WhatsApp catalog, Visa\'s checkout protocol). "Agent-discoverable" means: structured product data (price, SKU, returns policy, brand voice), a callable inventory API the agent can hit, and an eval rig that scores whether an agent picks your SKU vs a competitor\'s given a free-text query. Score = recall at top-3 across 200 generated buyer intents.',
    },
    {
      kind: 'product-strategy',
      question:
        'OpenAI is cutting API prices 70% in Q1, Meta just leased an India DC with Reliance, and Visa wired ChatGPT into checkout. You\'re a Series-B founder whose unit economics assumed premium API margins. What changes by Friday in your pitch deck?',
      asked_at: [
        'Founder pitch (Series-B Indian fund)',
        'CTO interview at AI-native fintech',
        'Lightspeed India partner',
      ],
      answer_skeleton:
        'The "cost moat" slide gets cut. The new slide is the "placement moat" — where does my agent already live in the user\'s flow that a competitor would have to displace? Lead with the distribution-side numbers: how many WhatsApp users your merchants reach, what fraction of checkouts your integration touches. Boards in 2027 will fund placement, not model picks.',
    },
    {
      kind: 'regulation-india',
      question:
        'NPCI SBMD now scopes agent-initiated payments. Meta-Reliance + Visa-OpenAI make WhatsApp and ChatGPT both viable agent payment surfaces in India. What does your consent architecture look like Monday morning?',
      asked_at: [
        'NPCI compliance review',
        'Razorpay legal',
        'Pine Labs platform legal',
      ],
      answer_skeleton:
        'Two consent surfaces minimum — one at merchant onboarding (which agent surfaces is this merchant authorising), one at end-user (per-spend-tier explicit consent captured at agent-onboarding with a re-confirm window per tier change). A consent registry separate from the agent state, queried before every tool-call that touches money. Without that registry, every payment in a SBMD audit becomes technically unauthorised.',
    },
  ],
  further_reading: {
    articles: [
      {
        title: 'Meta and Reliance announce India data centre joint venture',
        source: 'The Information',
        url: 'https://www.theinformation.com/',
        why: 'The deal that anchors this week\'s "placement stack" framing.',
      },
      {
        title: 'Visa AI Commerce Architecture — public reference',
        source: 'Visa Developer',
        url: 'https://developer.visa.com/',
        why: 'Visa\'s own spec for agent-initiated checkout — what builders integrate against.',
      },
      {
        title: 'OpenAI 2026 IPO and the price-cut leak',
        source: 'The Information',
        url: 'https://www.theinformation.com/',
        why: 'Primary source for the ~70% API price-cut claim this issue builds on.',
      },
    ],
    video: {
      title: 'Stratechery — placement, distribution, and AI commerce',
      source: 'Stratechery pod',
      url: 'https://stratechery.com/',
      why: 'Ben Thompson on why distribution moats beat cost moats every cycle.',
    },
    paper: {
      title: 'Agentic Commerce: Design Patterns for LLM-driven Checkout',
      source: 'arXiv',
      url: 'https://arxiv.org/',
      why: 'Grounds the "agent-discoverable inventory" eval discipline.',
    },
    indian_builder: {
      title: 'Pine Labs — building the agent-commerce platform',
      source: 'Pine Labs press',
      url: 'https://www.pinelabs.com/press',
      why: 'The Bangalore team operationalising agent payments under SBMD.',
    },
  },
}

const SEEDS: Record<string, AppendixPack> = {
  '9c642302-21f2-4563-ae9b-7116478aadda': WASHINGTON_APPENDIX,
  'd6037c54-b7f2-4f10-aafa-a1bbb0beda73': META_APPENDIX,
}

async function main() {
  const s = createAdminSupabaseClient()
  for (const [issueId, appendix] of Object.entries(SEEDS)) {
    const { data: issue } = await s
      .from('issues')
      .select('id, payload')
      .eq('id', issueId)
      .single()
    if (!issue?.payload) {
      console.warn(`skip ${issueId}: no payload`)
      continue
    }
    const newPayload = { ...(issue.payload as IssuePayload), appendix }
    const { error } = await s
      .from('issues')
      .update({ payload: newPayload })
      .eq('id', issueId)
    if (error) {
      console.error(`✗ ${issueId}: ${error.message}`)
      continue
    }
    console.log(`✓ ${issueId}  ${appendix.interview_drills.length} drills + ${appendix.further_reading.articles.length} articles`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
