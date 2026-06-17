// Hand-rewrite persona.translation for all 4 weekly issues — the deep
// 120-180 word treatment that anchors each issue. The analogies set up
// in explained_simply (kitchen / vault / crop / two-shops) thread through
// these translations too so the issue reads as one coherent piece.

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local', override: true })

import { createAdminSupabaseClient } from '../lib/supabase-admin'
import type { IssuePayload } from '../../db/types/database'

const TRANSLATIONS: Record<string, string> = {
  // 38201c30 — Router / kitchen analogy
  '38201c30-8db1-422e-a29e-34c70b07b988':
    "You've spent six months telling your board you standardized on Claude because it was the safest production bet for your agentic workflow. That bet just broke. Fable 5 shipped guardrails your demo flow didn't survive, your AE at Anthropic emailed an apology, and Pragmatic Engineer ran a Friday piece about senior engineers porting workflows to Codex within 72 hours.\n\nPicture the kitchen analogy again. You hired a Michelin chef and put him on every ticket — egg orders, soup orders, the wagyu plates. Now the chef has told you he won't cook eggs on Tuesdays. The cost is the same; the menu is broken. The fix is the one any restaurant has run for a century. Add cooks. Route tickets. Keep the Michelin guy for what only he can do.\n\nWhat I'd do Monday: pull your prompt directory, count how many strings are hardcoded to Anthropic XML scaffolding, and put a senior engineer on a Portkey or LiteLLM gateway this sprint. Move every prompt to model-agnostic templates by Friday.",

  // 22da6516 — Sarvam / vault-in-another-country analogy
  '22da6516-f0cc-422b-a5ef-7a32dc6c138e':
    "You're a CIO at an Indian bank. Two years ago you signed a Claude enterprise contract because OpenAI hadn't shown up in India yet and Sarvam was 'too early.' Last quarter your compliance team had to redact thirty pages of customer prompts that landed in Anthropic's training pool. This Wednesday, Treasury added Anthropic to a fresh round of export controls.\n\nThe vault has been in another country the whole time. You just didn't have to think about it. The fix is the one your bank has always run with currency exposure — you hedge, you diversify, you build the second source so a Friday policy headline doesn't break your Monday operations. The vault doesn't have to leave overnight. It needs a sibling inside your borders before the next audit.\n\nWhat I'd do Monday: brief the procurement team on Sarvam-M as a primary path, not a backup. Run the eval rig you've been postponing. Get the RBI auditor's response to 'physical inference in Bangalore' in writing before your year-end review.",

  // 9c642302 — Concentration risk / crop + borrower analogy
  '9c642302-21f2-4563-ae9b-7116478aadda':
    "You're a procurement lead at a Series-B Indian SaaS that ships to BFSI customers. Twelve months ago you saved a quarter of your engineering budget by standardizing on Claude. This Tuesday your CISO forwarded Treasury's latest export-control flag and asked what your exposure looks like. You don't have an answer yet, and the question won't wait until Q2.\n\nThe lens is borrowed from a century of bank operations. You don't grow only one crop, because one bad season ends your farm. You don't lend only to one borrower, because one bankruptcy ends your book. The math is the same in every domain — one bad event ends the whole thing — and it just got pointed at AI. The fix is the same one bankers have run for a century: add a second source, prove they're substitutable, document the switch.\n\nWhat I'd do Monday: open the procurement deck and add a 2027 risk-register row. Name your second sovereign provider. Document the switch SLA. Bankers have had a century with this playbook. You have one quarter.",

  // d6037c54 — Placement race / two-shops-on-busy-street analogy
  'd6037c54-b7f2-4f10-aafa-a1bbb0beda73':
    "You're a Series-B founder shipping consumer AI in India. Your unit economics slide assumes premium API margins. You raised on that slide. This Tuesday, Meta leased a one-gigawatt India DC with Reliance. Thursday, Visa wired ChatGPT into agent-led checkout. Friday, The Information leaked OpenAI's ~70 percent API price cut. Your slide just stopped working.\n\nPicture the two shops again. Yours sits on a quieter side street, cheaper prices, decent inventory. The doors onto the busy market street are being built by Meta and OpenAI — and by the time those doors open, shoppers will be walking through someone else's doorway and never looking at your shop. The cost edge that funded your acquisition math is closing. The door that wins distribution is opening. They're two different races; you've been running the wrong one.\n\nWhat I'd do Monday: cut the cost-moat slide from your pitch and add a placement-moat slide. Where does your agent already live in the user's flow? Build there. The next round of buyers will fund placement, not model picks.",
}

async function main() {
  const s = createAdminSupabaseClient()
  for (const [issueId, translation] of Object.entries(TRANSLATIONS)) {
    const { data: issue } = await s
      .from('issues')
      .select('id, payload')
      .eq('id', issueId)
      .single()
    if (!issue?.payload) {
      console.warn(`skip ${issueId}: no payload`)
      continue
    }
    const current = issue.payload as IssuePayload
    const newPayload: IssuePayload = {
      ...current,
      persona: {
        ...current.persona,
        translation,
      },
    }
    const { error } = await s
      .from('issues')
      .update({ payload: newPayload })
      .eq('id', issueId)
    if (error) {
      console.error(`✗ ${issueId}: ${error.message}`)
      continue
    }
    const wc = translation.split(/\s+/).length
    console.log(`✓ ${issueId}  persona.translation ${wc}w`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
