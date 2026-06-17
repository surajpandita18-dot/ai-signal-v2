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
        "Picture a restaurant kitchen with five chefs of different skill levels. The cheapest cook handles 'fry an egg'; the most expensive one handles 'plate the wagyu'. The head chef sees each ticket and decides who works it — that's the router. For LLMs, that head chef is software (Portkey, LiteLLM): it reads each prompt and sends simple ones to Gemini Flash at ₹6 per million tokens, hard reasoning to Claude at ₹250, multilingual to Sarvam. Same kitchen, same diners — your bill drops 80% because you stopped paying steak prices for scrambled eggs.",
    },
    production_questions: [
      "Router keeps routing every code block to Claude. Why?",
      "Cheapest eval gate before a router swap — what are you using?",
      "Sarvam-M is 40% cheaper but our prompts have Claude XML scaffolding. Port without rewriting?",
    ],
  },

  // 22da6516 — "Anthropic's curbs just minted Sarvam's moat"
  '22da6516-f0cc-422b-a5ef-7a32dc6c138e': {
    signal_of_the_week:
      "US export curbs on Anthropic just turned 'Sarvam is a backup' into 'Sarvam is your auditor-defensible primary' — every Indian BFSI procurement deck written before Q3 is stale.",
    explained_simply: {
      concept: 'Sovereign AI inference',
      explanation:
        "Picture your bank's cash sitting in a vault in another country. One Monday you wake up to find that country might lock the vault on national-security grounds. The fix is obvious — bring the vault home. Sovereign inference is the same move: the model weights, the GPUs running them, the audit logs of every prompt, all inside your borders. When US export controls hit Anthropic this week, the vault metaphor stopped being theoretical — Sarvam on Yotta is now a model your RBI auditor can physically walk over and point at.",
    },
    production_questions: [
      "Claude for reasoning, Sarvam-M for Indic — how are you splitting the audit logs?",
      "Sarvam-M vs Claude on BFSI tasks — anyone got an eval set that runs cheap weekly?",
      "Customer prompts landed in Anthropic training pool after the July 8 change. DPDP exposure?",
    ],
  },

  // 9c642302 — "Washington just killed your Claude stack"
  '9c642302-21f2-4563-ae9b-7116478aadda': {
    signal_of_the_week:
      "Treasury just made 'we standardized on Claude' a foreign-model exposure line item on your 2027 risk register — the playbook is to add a second sovereign provider before the next audit.",
    explained_simply: {
      concept: 'Concentration risk for AI vendors',
      explanation:
        "Banks have always tracked concentration risk — too much money lent to one borrower, one country, one currency. The lens is simple: when one input source can swing your whole P&L, you carry that risk on the books. RBI just pointed the same lens at AI. If 90% of your inference runs on Claude and Washington tightens export controls on a Friday, your loan-decision system breaks by Monday. The fix is the same one bankers have run for decades: add a second source, document the switch protocol, prove the eval that says the two are substitutable.",
    },
    production_questions: [
      "If Treasury flags Claude mid-quarter, what's our failover SLA? Anyone wrote the runbook?",
      "Switchability test for the eval rig — what does a regulator-friendly version look like?",
      "MSA renewal next month. Export-control exit clause — copy-paste language from someone?",
    ],
  },

  // d6037c54 — "Meta leased your distribution stack"
  'd6037c54-b7f2-4f10-aafa-a1bbb0beda73': {
    signal_of_the_week:
      "Meta-Reliance plus Visa-on-ChatGPT plus OpenAI's price-cut leak landed the same week — your token-cost moat just died on the same week your placement moat opened up.",
    explained_simply: {
      concept: 'The placement race',
      explanation:
        "Think of two adjacent shops on a busy street. Shop A has cheaper goods; shop B is the only one with a door opening onto the foot-traffic side. Over time, A's cost edge gets matched while B's door doesn't move. That's what happened in AI this week. The model cost edge — your shop A — just commoditised: OpenAI's leaked price cut, Meta-Reliance leasing 1 GW of India DC, Visa wiring ChatGPT into checkout. Meanwhile the doors onto the foot-traffic side — WhatsApp, ChatGPT, Pine Labs — are being built by other people. Builders now ship through someone else's door, not their own.",
    },
    production_questions: [
      "OpenAI cuts 70% in Q1 — what part of our unit economics breaks first?",
      "Visa on ChatGPT turns checkout into an agent surface. Lightest integration to test?",
      "If the next 100M users meet AI inside WhatsApp before our product, do we even need our app?",
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
