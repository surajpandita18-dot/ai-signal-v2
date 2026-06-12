# Deep-Dive Track — Design Spec

Second content type. Additive — weekly Monday brief untouched. Deep-dives ship 1–2 / month, reuse pipeline primitives.

Reference shape (japm "context rot," simonwillison context-engineering, hamel.dev evals): cold open with one named claim → "here's the assumption" → 4–6 evidence sections, each anchored by an inline-linked artifact (paper, repo, log, regulator filing), bracketed `[source]` links not footnotes → close with concrete Monday action. No abstract, no TOC.

---

## 1. Product positioning

**Audience:** the engineering/PM-stake subset of weekly subscribers — Indian AI engineers shipping agents, AI-native founders past pilot, GCC/SI staff+ ICs (~30–40% of list). **Why:** the brief gives them the shift; the deep-dive gives them the *durable mental model + receipts* to defend a build/buy/rip call in a hostile room. **When:** Thursday 9:00 AM IST, never the same week as a brief story it would echo. Brief = "what changed last week"; deep-dive = "the assumption you're still wrong about."

## 2. Locked structure

| # | Section | Length | Voice cue |
|---|---|---|---|
| 1 | Cold open | 120–180 w | One scene, one named actor, one number. No "In this essay we will…" |
| 2 | The assumption | 80–120 w | State the common belief in one sentence. Italicize it. Then: "Here's why it's wrong." |
| 3 | Evidence stack (3–5 sub-sections) | 1800–2800 w total | Each sub-section opens with a 1-line claim, then proof (paper / benchmark / production log / regulator filing / INR math). Inline `[source]` links, no footnotes. |
| 4 | The Indian-context twist | 350–500 w | What changes when you re-run the analysis with INR pricing, DPDP, Indic data, GCC org charts. The wedge global writers can't copy. |
| 5 | What to do Monday | 200–300 w | 3 numbered actions. Each ≤2 sentences. Concrete file/team/contract verbs. |
| 6 | What I might be wrong about | 80–120 w | Name 2 counter-positions with the strongest link for each. Honesty over fabrication (CLAUDE.md rule 3). |
| 7 | Further reading | 5–8 links | One-line annotation per link. No naked URLs. |

Total: 2800–4000 words. Hard cap 4500.

## 3. Source taxonomy (deep-dive feeds — additive to `src/config/sources.ts`)

No new beat enum. Deep-dive feeds get a `kind: 'long-form'` flag so the weekly sourcer ignores them. Window: 30 days.

| Name | URL | Rationale |
|---|---|---|
| Hamel Husain | `https://hamel.dev/index.xml` | Canonical evals voice. Opener style + log-driven proof we want to imitate. |
| Eugene Yan | `https://eugeneyan.com/rss/` | Production ML / LLM pattern essays with citations. |
| Sebastian Raschka — Ahead of AI | `https://magazine.sebastianraschka.com/feed` | Method deep-dives with reproducible benchmarks. |
| Answer.AI | `https://www.answer.ai/index.xml` | Jeremy Howard / Jono Whittaker — strong applied + open-weights essays. |
| Aman Chadha — aman.ai | `https://aman.ai/feed.xml` | Long-form architecture explainers with diagrams. |
| Drew Breunig | `https://www.dbreunig.com/feed.xml` | Single-thesis essays on context engineering / RAG limits. |
| Zvi Mowshowitz | `https://thezvi.substack.com/feed` | Weekly synthesis, model for "the assumption + counter-evidence" rhythm. |
| AI Snake Oil | `https://www.aisnakeoil.com/feed` | Steel-mans skeptic positions cleanly (feeds Section 6). |
| Alignment Forum | `https://www.alignmentforum.org/feed.xml` | Source for counter-positions on agent + eval claims. |
| Just Another PM (Sid Arora) | `https://japm.substack.com/feed` | India-fluent PM voice + design reference. |
| Sajith Pai | `https://sajithpai.substack.com/feed` | Already in weekly; re-tagged here for INR-grounded Indian-context twist (Section 4). |
| Simon Willison | `https://simonwillison.net/atom/everything/` | Already in weekly; re-tagged for citation/link-density discipline. |

All URLs verified 200 (2026-06-12). Skipped: Transformer Circuits (403), philschmid.de (no RSS), every.to (paywalled) — these flow through the research agent's WebFetch path instead.

## 4. Pipeline

**Topic discovery agent.** Fortnightly Inngest cron (`deep_dive.discover`, alternate Mondays 18:00 IST — runs *after* the brief ships, doesn't compete for review attention). Reads 60 days of `raw_items` + new long-form feeds, asks Sonnet 4.6 (`MODEL_DISCOVER`) for **5 candidate assumptions** Indian AI builders currently hold that the evidence contradicts. Output: `deep_dive_candidates` rows — `assumption_challenged`, `one_paragraph_hook`, `evidence_anchor_urls`, `score`. Suraj picks one at `/review/deep-dive`. **This is the human gate** (CLAUDE.md rule 1, refined).

**Research agent.** `deep_dive.research` runs each phase in its own `step.run()` (rule 4). Tools: WebFetch for 8–15 anchor URLs, plus a `pgread` helper surfacing `raw_items` whose excerpts mention the candidate's entities. Model: Opus 4.7 with extended thinking. Output: `research_pack` JSONB — `{url, quote, claim_supported}` triples + 3–5 counter-positions for Section 6.

**Writer agent.** `deep_dive.draft` consumes `research_pack` + the structure above, emits one markdown chunk per section (joined at render). Model: Opus 4.7, temperature 0.55 (vs weekly's 0.4 — voice matters more). Inline-link discipline enforced in prompt: every debatable claim needs a bracketed `[source]` link from `research_pack`.

**QA rubric (different from weekly's 6).** Sonnet 4.6 scores 1–10 on: (1) **Thesis clarity** — can reader state contrarian thesis in one sentence after Section 2? (2) **Evidence density** — ≥1 inline link per 200 words in Sections 3–4, every link unique. (3) **Indian-context wedge** — Section 4 cites an INR number, DPDP/RBI clause, or Indic-data fact a global writer plausibly wouldn't. (4) **Action concreteness** — Section 5 names file/contract/team/vendor, not "consider X." (5) **Counter-position honesty** — Section 6 steel-mans. (6) **Voice consistency** — no McKinsey phrases, no "arguably/potentially," no emoji in headers. All six ≥ 8. Auto-regen tops at 2 retries (vs weekly's 3 — long output is expensive).

## 5. Schema changes

```sql
-- 0007_deep_dive.sql
-- Additive. Weekly brief schema untouched.

alter table issues
  add column if not exists issue_type text not null default 'weekly_brief'
  check (issue_type in ('weekly_brief', 'deep_dive'));

create index if not exists issues_type_idx on issues(issue_type);

create table if not exists deep_dive_candidates (
  id uuid primary key default gen_random_uuid(),
  discovered_at timestamptz not null default now(),
  assumption_challenged text not null,
  one_paragraph_hook text not null,
  evidence_anchor_urls jsonb not null default '[]'::jsonb,
  score int check (score between 1 and 10),
  chosen boolean not null default false,
  chosen_issue_id uuid references issues(id),
  rejection_reason text
);

create index if not exists ddc_chosen_idx on deep_dive_candidates(chosen);

-- Deep-dive payload sits in the existing issues.payload JSONB.
-- New top-level keys (no migration needed, JSONB):
--   { cold_open, assumption, evidence_sections[], india_twist,
--     monday_actions[], counter_positions[], further_reading[],
--     research_pack_id }
```

No new tables beyond `deep_dive_candidates`. Reuses `issues`, `issue_quality_logs`, `raw_items`. Backwards compatible: existing rows get `issue_type='weekly_brief'` by default.

## 6. First 3 deep-dive topics

| Assumption challenged | Hook | Sources |
|---|---|---|
| "Long context windows killed RAG." | Every Indian SaaS founder I've spoken to in Q2 has ripped retrieval out of their pipeline after Gemini's 2M-context demo. Their eval scores quietly cratered 6 weeks later and nobody told their board. The needle-in-haystack benchmark hid a much more expensive truth about how context degrades on Indic-mixed input. | `https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html` · `https://hamel.dev/blog/posts/evals/` · `https://eugeneyan.com/writing/llm-patterns/` · `https://huggingface.co/blog/needle-haystack` · `https://magazine.sebastianraschka.com/p/understanding-large-language-models` · `https://simonwillison.net/2025/Jun/27/context-engineering/` · `https://japm.substack.com/p/context-rot` |
| "Indic models are catching up to GPT-class on Indian-language tasks." | The Sarvam / BharatGen / Krutrim benchmark posts read like a closing gap. Run the same tests on code-mixed Hinglish customer support transcripts (the actual GCC/SI use-case) and the gap widens, not narrows. The eval suites everyone cites don't measure what enterprise buyers actually buy. | `https://tech.olakrutrim.com/` · `https://bharatgen.com/` · `https://aman.ai/primers/ai/llm-eval/` · `https://huggingface.co/spaces/AI4Bharat/IndicLLMSuite` · `https://hamel.dev/blog/posts/evals/` · `https://www.aisnakeoil.com/` · `https://sajithpai.substack.com/` |
| "Agents are production-ready — the Anthropic Claude 4 launch proves it." | An Indian fintech that swapped a deterministic workflow for a SWE-Bench-topping agent burned ₹14L in API spend in 3 weeks and rolled back. The benchmarks aren't lying; they're just not measuring the failure mode that bankrupts you (compounding-error tail risk on multi-step DPDP-regulated tasks). | `https://www.alignmentforum.org/` · `https://thezvi.substack.com/` · `https://www.answer.ai/posts/2025-01-10-replacing-rest-with-mcp.html` · `https://hamel.dev/blog/posts/llm-judge/` · `https://eugeneyan.com/writing/llm-patterns/` · `https://www.rbi.org.in/pressreleases_rss.xml` · `https://www.dbreunig.com/` |

## 7. Next 3 implementation steps

1. **PR #1 — Schema + sources, no UI.** Add `db/migrations/0007_deep_dive.sql` (above). Extend `db/types/database.ts` with `IssueType` and `deep_dive_candidates` types. Add the 8 new feeds to `src/config/sources.ts` under a `// DEEP-DIVE CANON` block with a new `kind: 'long-form'` discriminator on `Source`. Update `src/inngest/stages/source.ts` to skip `kind: 'long-form'` rows when `issue_type='weekly_brief'`. **Acceptance:** `pnpm smoke:source --issue-type=deep_dive` returns ≥ 50 items; weekly smoke unchanged.

2. **PR #2 — Discovery agent + review surface.** New `src/inngest/stages/deep-dive-discover.ts` (cron + 5-candidate prompt). New `src/app/review/deep-dive/page.tsx` mirroring `src/app/review/[issueId]/page.tsx`, listing pending candidates with pick/reject server actions; reuse existing review auth. **Acceptance:** `pnpm tsx src/scripts/smoke-deep-dive-discover.ts` persists 5 candidates and review page renders.

3. **PR #3 — Research + writer + QA.** Three new stage files: `deep-dive-research.ts`, `deep-dive-draft.ts`, `deep-dive-qa.ts`. Each phase in its own `step.run()`. Add `MODEL_DEEP_DIVE_RESEARCH` / `MODEL_DEEP_DIVE_DRAFT` to `src/lib/anthropic.ts`. Rubric lives in code (typed `DeepDiveScore`), stored in existing `issue_quality_logs.feedback.deep_dive` JSONB — no column changes. **Acceptance:** `pnpm tsx src/scripts/smoke-deep-dive.ts <candidate_id>` writes `output/deep-dives/dd-001.md` passing the rubric within 2 passes.

After PR #3: Phase-3 reader test (rule 7) on 5 real Indian builders before any send wiring. No Resend until editorial gate passes.
