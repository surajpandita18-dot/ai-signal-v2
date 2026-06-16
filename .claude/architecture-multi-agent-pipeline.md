# Multi-agent editorial pipeline — implementation plan

Produced by the Plan agent on 2026-06-16 based on Suraj's spec:
> "ek analysis agent jo based on the content that is being decide will
> decide which structure can best be able to capture the essence of the
> article and one editorial agent will write then based on the structure
> decided and then one chief editorial checks if there are any misses
> plus one which will check the facts and plus one which will check how
> the user will read it are there any readability issues design issues
> and then final it will be read by 4-5 user personas and then their
> feedback you will correct it and then you will publish it"

This doc is the build plan — no code is in here. When we implement, follow
section A → B → C → D → E in order. G is the "rerun on existing issues"
script we'll ship alongside.

---

## A. File structure

New files under `src/inngest/stages/`:

- **`analyst.ts`** — `runStageAnalyst({ issueId }): Promise<AnalystResult>` where `AnalystResult = { chosen_structure: StructureKey, rationale: string, spine_beats: Beat[], cacheUsage }`. Exports `type StructureKey = 'standard-6-layer' | 'no-signal' | 'one-thing-deep-zoom' | 'regulation-lead' | 'deal-heavy'` and `STRUCTURE_BRIEFS: Record<StructureKey, string>` (the body-format instructions the editorial agent reads).
- **`editorial.ts`** — replaces `synthesize.ts`. `runStageEditorial({ issueId, structure, spine_beats, feedback? }): Promise<EditorialResult>`. Takes the chosen structure brief and (in revision passes) the union feedback list. Writes payload to `issues.payload`.
- **`chief-editorial.ts`** — `runStageChief({ payload }): Promise<{ edits: EditNote[], severity_max: 1-5, diagnosis: string, cacheUsage }>`. `EditNote = { section, severity, instruction, quote? }`.
- **`fact-checker.ts`** — `runStageFactCheck({ issueId, payload }): Promise<{ flags: FactFlag[], citation_gaps: string[], cacheUsage }>`. `FactFlag = { claim: string, section, status: 'unsupported' | 'contradicted' | 'thin', cluster_ids: string[], suggested_action }`.
- **`readability.ts`** — `runStageReadability({ payload }): Promise<{ notes: ReadNote[], length_stats, scannability_score: 1-10, cacheUsage }>`.
- **`personas.ts`** — `runStagePersonas({ payload }): Promise<{ panel: PersonaVerdict[], forward_rate: 0-1, cacheUsage }>`. Exports `PERSONA_PANEL: PersonaDef[5]` (definitions, model, voice cues). `PersonaVerdict = { persona_id, would_forward: boolean, strongest_line, confusing_line, missing_thing }`.
- **`correction-loop.ts`** — `runCorrectionLoop({ issueId, maxRounds = 2 }): Promise<{ rounds: number, final_pass: boolean, unresolved: EditNote[] }>`. Orchestrates the parallel feedback fan-out, merges feedback into a deduped instruction list, calls `runStageEditorial` with feedback, terminates on convergence or round cap.

Keep `editorial-qa.ts` but demote it: it becomes the **final scoring gate** that runs once after the loop exits (one shot, no regen) and produces the rubric numbers persisted to `issue_quality_logs`.

## B. System prompts (3–6 sentences each)

**Analyst.** "You are the structural editor for AI Signal. Given top clusters with convergence scores + beat distribution, decide which of 5 templates this week's signal fits: standard-6-layer (≥3 beats moving), no-signal (no non-obvious shift), one-thing-deep-zoom (one cluster dominates ≥40% convergence), regulation-lead (DPDP/RBI/MeitY moves), deal-heavy (≥3 enterprise contracts named). Return `{chosen_structure, rationale (1 sentence), spine_beats (3 of 6)}`. You do NOT write copy; you do NOT pick Ship/Hold/Kill. JSON only."

**Editorial.** Re-uses current `SYSTEM_PROMPT` from `synthesize.ts`. Add at top: "You receive a STRUCTURE_BRIEF that overrides the default 6-layer spine — follow it. If FEEDBACK_NOTES are provided, treat every note as a binding edit, not a suggestion." Keep the voice rules and banned-words list intact.

**Chief Editorial.** "You are the Editorial Director, voice-keeper. You read the full payload and produce a numbered edit list. Look for: weak throughline (no verb, no stakes), missing or off-spine beat, undefended claim (no proof clause), off-brand voice (banned words from the synthesizer's avoid-list, McKinsey register, sportscaster cliché), persona translation that could appear in any global newsletter, math without interpretation. Each edit is `{section, severity 1-5, instruction (one sentence, actionable), quote (≤15 words from the payload you want changed)}`. You do NOT rewrite — you instruct. JSON only."

**Fact-Checker.** "You verify every truth-claim in the payload against the cluster + raw_item evidence I provide. A claim is supported only if a cluster's sample items state the same fact (dollar amount, named actor, date). Flag: unsupported (no cluster evidence), contradicted (cluster says otherwise), thin (only one source supports a load-bearing claim). For each flag include the exact claim, the section, suggested action (cite/soften/drop). You do NOT judge prose — only facts and citations. JSON only."

**Readability/UX.** "You read the rendered payload as a builder on a phone Monday at 7:45 AM IST. Score scannability 1-10. Flag: paragraphs >5 lines, bullets >60 words, no Monday-action close, missing dateline/byline, three-clause em-dash strings, banned mono-label decoration. Report `{section, issue, fix}`. You do NOT evaluate the argument — only the read experience. JSON only."

**Personas (5).** Each is one Sonnet 4.6 call with the same task ("read this draft as YOU; would you forward to one peer? what was confusing? what hit hardest? what's missing?") but a different persona definition:

1. **Priya — AI-native Indian founder.** Series-B Bangalore, Krutrim/Sarvam tier. Sceptical of Western frames, knows DPDP cold, will not forward filler.
2. **Marcus — Bay Area PM.** Stripe/Anthropic adjacent. Wants the India-specific edge he can't get from Stratechery; intolerant of hedging.
3. **Anil — GCC AI lead.** Bangalore Wells Fargo / JPMC. Cares about procurement, RBI exposure, talent retention; will forward if it helps his Q-review deck.
4. **Megha — interview-prepping ML engineer.** 4 YOE, prepping for Anthropic India / Sarvam. Wants the appendix drills + the framework names; ignores everything else.
5. **Ravi — enterprise procurement lead.** Bajaj Finance scale. Reads the math first; everything else is supporting evidence.

Each persona prompt is 4 sentences: identity + 2 things they care about + 1 dealbreaker + JSON output schema.

## C. Orchestration

Wire into `src/app/api/cron/weekly/route.ts`. New sequence after cluster:

```
analyst (1 step, Sonnet, ~10s)
  ↓
editorial (1 step, Opus, ~150s)
  ↓
[chief, factcheck, readability, persona×5]  ← Promise.all inside ONE Inngest step (~60s wall-clock)
  ↓
correction-loop (max 2 rounds)
  each round: editorial (Opus ~120s with feedback) → parallel critics (~60s)
  ↓
editorial-qa final scoring (Sonnet, ~30s)
  ↓
publish gate (human /review unchanged)
```

**Vercel 300s is dead.** Worst case: analyst 10 + editorial 150 + critics 60 + 2×(editorial 120 + critics 60) + QA 30 ≈ **610s**. Two options:

1. **Recommended:** split each stage into its own Inngest function with `step.run()` boundaries (matches existing pattern and CLAUDE.md rule #4). Cron POSTs an Inngest event; Inngest fans out. Each step has its own retry + timeout. `maxDuration = 60` on the route is enough.
2. Fallback: move just the cron entrypoint to a Vercel **background function** (`export const maxDuration = 800` on Pro Fluid) and keep the orchestrator inline. Simpler but loses retry granularity.

Critics MUST run via `Promise.all` inside their Inngest step — total cost dominated by latency, not tokens. Persona panel can additionally fan out as 5 sibling steps if Inngest concurrency is desired (recommended after first prod run shows real timings).

## D. Schema additions

Extend `IssuePayload` with one optional field:

```
pipeline_metadata?: {
  chosen_structure: StructureKey
  spine_beats: Beat[]
  analyst_rationale: string
  rounds_run: number
  unresolved_flags: number
}
```

Everything else lives in a new side table for auditability, NOT on `IssuePayload` (keeps the renderer untouched):

```
issue_agent_runs (
  id uuid pk,
  issue_id uuid fk,
  agent text, -- 'analyst' | 'chief' | 'factcheck' | 'readability' | 'persona:priya' …
  round int,
  output jsonb, -- the full agent return value
  model text,
  input_tokens int, output_tokens int,
  cache_creation int, cache_read int,
  latency_ms int,
  created_at timestamptz default now()
)
```

`payload-adapter.ts` ignores both — render path unaffected.

## E. Loop bound + escape hatch

- Hard cap: `maxRounds = 2`. After round 2, loop exits regardless.
- Convergence: a round counts as **pass** if (a) chief returns `severity_max ≤ 2`, AND (b) fact-checker has zero `status='contradicted'`, AND (c) persona forward_rate ≥ 3/5.
- "No consensus" = round 2 still has chief severity ≥3 OR contradicted fact OR forward_rate <2/5. Status flips to `awaiting_human`, owner email lists the unresolved `EditNote[]` inline with a deeplink to `/review/<id>?focus=unresolved`. Loop NEVER auto-publishes a failed convergence — matches CLAUDE.md rule #3.
- Persona contradictions (Priya wants more INR math, Marcus wants less India context) are NOT auto-merged. Correction-loop prompt explicitly tells the editorial agent: "If two personas conflict, optimise for the primary persona of the chosen archetype field; note the trade-off in `pipeline_metadata.unresolved_flags`."

## F. Cost estimate

Per issue, with prompt caching on the editorial Opus system prompt:

| Stage | Model | Input tok | Output tok | $/call | Calls |
|---|---|---|---|---|---|
| Analyst | Sonnet 4.6 | 6k | 0.5k | $0.03 | 1 |
| Editorial v1 | Opus 4.7 | 25k (5k cached) | 8k | $0.85 | 1 |
| Chief | Opus 4.7 | 8k | 2k | $0.27 | 1 |
| Fact-check | Sonnet 4.6 | 20k | 2k | $0.09 | 1 |
| Readability | Sonnet 4.6 | 8k | 1k | $0.04 | 1 |
| Personas | Sonnet 4.6 | 8k | 1.5k | $0.045 | 5 |
| Editorial v2 (revision) | Opus 4.7 | 30k (cached) | 6k | $0.55 | ~1.5 avg |
| Critics round 2 | mixed | — | — | $0.45 | 1.5 |
| Final QA | Sonnet 4.6 | 10k | 1k | $0.05 | 1 |

**~$2.85 per issue** at one revision round, **~$3.80** at two. Current ~$1.50 → ~2.5× increase. Annual at 52 issues: $150 → $200. Negligible vs the editorial uplift.

## G. Re-running on existing issues

Add `src/scripts/rerun-pipeline.ts`:

```
pnpm tsx scripts/rerun-pipeline.ts --issueId <uuid> [--skip-editorial] [--dry-run]
```

Flow:
1. Load existing `issues.payload`, `clusters`, `raw_items` for issueId.
2. Skip source + cluster (data exists).
3. Run analyst on existing clusters (cheap; gives the structure tag for old issues, useful telemetry).
4. If `--skip-editorial`: run only critics + personas against current payload, write to `issue_agent_runs`, print scores. Used to back-fill quality data on already-shipped issues.
5. Else: run full editorial → critics → loop → write new payload to `issues.payload` (backed up to `issues_payload_history` first — new table, two cols `issue_id`, `snapshot jsonb`, `archived_at`).
6. Never auto-send. Never overwrite `chosen_calls`. Owner reviews diff at `/review/<id>?compare=previous`.

Dry-run prints token + cost projection without calling Anthropic.

## H. Risks

- **Cost spike from runaway revision.** If chief severity never drops, two-round cap still doubles editorial spend. Mitigation: track `rounds_run` in metadata, alert if >50% of issues hit max rounds — signals chief prompt is too strict.
- **Persona panel becomes noise.** Five Sonnet calls averaging "this was fine" produces no signal. Mitigation: forward_rate is the only metric that gates — qualitative notes are advisory. After 4 issues, prune any persona whose feedback never changed an edit.
- **Fact-checker false positives.** Sonnet flags supported claims as "thin" because raw_item excerpts are 220-char truncated. Mitigation: extend excerpt window to 600 chars for fact-check call only; treat `thin` as advisory (not auto-rewrite trigger).
- **Voice drift across revisions.** Each rewrite round can sand the voice toward Sonnet-mean. Mitigation: chief prompt explicitly cites the banned-words list; final QA compares revision against `editorial_v1` for voice regression.
- **Inngest step explosion.** 12+ steps per issue makes failure debugging painful. Mitigation: each agent stage logs to `issue_agent_runs` immediately so a mid-pipeline crash leaves a forensics trail; `/review` gains an "Agent runs" tab reading from that table.
