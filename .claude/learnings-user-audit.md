# User-perspective audit — what I see when I open the product as a reader

Suraj said: "mere pref bhi basic cheeso mein glte as a user bhi check
karo." The bar isn't "the code compiled" — it's "I opened the email/page
and reacted the way a reader would."

This doc lives in two parts:
1. **Checklist** to walk before declaring a surface "done"
2. **Open issues** I've found by actually walking the product, with
   owner / status

When I fix one, move it to `## Resolved` with a date. When I find new
ones during an audit, append to `## Open`.

---

## Checklist (walk before "done")

### Every surface (web + email)

- [ ] Open at desktop width (1280) and mobile (390). Both readable.
- [ ] Click every link. All 200s, not 401/404/timeout.
- [ ] No placeholder text (`__UNSUB_TOKEN__`, `Lorem`, `TBD`, `—`,
      empty headlines).
- [ ] Dark background renders without falling back to white (Gmail
      strips broken styles silently — view-source the HTML and grep for
      style attributes that close earlier than expected).
- [ ] No "feels generic" copy that would read the same on any
      newsletter — voice should be specifically Suraj/India-builder.

### Email-specific

- [ ] Body ≥15px. Mobile media query doesn't shrink the Ship pick.
- [ ] CTA button: ≥44px tall, lime background, dark text, not blue
      (Gmail/Yahoo default link color overrides).
- [ ] Sources line: ≥1 source. If 0, the issue isn't ready to ship.
- [ ] Below-the-fold has substance — not just a CTA. The 6-layer diff
      is in the email body, not just the web archive.
- [ ] Preheader text is interesting, not the first body sentence
      repeated.

### Web /issue page

- [ ] Hero has byline ("By Suraj Pandita, Bangalore"), dateline,
      read time.
- [ ] Lede has drop cap (Fraunces serif).
- [ ] No identical-across-issues sections (the OLD `INTERVIEW_QUESTIONS`
      appendix was this trap — entry #005 in blunders).
- [ ] Chapter spine is the same skeleton every issue (predictable beats),
      not custom per issue.
- [ ] Closure renders the lime "——" mark before "That's the shift."

### Homepage

- [ ] Past Issues list contains only issues with real payloads (no
      blank "—" rows — pipeline failures should be filtered, not
      displayed).
- [ ] Hero is *this Monday's* issue, not stale.

---

## Open

### Email weekly is thin even with layers added (2026-06-16)

**Observed:** After adding `renderEmailLayers` to the weekly email, it's
no longer 90% Steal. But the Steal block still reads like generic SaaS
prose — "Single startups stack together a regression risk they weren't
pricing for. Portkey is a Bangalore-built open-source AI gateway..."
That's not a "steal this week" hack, it's a vendor description.

**Why it matters:** Suraj said "email mein kitna blit aata hai". The
Steal slot is supposed to be a *production hack* — a specific
copy-paste move a reader can make on Monday. Right now it reads like a
vendor blurb.

**Likely fix:** Synthesizer prompt for the Steal block needs:
- A concrete "if X, do Y" structure
- Why-it-matters + how-to-apply labels (web already parses for these
  via `<strong>Why it matters.</strong>` / `<strong>How to apply.</strong>`)
- Forbid vendor-blurb framing — if it sounds like the vendor's homepage,
  cut and regenerate

**Owner:** Round 2 (synthesizer prompt rewrite) — already in CLAUDE.md
phase status.

### Email CTA at very bottom only (2026-06-16)

**Observed:** "READ THE FULL ISSUE →" appears once, at the bottom. If
a reader skims and bails after the 6-layer diff (likely on mobile),
they never see a click target.

**Likely fix:** Add a secondary CTA inline after the 6-layer diff for
mobile readers who don't reach the bottom. OR move CTA up between
glance and layers. Needs A/B test by sending one of each.

### Persona INR math missing from email (2026-06-16)

**Observed:** The synthesizer produces `math` (caption + cols + rows
with INR-grounded numbers) but the email skips it. That's literally the
defensibility per CLAUDE.md ("Global newsletters cannot copy INR math").
Skipping it from the email is the wrong call.

**Likely fix:** Add `renderEmailMath` (compact 2-col table — label / INR
delta). Wire into template between layers and steal.

### Weekly Watchlist tracker — biggest untapped move (2026-06-16, fresh-model audit)

**Observed:** Every issue is a one-shot synthesis. Nothing compounds.
Reader doesn't experience the newsletter as "institutional memory of
the Indian AI market" — just a series of disconnected briefs.

**Proposed move:** Three living rows that update every issue and render
on /issue and /home:
- **API price log** — Sonnet / GPT-4o / Gemini Flash / Sarvam-M in USD
  AND INR per 1M tokens, with last-week delta arrows.
- **Regulation status board** — DPDP rules, RBI agent-payments, NPCI
  SBMD circular — each row has current state + last update date +
  expected next milestone.
- **Enterprise deal log** — 3 most recent Indian enterprise AI signings
  with vendor + reported value + beat.

**Why it matters:** Nobody else has it. Pragmatic Engineer doesn't.
Lenny doesn't. Indian newsletters definitely don't. Becomes the reason
people open even on a slow news week — they want to see the deltas.

**Build:** 2-week scope. New table `watchlist_rows` (kind, label,
value, value_secondary, delta, source_url, updated_at). New surface
at /watchlist + embed in /issue footer. CLAUDE.md spec already calls
out "structured trackers (API price log, regulation status,
enterprise deal log) become defensible knowledge base" so this is
on-spec, not scope creep.

### 6-layer diff items read identical (2026-06-16, fresh-model audit)

**Observed:** Six 50-word paragraphs in the email all look the same
shape. No per-beat variation — no quote, no chart, no inline link, no
visual distinction beyond the small lime numeral. On mobile it scrolls
as a wall.

**Proposed fixes (pick 2):**
- Add source citations inline ("Pragmatic Engineer named it [Fri]")
  — claims look unsourced without them.
- Vary length per beat — the strongest beat gets 80 words, weakest
  gets 30. Forces editorial weighting.
- Add a per-beat micro-stat in lime ("70% routing share" / "₹62L
  delta") that reads at a glance.
- Add hairline rule above each beat title for clearer break on mobile.

### "Also Reading" (`also_for`) is equal-weight failure (2026-06-16, fresh-model audit)

**Observed:** The "Also reading" / `also_for` block has 2 paragraphs of
watered-down takes for adjacent archetypes ("PM at SI/GCC..." +
"Enterprise procurement lead..."). Signals the writer couldn't commit
to one archetype. CLAUDE.md says "if everything reads as equal-weight,
the issue has failed."

**Proposed fix:** Cut the section. Or rewrite the synthesizer prompt to
forbid `also_for` entirely — one persona, deep treatment, reader
self-translates. Currently leaving rendered to avoid behavior change
without Suraj's nod.

### Subscribe form is "yourname@email.com" placeholder (2026-06-16, homepage screenshot)

**Observed:** Email input on homepage shows placeholder text. Fine. But
the CTA button next to it is "GET MONDAY'S BRIEF →" — uppercase. The
form is in the dark hero card with cream/lime, looks clean.

**Status:** Looks OK. Need to validate the actual submit flow.

---

## Resolved

### Topic-aware interview drills + further reading (added 2026-06-16)

After removing the identical INTERVIEW_QUESTIONS block (fixed below),
added a real appendix per issue with 3 topic-aware drills (each tagged
with named Indian interview surfaces — Sarvam, Anthropic India,
Razorpay, Pine Labs, GCC AI lead) + curated further reading (3
articles + 1 video + 1 paper + 1 Indian-builder-shipping-in-production
slot). Skeleton answers behind `<details>`. Web-only, email stays lean.

Schema: `IssuePayload.appendix?: AppendixPack`. Hand-seeded for the 2
existing issues via `src/scripts/seed-appendix.ts` until synthesizer
Round 2 generates them automatically.

### Identical INTERVIEW_QUESTIONS appendix on every issue page (fixed 2026-06-16)

**Was:** Every `/issue/[id]` page had the same hardcoded 6 questions
("If you were on Claude's PM team..."). Off-brand (Anthropic/OpenAI
interview prep ≠ India builder positioning).

**Fix:** Removed the entire section + the const from ArticleRenderer.
Commit pending.

### Homepage listed blank-payload issues (fixed 2026-06-16)

**Was:** Pipeline-failed issues with status='drafted' but no payload
showed up in Past Issues with "—" titles. Clicking led to "DRAFT IN
PROGRESS" placeholder. Confusing for readers.

**Fix:** Added `.not('payload', 'is', null)` filter to the homepage
issue query.

### Email rendered white (fixed 2026-06-16)

See blunder #001. Double-quoted font names broke style attributes.

### Email CTA link dead (fixed 2026-06-16)

See blunder #002. `getaisignal.org` was never aliased to Vercel; brand
domain dropped, Vercel URL is now canonical.
