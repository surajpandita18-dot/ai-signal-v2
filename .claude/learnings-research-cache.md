# Research cache — how others solve problems Suraj is hitting

Suraj said: "research bhi karo jo problem mujhe aarahi hai bakiyo ko bhi
aate hai toh woh kaise solve karte hai woh bhi kahin save rakho."

This file collects how respected operators (newsletter authors, indie
SaaS builders, India SaaS founders, email engineers) solve the same
problems Suraj is facing — so I'm not just guessing from first
principles.

**Convention:** One entry per problem. Lead with the problem in
Suraj's framing, then 2–4 known approaches with the source if available
+ which one fits AI Signal's context.

---

## #001 — How do small newsletters (1K–10K subs) get high open + click rates?

**Problem:** AI Signal launches with low list size. Industry "average"
benchmarks (~20% open, ~2% click) are useless because Apple MPP inflates
opens 15–35% (CLAUDE.md notes this) and small lists with a real
audience routinely hit 50%+ opens.

**Approaches operators use:**

- **Stratechery (Ben Thompson):** No subject-line gimmicks. Subject = the
  headline (sometimes verbatim). Reader self-selects on "is this topic
  worth my Monday". Open rates measured by *clicks* + *replies*, not
  opens. AI Signal already follows this — track clicks + replies + unsubs,
  not opens (CLAUDE.md).
- **Lenny Rachitsky (Lenny's Newsletter):** Heavy use of "you" in the
  subject line — makes it feel like a 1:1 note. "Why your roadmap is
  failing" beats "5 reasons roadmaps fail".
- **Packy McCormick (Not Boring):** Subject line is a *take*, not a topic.
  "OpenAI is the next Salesforce" not "OpenAI's GTM strategy". Lands
  opinion in the inbox preview row.
- **Indian SaaS (Postman, Freshworks blogs):** Short subject + Hindi
  conversational phrase in preheader text. ("Monday ki shuruat ek take
  se" pattern).

**Fits AI Signal:** Stratechery (subject = throughline) + Packy (take
not topic) + small dose of Lenny's "you" framing. The current "The
router just ate vendor lock-in" follows this well.

---

## #002 — How do publications stop "everyone read it, nobody acted on it"?

**Problem:** Reader opens, reads, closes, does nothing. Suraj's spec
literally builds against this with Ship/Hold/Kill + Monday-action,
but the synthesizer often produces generic "this matters because…"
prose instead of a concrete copy-paste move.

**Approaches operators use:**

- **First Round Review:** Every long piece ends with a numbered
  "what to do this week" — 1, 2, 3, each ≤2 sentences, concrete enough
  to start in <10 minutes.
- **Lenny's:** Every issue has a "Action item" box. Format: "If you're
  a PM at X stage, do Y this week." Stage-gated, not generic.
- **Stripe Press / Sam Altman blog:** Doesn't try to action-ize — but
  writes claims so strong readers naturally argue with them. Argument
  = engagement = behavior change.
- **HackerNews "tl;dr-but-actionable":** Top comments routinely have a
  "If you read this, do X first" → high karma. People reward the
  specificity.

**Fits AI Signal:** The Steal block is the right slot for this but the
synthesizer is producing vendor-blurb prose (see
`learnings-user-audit.md` → Open). Pattern to enforce in prompt: "Steal
must be (a) a concrete copy-paste decision, (b) takeable on Monday in
<10 min, (c) ≠ vendor description."

---

## #003 — How do you survive Gmail Promotions tab as a small newsletter?

**Problem:** Bulk-sender heuristics (≥5K subs) demand RFC 8058
one-click POST + List-Unsubscribe-Post + SPF/DKIM/DMARC. Below 5K it's
softer but Gmail will still tab-route based on signals (image-heavy,
many links, "marketing" language).

**Approaches operators use:**

- **Substack/Beehiiv:** Image at top is a hard tab-Promotions signal.
  They've quietly stopped auto-inserting cover images for plain-text
  feel newsletters.
- **Ben Thompson:** Zero images, zero unsubscribe-related copy in body
  (just footer), text-heavy. Reads like a personal email.
- **Resend's own docs:** Their best-deliverability template is single-
  column, minimal images, body-text-first, CTA *secondary* not
  primary.
- **Indian newsletters (TheCore.in, MoneyControl Pro):** Plain-text
  alternative is non-trivial — they include a full text version, not
  a "view in browser" link. The plain-text shows up on Apple Watch /
  voice readers / low-bandwidth and signals deliverability.

**Fits AI Signal:** Already mostly there — single column, no top image,
text-heavy, lime CTA at bottom. Verify the plain-text `text` field in
`renderEmailHtml` is actually rich, not just a footer.

---

## #004 — How do you make a "weekly take" newsletter that doesn't run out of takes?

**Problem:** The throughline rule (CLAUDE.md #1) forbids manufacturing
a shift when none happened. So how do operators avoid weeks of
boring-to-write issues?

**Approaches operators use:**

- **Stratechery:** Doesn't try for weekly cadence on *every* topic. Has
  3-4 angles he rotates (strategy, history, current shift, policy) and
  picks whichever has the strongest evidence that week. AI Signal's
  6-layer structure does this implicitly — pick the layer with the
  strongest shift.
- **Anand Sanwal (CB Insights):** Hard rule: if no new shift, write the
  *meta* — "here's what didn't change this week, and why that's
  notable". Negative-space takes.
- **Packy:** "Stories from this week" framing — frame the news as a
  story arc even when the news is quiet, by pulling threads across
  multiple companies.
- **Indian context (Pranav Bhasin's Boring Operations):** Skip-the-week
  permission — explicit "no issue this week, here's why". Subscribers
  reward the honesty with retention.

**Fits AI Signal:** Combine #2 + #4. If a week truly has no shift,
publish a "no shift this week" issue — the synthesizer should detect
this and the human gate approves the skip. Better than manufacturing.

---

## #005 — Indian builders publishing in English: positioning that works

**Problem:** Indian audience but English language. How do you signal
"this is for India" without being kitschy (saffron-white-green tricolor
in the masthead)?

**Approaches operators use:**

- **Tanay Pratap (newsletter for Indian devs):** Rupee math in every
  example. Bangalore datelines. Names Indian companies first when
  illustrating a point ("Razorpay's auth flow", not "Stripe's"). The
  language stays English; the *examples* signal locale.
- **The Ken:** Bangalore byline + INR math + India-first examples + a
  short "this for the global reader" parenthetical when needed. Never
  hedges to global default.
- **Aravind Srinivas / Perplexity blog posts on India:** Calls out India
  GDP, India enterprise stack costs, India compute scarcity by name —
  even when the rest of the post is global.
- **Avoid:** Hindi-script headings (kitschy), Bollywood references (off
  for builders), tricolor anywhere in the design.

**Fits AI Signal:** Already follows this (CLAUDE.md anti-patterns
forbid tricolor). The "By Suraj Pandita, Bangalore" byline is the
dateline move. The INR-grounded math is the *math* block — needs to
actually surface in email (see user-audit Open #3).

---

## How to add an entry

When I solve a problem and the solution generalizes:

```
## #N — Problem phrased the way Suraj would phrase it

**Problem:** What he's hitting, in his framing.

**Approaches operators use:**
- **<Name / Publication>:** What they do, why it works.
- ...

**Fits AI Signal:** Which approach to apply, why.
```

Avoid filling with generic best-practice unless I've found a
specific operator using it. Speculative entries are noise.
