# AI Signal v2 — Rules

## Locked product positioning (June 2026, post-research)

After 6 evidenced research streams (Indian builder pain points, INR pricing reality, regulatory landscape, Indic models, talent/comp, enterprise adoption), the product is:

**"The India AI Builder's Brief"** — weekly Monday morning synthesis for Indian AI builders, PMs, founders. ~1500 words. 8 min read.

**Audience (locked, do not widen):** Indian AI builders, PMs, founders. Bootstrapped Indian SaaS founders adding AI; AI-native Indian startup founders; PMs at GCCs/SIs/enterprises with AI budget; AI engineers shipping from India.

**Issue structure (locked, 6 sections):**

1. **The throughline** — one non-obvious shift, named, with action implication
2. **The 6-layer diff** — frontier-api · india-infra · regulation · indic-models · talent-comp · enterprise-deals
3. **What this means for you** — one persona per issue, INR-grounded math
4. **Ship / Hold / Kill** — 3 opinionated calls (THIS is where human taste lives)
5. **Keep / Skip** — name the noise this week specifically
6. **Closure** — "—— That's the shift. You're caught up."

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

5. Sender domain is getaisignal.org. Always.

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
- Do NOT widen the audience beyond Indian AI builders.
- Do NOT replace the original 7 rules above. They still apply.

---

## Locked design system (post research, June 2026)

See memory `project_design_system_locked.md` for the full rationale and sources.

**Palette (4 tokens + muted, locked):**
- `--paper` `#F5F1E8` — warm off-white, NEVER pure white
- `--ink` `#1A1A1A` — near-black, AAA contrast on paper
- `--accent` `#1E3A8A` — indigo (single moment of color)
- `--clay` `#9A3412` — terracotta (pull-quote left border only)
- `--muted` `#6B6B6B`

**Typography:**
- Email: Georgia body / system-sans heading / system-mono meta
- Web: Merriweather body / Geist heading / Geist Mono meta
- Optional Devanagari ornament: Mukta SemiBold (masthead only, sparingly)

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
