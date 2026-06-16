// Hand-seed editorial-v2 fields (signal_of_the_week, explained_simply,
// production_questions) onto the existing 4 weekly issues so the new
// sections render TODAY. The synthesizer prompt change populates these
// automatically on next generation; this is the one-off backfill.
//
// Usage: npx tsx src/scripts/seed-editorial-v2.ts
//
// Each issue's seed content was hand-curated from the actual payload
// (synthesizer round 2 will regenerate properly when credits return).

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import type { IssuePayload } from '../../db/types/database'

interface V2Seed {
  signal_of_the_week: string
  explained_simply: { concept: string; explanation: string }
  production_questions: string[]
}

const SEEDS: Record<string, V2Seed> = {
  // 38201c30 — "The router just ate vendor lock-in"
  '38201c30-8db1-422e-a29e-34c70b07b988': {
    signal_of_the_week:
      "Smart model routing just became the default — your single-vendor Claude stack is now a 2024 architecture decision the market has repriced.",
    explained_simply: {
      concept: 'LLM gateway routing',
      explanation:
        "Imagine a restaurant kitchen with five chefs of different skill levels. The cheapest cook handles 'fry an egg'; the expensive one handles 'plate the wagyu'. A router is the head chef who sees each ticket coming in and decides who works it. For LLMs, the router (Portkey, LiteLLM) reads each prompt and routes simple ones to Gemini Flash at ₹6 per million tokens, hard reasoning to Claude at ₹250, multilingual to Sarvam. Your bill drops 80% because you stopped paying steak prices for scrambled eggs.",
    },
    production_questions: [
      "Our routing config keeps hitting the Claude default when the prompt has a code block — how do we detect intent reliably without adding a classifier round-trip?",
      "What's the cheapest eval gate we can run before a router swap that catches quality regressions without slowing tail latency past 200ms?",
      "Sarvam-M is 40% cheaper for Hindi support tickets but our prompts have Claude-tuned XML scaffolding — what's the fastest port without a full prompt rewrite?",
    ],
  },

  // 22da6516 — "Anthropic's curbs just minted Sarvam's moat"
  '22da6516-f0cc-422b-a5ef-7a32dc6c138e': {
    signal_of_the_week:
      "US export curbs on Anthropic just turned 'Sarvam is a backup' into 'Sarvam is your auditor-defensible primary' — every Indian BFSI procurement deck written before Q3 is stale.",
    explained_simply: {
      concept: 'Sovereign AI inference',
      explanation:
        "Imagine your bank kept all its cash in a vault in another country, then woke up to find that country might lock the vault on national-security grounds. Sovereign inference is keeping the vault inside your own borders — the model, the GPUs, the audit logs. For Indian BFSI, this stopped being 'nice to have' the day US export controls hit Anthropic. Sarvam running on Yotta isn't just cheaper; it's a model your RBI auditor can physically point at.",
    },
    production_questions: [
      "Our agent loop calls Claude for reasoning and Sarvam-M for Indic — how do we cleanly separate audit logs by jurisdiction without rebuilding our observability stack?",
      "What's a realistic eval set to compare Sarvam-M vs Claude on BFSI tasks (loan-doc parsing, KYC summarisation) that we can run weekly without breaking the bank?",
      "Anthropic's data-collection change on July 8 — are we now technically exposed under DPDP Section 8 if a customer prompt lands in their training pool, and what's the contract redline?",
    ],
  },

  // 9c642302 — "Washington just killed your Claude stack"
  '9c642302-21f2-4563-ae9b-7116478aadda': {
    signal_of_the_week:
      "Treasury just made 'we standardized on Claude' a foreign-model exposure line item on your 2027 risk register — the playbook is to add a second sovereign provider before the next audit.",
    explained_simply: {
      concept: 'Concentration risk for AI vendors',
      explanation:
        "Banks have always had concentration risk — too much exposure to one borrower, one country, one currency. RBI just extended the same lens to AI vendors. If 90% of your inference runs on Claude and Washington tightens export controls, your loan-decision system can break overnight. The fix is the same as the bank fix: a second sovereign provider, a documented switch protocol, and an eval rig that proves they're substitutable. Boring. Necessary. Auditable.",
    },
    production_questions: [
      "If Treasury flags a vendor mid-quarter, how fast can our agent layer fall over to a second provider without an outage — and where's the runbook auditors will ask to see?",
      "Our eval rig benchmarks accuracy but not 'switchability' — what's a fair concentration-risk test that proves to a regulator we can swap providers in 72 hours?",
      "How do we structure MSAs now so a future export-control flag doesn't lock us into 12 months of contractual exposure to a vendor our compliance team just disowned?",
    ],
  },

  // d6037c54 — "Meta leased your distribution stack"
  'd6037c54-b7f2-4f10-aafa-a1bbb0beda73': {
    signal_of_the_week:
      "Meta-Reliance plus Visa-on-ChatGPT plus OpenAI's price-cut leak landed the same week — your token-cost moat just died on the same week your placement moat opened up.",
    explained_simply: {
      concept: 'The placement race',
      explanation:
        "Cost moats die when the underlying tech commoditises. Placement moats — being where the user already is — only widen. Meta leasing a 1 GW India DC from Reliance, and Visa wiring ChatGPT into agent-led checkout, is the same move: control the surface where the user decides. For builders, this means the question stops being 'whose model do I run?' and starts being 'on whose surface does my agent already live?' One is becoming free; the other is the new fight.",
    },
    production_questions: [
      "If OpenAI cuts API prices 70% in Q1, what part of our unit economics breaks first — the inference margin we already amortise, or the customer-acquisition math we built around premium API tiers?",
      "Visa on ChatGPT turns checkout into an agent surface — what's the lightest-weight integration we can ship to test whether our merchants want their inventory routable from agents?",
      "Meta-Reliance is a placement deal more than an infra deal — how does our distribution strategy change if the next 100M Indian users meet AI inside WhatsApp before they meet our product?",
    ],
  },
}

async function main() {
  const s = createAdminSupabaseClient()
  for (const [issueId, seed] of Object.entries(SEEDS)) {
    const { data: issue } = await s
      .from('issues')
      .select('id, payload')
      .eq('id', issueId)
      .single()
    if (!issue?.payload) {
      console.warn(`skip ${issueId}: no payload`)
      continue
    }
    const newPayload = {
      ...(issue.payload as IssuePayload),
      signal_of_the_week: seed.signal_of_the_week,
      explained_simply: seed.explained_simply,
      production_questions: seed.production_questions,
    }
    const { error } = await s
      .from('issues')
      .update({ payload: newPayload })
      .eq('id', issueId)
    if (error) {
      console.error(`✗ ${issueId}: ${error.message}`)
      continue
    }
    console.log(`✓ ${issueId}  ${seed.signal_of_the_week.slice(0, 60)}…`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
