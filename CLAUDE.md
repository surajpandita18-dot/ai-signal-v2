# AI Signal v2 — Rules

## Locked product positioning (June 2026, post-research)

After 6 evidenced research streams (Indian builder pain points, INR pricing reality, regulatory landscape, Indic models, talent/comp, enterprise adoption), the product is:

**"The India AI Builder's Brief"** — weekly Monday morning synthesis for Indian AI builders, PMs, founders. ~1500 words. 8 min read.

**Audience (updated 2026-06-16 — global + Indian, India lens as the edge):**

Primary readers: AI builders, PMs, and founders anywhere in the world
who want a Monday-morning synthesis written from one of the busiest AI
frontiers (Bangalore). Frontier AI substance is global — the LENS is
local. We're the Stratechery-from-Taiwan pattern: write from where you
sit, give global readers a vantage they can't get from Bay Area
newsletters.

Specifically welcome:
- Indian AI builders (originally locked audience) — INR math + DPDP /
  RBI regulation + Indic models stay first-class signal here.
- Global AI builders / PMs / founders — they read for the India angle
  (regulation that's ahead of US/EU on agent payments, the third-
  largest AI talent market, GCC-driven enterprise adoption) PLUS the
  global frontier coverage every issue does.
- AI engineers prepping interviews at Anthropic, OpenAI, Google
  DeepMind, India-AI startups (Sarvam, Krutrim), and GCC AI leads —
  the appendix (interview drills + further reading) makes the issue a
  study tool.

**Do not water down the India moats** (INR math, RBI/DPDP/NPCI, Indic
models) when widening. Those are the differentiator. Frame as
"context global builders can use to think differently", not "regional
content".

**Issue structure (Editorial v2 — updated 2026-06-17):**

1. **The throughline** — one non-obvious shift, named, with action implication
2. **Signal of the week** — the ONE screenshot-worthy line, large serif callout at top of body (NEW v2 — every issue must extract one signal worth Slack-pasting)
3. **The 6-layer diff** — frontier-api · india-infra · regulation · indic-models · talent-comp · enterprise-deals. At least TWO beats must explicitly reference each other (connection rule — the dots no other publication connects)
4. **What this means for you** — one persona per issue, INR-grounded math, shown
5. **Ship / Hold / Kill** — 3 opinionated calls (THIS is where human taste lives)
6. **Explained simply** — one technical concept in Feynman/Andrew-Ng register: physical analogy + production stakes. Reader is a smart non-technical operator with 30 seconds (NEW v2)
7. **Production questions** — 3 real questions builders are asking on standups THIS week, not interview prep (NEW v2)
8. **Keep / Skip** — name the noise this week specifically
9. **Closure** — "—— That's the shift. You're caught up."

**Tiered reader serving (NEW v2):** Every issue lands for THREE tiers simultaneously — PM/strategy (throughline + framework), builder/engineer (6-layer + production questions + hack), curious operator (signal + explained simply). Do NOT write three separate sections. Weave it.

**Show the math:** Every load-bearing claim needs a proof clause — number, source, named action. "OpenAI is cutting prices" fails. "OpenAI told reporters Tuesday it's cutting API prices ahead of a 2026 IPO; Information's leak suggests ~70%" passes.

**Source taxonomy (6 beats, replaces old enum):**
`frontier-api | india-infra | regulation | indic-models | talent-comp | enterprise-deals`

**Auto vs human-gate (resolved):**
- AUTO: sources → cluster → 6-layer diff extraction → persona translation → INR math → markdown render
- HUMAN (2 min weekly, mobile-friendly): approve/edit Ship/Hold/Kill calls only
- 95% auto, 5% human exactly where editorial taste matters

**Defensibility:**
- Global newsletters cannot copy India regulation + INR math + Indic model evals
- Indian newsletters cannot copy synthesis discipline (they are SEO-volume operations)
- Editorial voice compounds; structured trackers (API price log, regulation status, enterprise deal log) become defensible knowledge base

---

## Original Rules (still apply)

1. The throughline is HUMAN. The synthesizer agent proposes candidates;
   Suraj decides. The system must NEVER auto-select and send an
   AI-generated throughline. This is the product's only moat.
   **Refinement post-research:** The "human pick" now applies specifically to
   the Ship/Hold/Kill section (the opinionated calls). The factual 6-layer diff
   and persona translation may auto-publish — they are evidence extraction,
   not judgment. Suraj's editorial judgment lives on the Ship/Hold/Kill row.

2. Synthesis > summary. Output is a finished THOUGHT (one shift + attached
   proof), never a list of equal items. If everything reads as equal-weight,
   the issue has failed and must not ship.

3. Honesty over fabrication. If a week has no genuine non-obvious shift,
   say so. Never manufacture a throughline to fill the slot.

4. Inngest step boundaries: every external/long call inside step.run().
   No function logic outside step boundaries (this caused a prod outage before).

5. Canonical site URL is `https://ai-signal-v2.vercel.app` (Vercel-only,
   no custom brand domain — dropped 2026-06-16, DNS never moved off
   Namecheap parking). Email sender is Resend's `onboarding@resend.dev`
   until a sending domain is verified.

6. Keep/skip names the REAL noise specifically (e.g. "the $40M raise everyone
   quote-tweeted"), so the permission feels earned, not generic.

7. Two gates before any launch:
   - Technical gate: pipeline runs reliably end to end (Claude verifies).
   - Editorial/market gate: real readers say they'd drop a source for it.
   Passing only the technical gate is the Artifact trap. Do not launch on it.

---

## Anti-patterns (do not do)

- Do NOT auto-publish the Ship/Hold/Kill section without Suraj's pass.
- Do NOT add sources just because they cover "AI." Each new source must map to one of the 6 beats. Bloat kills synthesis.
- Do NOT skip the INR math. Concrete numbers defend against AI-slop synthesis.
- Do NOT erase the India moats (INR math, RBI/DPDP regulation, Indic
  models) — the audience is global+Indian but the LENS is what we
  defend. Without the India angle we're another Stratechery clone.
- Do NOT replace the original 7 rules above. They still apply.

---

## Locked design system — Figr v3 (June 2026)

The original paper/ink/indigo system above was superseded by the Figr v3 dark-first system in June 2026. Globals.css and every shipped surface use Figr v3. The new lock:

**Palette (Figr v3, locked):**
- `--bg` `#0b0d0a` — near-black with green tint (NOT pure black)
- `--bg-raised` `#0e110c` / `--bg-card` `#131712`
- `--cream` `#ece7dd` primary text / `--cream-dim` `#cfc9bd` subdued
- `--lime` `#c2f53d` — the SINGLE accent. Functional only (CTAs, beat anchors like Roman numerals, pull-quote rule, math delta column). Never decorative.
- `--fg-muted` `#8b8f86` body-muted, `--fg-subtle` `#6b7062` for rules/dots ONLY (fails contrast as copy)
- `--danger` `#e5675a` — used sparingly for SKIP / KILL signals

**Typography (Figr v3, locked):**
- Email: Georgia body / system-sans heading / system-mono meta
- Web: Fraunces serif (display + italic body subheads) / Inter sans / JetBrains Mono
- Lede paragraph gets a Fraunces drop cap (`.editorial-lede`)

**Visual anti-patterns (Figr v3 additions):**
- Eyebrow stack — every section starts with a small uppercase mono label
- Card-in-card — bordered boxes around lists, cards inside grids
- Lime as decoration (eyebrows, every numeral, every link) — lime is functional only
- Sticky widgets — chapter scrubbers, progress bars
- Performative labels — "THE LOOP CLOSES" / "END OF ISSUE" announcing the obvious
- Mono labels as decoration — 8+ mono caps in one screen
- Symmetric 2-col grids when an asymmetric or single-column flow would read more editorial
- Missing editorial details — no byline, no drop cap, no dateline ("By Suraj Pandita, Bangalore")

**Issue structure (locked, 8 elements):**
masthead → H1 throughline → 3-bullet Executive Skim → 6-layer diff (identical skeleton per beat) → persona translation + INR math → Ship/Hold/Kill cards → Keep/Skip lists → closure + "Forward to one builder" CTA

**Platform priority:** email → /issue/[id] web → LinkedIn cross-post → WhatsApp Channel → Telegram. **No PWA, no native app early.**

**Stack:** Next.js + Resend + Postgres (custom, no Substack). Resend $20/mo at 50K emails. Send Monday 7:30 AM IST.

**Email engineering targets:** mobile-first single column, 600px max, body ≥16px, HTML+CSS <95KB, tap targets ≥44×44px, inline CSS only, multipart text alt, `prefers-color-scheme: dark` override.

**Track:** clicks + replies + unsubs (not opens — Apple MPP inflates 15-35%).

**Visual anti-patterns:** pure #FFFFFF/#000000, custom @font-face in email, emoji in section headers, per-section icons, saffron/white/green tricolor, generic SaaS gradient, multi-column layout, truncated email driving web traffic, multiple pull quotes per issue.

---

## Phase status

Phase 1 (original) is complete — Stage 1-4 pipeline works against old positioning.

**Now in: Foundational rebuild** — re-fit pipeline to locked positioning.
- Round 1 (in progress): memory + CLAUDE.md + migration 0003 + sources expansion
- Round 2: synthesizer prompt rewrite for 6-section structure
- Round 3: Stage 4 drafter rewrite for locked output template
- Round 4: /review page rebuild for Ship/Hold/Kill picks
- Then: Phase 3 reader test per spec rule #7

Do NOT build:
- Phase 4 work (Resend send, Figr template, web archive, subscribe flow) until Phase 3 passes
- Embeddings infra (pgvector) — one-shot Claude clustering is sufficient
- Cron / scheduled production runs

See `ai-signal-v2-build-spec.md` for the original spec.
See memory `project_positioning_locked.md` for the full positioning rationale.

---

## Design standard

Before any design decision or shipping any UI, check it against `.claude/design-quality-rubric.md` — all HARD GATES must pass, verified on the real rendered output (screenshots at 1200px + 390px, and email at 360px if applicable).

---

## Self-learning system — READ at session start

`.claude/learnings-README.md` is the index. The system has 4 docs:

- **`.claude/learnings-suraj-preferences.md`** — How Suraj wants me to
  act (Hinglish back, don't ask permission inside agreed direction,
  visually verify before "done", care about quality). **Read every
  turn** — these change my defaults.
- **`.claude/learnings-claude-blunders.md`** — Mistakes Suraj has caught,
  with root cause + one-sentence rule. Consult before shipping anything
  touching a surface listed in an entry (email, deploy, env, design).
- **`.claude/learnings-user-audit.md`** — Findings from opening the
  product as a real reader, plus checklists to walk before "done".
  Re-walk before claiming any surface is done.
- **`.claude/learnings-research-cache.md`** — How respected operators
  (newsletter authors, indie SaaS, India SaaS) solve problems Suraj is
  also hitting. Search before designing from first principles.

**Auto-update rules:**
- When Suraj flags a "silly mistake / blunder", append to
  `learnings-claude-blunders.md` *without being asked*.
- When Suraj corrects a preference or says "do X this way", append to
  `learnings-suraj-preferences.md` *without being asked*.
- When I find a user-experience issue while building, append to
  `learnings-user-audit.md` (under Open) and move to Resolved when fixed.
- When I solve a problem using a known-good operator pattern, add it to
  `learnings-research-cache.md`.
