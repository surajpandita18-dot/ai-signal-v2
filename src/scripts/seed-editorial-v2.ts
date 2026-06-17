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
      "Smart model routing became the default this week. If your stack says 'we run on Claude,' that line just turned into a liability slide.",
    explained_simply: {
      concept: 'LLM gateway routing',
      explanation:
        "Think of a restaurant kitchen with five cooks. One is a junior who can fry eggs; one is a Michelin chef who plates wagyu. The head chef reads each ticket and decides who cooks it — fast cook to the egg, slow expert to the wagyu. The router is software that does the same job for AI requests. It looks at a prompt and sends 'summarise this email' to Gemini Flash at ₹6 a million tokens, sends 'reason about this contract' to Claude at ₹250, sends Hindi support to Sarvam. The cook didn't change. The cost did — by about eighty percent, because you stopped paying steak prices for scrambled eggs.",
    },
    production_questions: [
      "Our router keeps picking Claude every time the prompt has a code block. Why?",
      "What's the cheapest eval you run before a router swap to catch regressions?",
      "Sarvam-M is 40% cheaper for Hindi tickets but our prompts have Claude XML. How fast can you port?",
    ],
  },

  // 22da6516 — "Anthropic's curbs just minted Sarvam's moat"
  '22da6516-f0cc-422b-a5ef-7a32dc6c138e': {
    signal_of_the_week:
      "US export curbs on Anthropic turned 'Sarvam is a backup' into 'Sarvam is your auditor-defensible primary.' Every Indian BFSI procurement deck written before Q3 is stale.",
    explained_simply: {
      concept: 'Sovereign AI inference',
      explanation:
        "Picture your bank's cash sitting in a vault in another country. One Tuesday morning you read that the country might lock the vault on national-security grounds. The fix is obvious — bring the vault home. Sovereign inference is the same move for AI. The model weights, the GPUs running them, the audit logs of every prompt all sit inside your borders. Until this week the vault metaphor felt theoretical. With US export controls hitting Anthropic, the vault now matters in a concrete way. Sarvam on Yotta isn't just cheaper. It's a model your RBI auditor can physically walk over and look at.",
    },
    production_questions: [
      "Claude for reasoning, Sarvam-M for Indic — anyone solved the audit log split cleanly?",
      "Need a weekly Sarvam-M vs Claude eval on BFSI tasks. Anyone got a cheap rig?",
      "Customer prompts in Anthropic's training pool after July 8. What's our DPDP exposure?",
    ],
  },

  // 9c642302 — "Washington just killed your Claude stack"
  '9c642302-21f2-4563-ae9b-7116478aadda': {
    signal_of_the_week:
      "Treasury just turned 'we standardized on Claude' into a foreign-model exposure line item on your 2027 risk register. The fix is the same one banks have run for decades: add a second source.",
    explained_simply: {
      concept: 'Concentration risk for AI vendors',
      explanation:
        "For decades, banks have watched a number called concentration risk. It works like this: if one company owes you thirty percent of all your outstanding loans, you don't have a loan book, you have a bet on one company. The lens is borrowed from agriculture before that — you don't grow only one crop, because one bad season ends your farm. RBI just pointed the same lens at AI. If ninety percent of your inference runs through Claude and on a Friday Washington tightens export controls, your loan-decision system breaks by Monday. The lens is borrowed. The fix is borrowed too. Add a second sovereign provider. Document the failover. Run an eval that proves the two are substitutable. The bank version has worked for a century. The AI version needs to ship by the next audit.",
    },
    production_questions: [
      "If Treasury flags Claude mid-quarter, what's our failover SLA? Anyone wrote the runbook?",
      "Switchability test for the eval rig — what's a fair regulator-friendly version?",
      "MSA renewal next month. Need export-control exit clause language — anyone got it?",
    ],
  },

  // d6037c54 — "Meta leased your distribution stack"
  'd6037c54-b7f2-4f10-aafa-a1bbb0beda73': {
    signal_of_the_week:
      "Meta-Reliance, Visa-OpenAI, and OpenAI's price-cut leak landed the same week. Your token-cost moat just died on the same week your placement moat opened up.",
    explained_simply: {
      concept: 'The placement race',
      explanation:
        "Picture two shops side by side on a busy market street. Shop A has cheaper goods. Shop B is the only one with a door opening onto the foot-traffic side of the street. Over the next year, shop A's cost edge gets matched as wholesalers race each other to the bottom. But shop B's door doesn't move. The door is the moat. That's what happened in AI this week. The model cost edge — your shop A — just commoditised: OpenAI's leaked price cut, Meta leasing one gigawatt of India DC with Reliance, Visa wiring ChatGPT directly into checkout. Meanwhile the doors onto the busy street — WhatsApp, ChatGPT, Pine Labs — are being built by other people. Builders will increasingly ship through someone else's door, not their own.",
    },
    production_questions: [
      "OpenAI cuts 70% in Q1. Which part of our unit economics breaks first?",
      "Visa-on-ChatGPT turns checkout into an agent surface. Lightest integration to test?",
      "If 100M users meet AI inside WhatsApp first, do we still need our app?",
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
