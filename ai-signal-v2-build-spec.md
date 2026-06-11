# AI Signal v2 — Build Spec (hand this to Claude Code)

*A lean, test-first build spec for a NEW repo. Goal: generate real synthesis issues fast enough to test the thesis with readers — not to ship a full production cathedral before validation. 95% automated, one human gate that is non-negotiable.*

---

## 0. What this is

A periodic **AI synthesis brief** for Indian AI builders, PMs, and founders. It turns the week's scattered AI developments into ONE throughline ("the one shift this week"), proves it with 2-3 attached proof points, tells the reader what to internalise vs. safely ignore, gives a "do this," and ends with explicit closure ("you're caught up").

**It is NOT** a comprehensive digest, a feed, or a personalized algorithm. The whole product is the *quality of the throughline*. See the locked issue anatomy: hero throughline → nested proof → keep/skip → do-this → closure.

**Why a new repo (not the old `ai_signal`):** different thesis (synthesis vs. one-story-a-day), different data model, different pipeline. Keep the old one stable. But COPY the infra below — don't rebuild it.

---

## 1. Stack & what to copy from the old repo

Same stack (no new learning curve): **Next.js 15, React, Tailwind, TypeScript, Supabase, Anthropic API, Inngest, Resend.**

Copy from old `ai_signal` (already working, do not rebuild):
- Email infra: `getaisignal.org` domain, Resend setup, DKIM/SPF/DMARC verification.
- The Inngest **step-boundary pattern** — every external/long call lives inside a proper Inngest `step.run()`. (This is the fix for the Vercel timeout outage. Do not regress it.)
- Supabase project skeleton + auth.

**Sender domain:** use `getaisignal.org` everywhere. (The Figr mock showed `aisignal.co` — wrong, ignore it.)

---

## 2. Sources (curated — verify each feed URL is live at build time; feeds move)

Three tiers, each plays a different role. Do not treat all sources as equal volume.

**Tier A — Signal (official, high trust): "what actually shipped"**
- OpenAI News / blog
- Anthropic news / blog
- Google DeepMind blog
- Meta AI blog
- Hugging Face blog — `https://huggingface.co/blog/feed.xml` (open-source tooling)
- Mistral / other major lab blogs as relevant

**Tier B — Volume (aggregators / roundups): "everything that moved"**
- MarkTechPost — `https://www.marktechpost.com/feed/` (verified live; the single best high-cadence AI feed)
- Hacker News front page + Show HN (via `https://hnrss.org/frontpage` and `https://hnrss.org/show`) — strong quality/score correlation; good builder signal
- arXiv recent `cs.AI` / `cs.LG` / `cs.CL` listings (for research surfacing)
- TechCrunch AI / The Verge AI (business + product launches)

**Tier C — Angle calibration (editorial / analysis): "what smart people think it MEANS"**
*Used to generate candidate-throughline ANGLES, never to copy. These sharpen the human's POV.*
- Import AI (Jack Clark)
- Ahead of AI (Sebastian Raschka)
- Other respected analyst essays as they appear

> Design note: Tier A+B answer "what happened." Tier C feeds the synthesis step with *interpretations* so the candidate throughlines aren't just "5 models shipped." This is what keeps the output non-obvious.

Store sources in a `sources.ts` config (tier-tagged) so they're trivially editable later.

---

## 3. The pipeline (5 stages — 4 automated, 1 human gate)

```
[1 SOURCE]  →  [2 CLUSTER]  →  [3 SYNTHESIZE→candidates]  →  ⏸ HUMAN GATE  →  [4 DRAFT]  →  [5 ASSEMBLE+SEND]
   auto          auto              auto                        Suraj           auto           auto
```

**Stage 1 — Source** *(auto)*
Pull last 48h from all tiered feeds. Normalize (title, url, source, tier, timestamp, body excerpt). Store raw in Supabase. Inngest step per fetch.

**Stage 2 — Cluster** *(auto)*
Dedup across sources (the same story shows up 7 places). Group related items into clusters. Flag clusters where many sources converge (convergence = candidate signal). Output: ranked clusters with source counts.

**Stage 3 — Synthesize → candidates** *(auto)*
This is the AI's *assist*, not the answer. Using clusters + Tier-C angle calibration, produce **2-3 candidate throughlines**, and for EACH:
- the one-line throughline
- the 2-3 proof clusters that support it (attached, not listed)
- the reasoning ("why these dots point here")
- an honest **self-assessment: "obvious or non-obvious?"** and why
Also surface a "what we set aside" count (the items that didn't make it).

**⏸ Stage 3.5 — HUMAN GATE (Suraj) — NON-NEGOTIABLE**
Pipeline PAUSES here (Inngest `waitForEvent` / manual approval). Suraj reviews the 2-3 candidates and either:
- picks one, or
- edits/sharpens one, or
- writes his own throughline (rejecting all three).
**Nothing assembles or sends until a human throughline is chosen.** This is the product's entire moat. The system must be incapable of auto-sending an AI-picked throughline.

**Stage 4 — Draft** *(auto)*
Around the CHOSEN throughline, draft: the proof points (tied back to the throughline), the keep/skip split (with the real noise named), and the "do this" actions.

**Stage 5 — Assemble + send** *(auto)*
Render into the locked email template (the Figr design), build the web reader / archive entry, schedule + send via Resend. Log delivery.

---

## 4. Sub-agents (FOUR — not 1000)

Define as focused Claude Code subagents, orchestrated by one command. More agents ≠ better; each is a place things break. Keep roles sharp and few.

1. **`sourcer`** — runs Stage 1. Fetches, normalizes, dedups at the source level.
2. **`clusterer`** — runs Stage 2. Groups, dedups semantically, ranks by convergence.
3. **`synthesizer`** — runs Stage 3. Produces the 2-3 candidate throughlines + reasoning + obvious/non-obvious self-check. Explicitly instructed to *avoid* surface synthesis and to flag when it can't find a non-obvious angle (better to say "this week is genuinely quiet" than to manufacture a fake shift).
4. **`assembler`** — runs Stages 4-5 after the human gate. Drafts around the chosen throughline, renders, schedules.

Orchestrator command: **`/generate-issue`** — runs 1→2→3, then halts and presents candidates to Suraj; on his choice, runs 4→5.

---

## 5. CLAUDE.md rules for the new repo (include verbatim)

```
# AI Signal v2 — Rules

1. The throughline is HUMAN. The synthesizer agent proposes candidates;
   Suraj decides. The system must NEVER auto-select and send an
   AI-generated throughline. This is the product's only moat.

2. Synthesis > summary. Output is a finished THOUGHT (one shift + attached
   proof), never a list of equal items. If everything reads as equal-weight,
   the issue has failed and must not ship.

3. Honesty over fabrication. If a week has no genuine non-obvious shift,
   say so. Never manufacture a throughline to fill the slot.

4. Inngest step boundaries: every external/long call inside step.run().
   No function logic outside step boundaries (this caused a prod outage before).

5. Sender domain is getaisignal.org. Always.

6. Keep/skip names the REAL noise specifically (e.g. "the $40M raise everyone
   quote-tweeted"), so the permission feels earned, not generic.

7. Two gates before any launch:
   - Technical gate: pipeline runs reliably end to end (Claude verifies).
   - Editorial/market gate: real readers say they'd drop a source for it.
   Passing only the technical gate is the Artifact trap. Do not launch on it.
```

---

## 6. Build phasing (test-first — do NOT build everything before validation)

**Phase 1 — Minimum issue generator (this is the only phase to fully build now)**
Stages 1→3 + the human gate + Stage 4 draft, outputting issue content (even as plain markdown/text). Enough to PRODUCE a real issue in ~20 minutes instead of 2 hours. The Figr email template can be wired in here or stay manual for the first issues — the test is about the *thinking*, not the wrapper.

**Phase 2 — Run + technical review**
Generate 2-3 real issues. Claude reviews each run for reliability (crashes, missing sources, dedup quality, format). Fix until the pipeline is boringly reliable.

**Phase 3 — Reader test (the real validation)**
Send those 2-3 issues to 5-10 ICP people. Ask the replacement question: "Would you drop a source you currently read for this?" Kill criteria: if no one drops anything, the thesis is too weak — sharpen or stop. Success: 3-5 people would genuinely miss it.

**Phase 4 — Only if Phase 3 passes: full automation polish**
Wire the full Figr design across email + web + archive, scheduling, subscribe/landing. Build this AFTER validation, not before.

---

## 7. The one thing no build can do

This system gets the human's issue-writing time from ~2 hours to ~20 minutes by doing all the grunt work. It cannot make the throughline sharp — that is Suraj's 10-minute judgment call, and it is the entire product. Build the engine; the mind stays human.
