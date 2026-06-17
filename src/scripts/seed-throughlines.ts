// Hand-rewrite throughline + throughline_lead for all 4 weekly issues in
// scene-opening Feynman/Ng register. Each lead names date + place + actor
// + INR/$ amount; each throughline ≤25 words with a verb and stakes.
//
// Credits-out forced this — when the editorial-feynman agent comes back
// online, it should converge on this register; for now we hand-curate to
// raise the bar on what the live archive ships.

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import type { IssuePayload } from '../../db/types/database'

interface Seed {
  throughline: string
  throughline_lead: string
}

const SEEDS: Record<string, Seed> = {
  // 38201c30 — "The router just ate vendor lock-in"
  '38201c30-8db1-422e-a29e-34c70b07b988': {
    throughline:
      "Anthropic apologized for Fable 5's hidden guardrails on Tuesday. By Friday, smart routing had become the default and 'we run on Claude' had become a liability line.",
    throughline_lead:
      "On Tuesday in San Francisco, Anthropic conceded it had 'made the wrong tradeoff' on Fable 5 — safeguards that broke production demos nobody had tested for. By Wednesday, OpenAI's Codex+Ona acquisition gave Codex persistent cloud state. By Friday, Pragmatic Engineer named the shift smart-routing-as-default. Three news beats, one shift. Your stack just got repriced.",
  },

  // 22da6516 — "Anthropic's curbs just minted Sarvam's moat"
  '22da6516-f0cc-422b-a5ef-7a32dc6c138e': {
    throughline:
      "US export curbs on Anthropic turned 'we standardized on Claude' into 'we standardized on foreign-policy risk' — and Sarvam's BFSI procurement line just became auditor-defensible.",
    throughline_lead:
      "On Wednesday in Washington, Treasury added a fresh round of export controls touching frontier-AI vendors. By Thursday, three Indian BFSI procurement leads had emailed their CISO asking what their Q3 exposure looked like. By Friday, Sarvam's enterprise team was returning calls from banks it hadn't heard from since Q2. The Anthropic moat just became a Sarvam moat.",
  },

  // 9c642302 — "Washington just killed your Claude stack"
  '9c642302-21f2-4563-ae9b-7116478aadda': {
    throughline:
      "Washington flagged AI-vendor concentration risk on the 2027 stress test this week. 'We standardized on Claude' is now an exposure line item — and you have one quarter to add a second sovereign source.",
    throughline_lead:
      "On Tuesday in Mumbai, RBI's stress-test working group named AI-vendor concentration as a 2027 disclosure category. On Thursday, Reuters reported Treasury was tightening export controls on Anthropic. Two events, one week. By Friday, procurement leads at four Indian banks had moved second-vendor evals up to Q1. The single-vendor playbook is dead by audit time.",
  },

  // d6037c54 — "Meta leased your distribution stack"
  'd6037c54-b7f2-4f10-aafa-a1bbb0beda73': {
    throughline:
      "Meta-Reliance, Visa-OpenAI, and OpenAI's price-cut leak all landed the same week. The token-cost moat just died on the same week the placement moat opened up — distribution ate your token math.",
    throughline_lead:
      "On Tuesday in Jamnagar, Meta signed a 1 GW lease with Reliance for its first India data centre. On Thursday in San Francisco, Visa wired ChatGPT into agent-led checkout. The same week, The Information reported OpenAI is preparing ~70% API price cuts ahead of a 2026 IPO. Three deals. One stack being assembled around you — by everyone except you.",
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
    const newPayload: IssuePayload = {
      ...(issue.payload as IssuePayload),
      throughline: seed.throughline,
      throughline_lead: seed.throughline_lead,
    }
    const { error } = await s
      .from('issues')
      .update({ payload: newPayload })
      .eq('id', issueId)
    if (error) {
      console.error(`✗ ${issueId}: ${error.message}`)
      continue
    }
    console.log(`✓ ${issueId}  ${seed.throughline.slice(0, 70)}…`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
