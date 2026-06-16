# Claude self-learning log — blunders to never repeat

A running ledger of mistakes I made while working in this repo so I (and
future me) don't burn Suraj's time on the same class of bug twice.

**How to use this file:**
- Every time Suraj flags a bug that was "silly" / "blunder" class — caught
  only because a real human looked at the real output — append a numbered
  entry below with: the symptom, the root cause, the fix, and the
  one-sentence rule to follow next time.
- Before declaring an email/UI change "done", grep this file for the
  surface I'm touching and re-check the listed traps.
- Anchor reference: `CLAUDE.md` (project rules) + `.claude/design-quality-rubric.md`.

---

## #001 — Email rendered white / all colors stripped (2026-06-16)

**Symptom (Suraj):** "colour poora mat ho gya hai, white dikh raha hai"
— the styled dark Figr v3 email arrived in Gmail looking like a default
white-background, default-font message.

**Root cause:** font-family constants in `src/lib/email-template.ts`,
`src/lib/deep-dive-email.ts`, and `src/components/article/email-blocks.ts`
were declared with **double-quoted** multi-word font names:

```ts
// WRONG
const FONT_BODY = '-apple-system, BlinkMacSystemFont, "Segoe UI", ...'
```

These constants get interpolated directly into HTML `style="..."`
attributes via template literals:

```ts
`<body style="font-family:${FONT_BODY};">` // <body style="font-family:-apple-system, "Segoe UI", ...">
```

The first literal `"` inside the value **closes the style attribute early**
in the HTML parser. Everything after it becomes broken / ignored markup —
no background, no color, fallback fonts. Gmail's default white surface
shows through.

**Why I missed it:**
- I screenshot-tested via Playwright's `chromium` engine and the page
  *renders* even when the attribute is broken — the parser is forgiving,
  the broken style just falls back silently to defaults. The Playwright
  shot looked "fine-ish" on a dark page background, so the regression was
  invisible to my QA loop.
- I never inspected the raw rendered HTML with `grep style=` or opened it
  in a real email client (Gmail web, Apple Mail). I trusted the
  Playwright screenshot.
- I added `escapeHtml()` discipline for user-supplied content (`inline`,
  `paraInline`) but the *constants I controlled* never went through
  escaping. I assumed "I wrote this literal, it's safe" — but the rule
  isn't about trust, it's about *delimiter collisions*.

**Fix:** use SINGLE quotes around multi-word font names so they coexist
with the outer `style="..."` double quotes:

```ts
// RIGHT
const FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', ..."
```

**Rule for next time:**
- **Any string literal that gets interpolated into a `"..."` attribute
  must not itself contain `"`.** Audit `const FONT_*`, `const ASSET_*`,
  any preamble/banner constant, etc., for embedded double quotes before
  shipping.
- **Before shipping an email change, view-source the rendered HTML and
  grep for malformed style attributes** (`grep -oE 'style="[^"]*"'` and
  scan for closes earlier than expected). Don't trust the rendered
  screenshot alone — Gmail/Outlook parsers fall back silently.
- Even better: open the rendered HTML in actual Gmail web before
  declaring done. Email is the only surface that matters for this app,
  and Gmail's rendering quirks differ from Chromium.

---

## #002 — "Read the full issue" button → dead link (2026-06-16)

**Symptom (Suraj):** "usmein jo link hai woh bhi nahi chal raha"
— the prominent CTA in the test email led to a timeout / unreachable page.

**Root cause:** the email's CTA pointed at `https://getaisignal.org/...`
because:
1. The hardcoded fallback in `email-template.ts` / `deep-dive-email.ts`
   uses `process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getaisignal.org'`.
2. The `NEXT_PUBLIC_SITE_URL` env var was set to **empty string `""`**
   on Vercel production (and unset locally), so the `??` fallback never
   fired (`??` only catches `null`/`undefined`, not `""`).
3. `getaisignal.org` resolves to Namecheap's parking IP (`162.255.119.78`)
   — the domain was never aliased to the Vercel project, so every link in
   every email points to a timeout.

Compounding: `/preview/email/[issueId]/route.ts` never passed `siteUrl`
to `renderEmailHtml()`, so previews ALWAYS showed `getaisignal.org`
regardless of env — masking the env-var bug during local QA.

**Why I missed it:**
- I never clicked a link in the rendered email myself. I checked that the
  email *body* looked right and assumed link targets were correct.
- I checked custom-domain DNS only AFTER deploy when Suraj's links broke.
  Should have been the first thing I verified before deploying anything
  that emits emails.
- I treated `??` as "use this when the value is missing" without
  remembering it only catches nullish — `""` is a real value.

**Fix:**
1. Set `NEXT_PUBLIC_SITE_URL=https://ai-signal-v2.vercel.app` on Vercel
   production (and in `.env.local`).
2. Pass `siteUrl: process.env.NEXT_PUBLIC_SITE_URL` from the preview
   route so previews match production.
3. Suraj needs to alias `getaisignal.org` to the Vercel project + update
   Namecheap DNS to flip back to the canonical brand URL.

**Rule for next time:**
- **Before declaring an email surface "done", click every link in the
  rendered HTML and verify each returns 200.** Use:
  `for u in $(grep -oE 'href="https?://[^"]+"' rendered.html | sed 's/href="//; s/"//'); do echo "$u $(curl -sLo /dev/null -w '%{http_code}' --max-time 10 $u)"; done`
- **Before deploying anything that hardcodes a domain in `??` defaults,
  verify the env var is set (not just present) AND the domain resolves
  to the expected host** (`dig +short` / `curl -I --max-time 5`).
- **`??` only catches null/undefined.** When defending against
  misconfigured env, use `process.env.X || 'fallback'` (or trim+check
  empty) — empty string is a real value that breaks the `??` semantics.
- **Custom-domain DNS is part of "deployed".** A successful Vercel deploy
  doesn't mean the canonical brand URL works. Check `dig +short
  yourdomain.com` lands on Vercel IPs (76.76.21.21 or similar) before
  trusting any link.

---

## #003 — `.map(inline)` broke when `inline()` gained an optional arg (2026-06-16)

**Symptom:** typecheck error after adding optional `anchorClass` param
to `inline()`:
```
Argument of type '(s: string, anchorClass?: string) => string' is not
assignable to parameter of type '(value: string, index: number, ...) => string'.
```

**Root cause:** Array.prototype.map passes `(value, index, array)` to its
callback. When `inline(s: string)` had a single param, `.map(inline)` was
fine — extra args ignored. When I added `anchorClass?: string`, the
callback's second slot became a `string`, which clashes with map's
`number` index.

**Fix:** wrap in an arrow: `.map((s) => inline(s))`.

**Rule for next time:**
- **Before adding an optional param to a function used as a callback,
  grep for `.map(fnName)`, `.filter(fnName)`, `.forEach(fnName)`,
  `.then(fnName)` — they pass position args you may not have planned
  for.** If hits exist, either rewrite callsites to wrap the call
  (`.map((x) => fn(x))`) or split into two functions.

---

## #004 — `vercel env add` without `--value` flag silently saves empty string (2026-06-16)

**Symptom:** `printf "url\n" | vercel env add NAME production` returned
"Saved" but `vercel env pull` showed `NAME=""`. Tried again with
`echo "url" | ...` — same result.

**Root cause:** Vercel CLI's interactive prompt for env value doesn't
read piped stdin reliably in non-TTY contexts. The CLI thinks it got
empty input and silently saves it.

**Fix:** always use `--value "..."` flag for non-interactive scripts:
```bash
vercel env add NAME production --value "https://example.com" --yes
```

**Rule for next time:**
- **For any CLI that has both interactive prompts and `--value`/`--input`
  flags, use the flag form in non-TTY contexts** (Claude Code, CI, any
  background script). Stdin piping into interactive prompts is fragile.
- **After setting an env var via CLI, immediately `vercel env pull` and
  grep for the expected value** before assuming it took. "Saved"
  messages can lie if the input parsing failed silently.

---

## #005 — Identical "Interview Questions" appendix on every issue page (2026-06-16)

**Symptom (Suraj):** "interview quetsion sab meien same hai" — every
`/issue/[id]` page had the same 6 hardcoded questions ("If you were on
Claude's PM team, how would you ship a v0..."). Across all 4 published
issues, byte-for-byte identical content in a section that pretended to
be issue-specific ("Questions to pressure-test this with").

**Root cause:** `INTERVIEW_QUESTIONS` const in `ArticleRenderer.tsx`
hardcoded 6 generic Anthropic/OpenAI prep questions. The section was
left over from an earlier framing (Bay Area interview-prep audience),
not updated when CLAUDE.md positioning locked to "India AI Builder's
Brief". Off-brand AND identical-across-issues.

**Why I missed it:**
- I never opened two issue pages side-by-side as a reader. If I had,
  the duplicate section would have been obvious in 5 seconds.
- I focused QA on per-issue rendering (does this issue's payload show?)
  not cross-issue diff (does every issue look the same below the
  chapters?).
- The section had legitimate-looking copy and matched the design
  system, so it didn't trigger any "wrong" alarm — only a real reader
  with read 2+ issues would notice.

**Fix:** Removed the entire INTERVIEW PREP section + the const from
ArticleRenderer.tsx. The closure beat ("That's the shift. You're
caught up.") now follows the chapters directly, which matches the
CLAUDE.md locked structure (closure as the final beat).

**Rule for next time:**
- **Open 2 issues side-by-side before declaring a per-issue surface
  done.** Anything that's identical across issues but pretends to be
  per-issue is either lazy or wrong — cut or generate from payload.
- **When the spec changes (CLAUDE.md positioning lock 2026-06),
  re-walk every surface and ask "is this section still on-brand?"**
  Off-brand sections accumulate when nobody re-audits them.
- See `.claude/learnings-user-audit.md` checklist — added
  "no identical-across-issues sections" as a gate.

---

## #006 — Email weekly was 90% Steal callout — too thin (2026-06-16)

**Symptom (Suraj):** "email mein toh mza nhi aaya... email mein kitna
blit aata hai" — the weekly email body was just Glance (Ship/Hold/Kill
in 3 lines) + Steal (one long callout) + CTA. The 6-layer diff, INR
math, keep/skip — all stayed web-only. Reader gets ~20% of the
substance in inbox, has to click to get the rest.

**Root cause:** `EMAIL_RENDERS_BLOCKS` was `['glance', 'steal']` —
every other block type was in `EMAIL_SKIPS_BLOCKS`. The original
framing was "email is a teaser, web is the full read." But "teaser"
that's mostly one callout reads as low-substance.

**Why I missed it:**
- I tested the email by rendering it and checking it didn't crash. I
  didn't read it as a reader and ask "would I keep subscribing if this
  arrived weekly?"
- The original design decision (teaser-only) was respected without
  questioning it — but the spec literally says CLAUDE.md positioning
  is "1500 words, 8 min read" and a body with 6 short lines isn't
  that.

**Fix:** Added `renderEmailLayers` (6-layer diff in email) +
re-classified `'layers'` as a rendered block. The 6 beats now appear
in the email as a scannable list — that's the editorial substance.
INR math + keep/skip are noted in user-audit as open (next round).

**Rule for next time:**
- **Read the email as a reader before declaring done.** "Would I
  open the next one if this arrived?" If the answer is no, the
  surface isn't done — even if it compiles and screenshots fine.
- **When a surface is positioned as "teaser", check the substance
  ratio.** If >60% of the email is one block (callout / quote / CTA),
  it's a teaser of nothing — promote more chapters.

---

## Meta-rule

**Trust nothing you can verify with a one-liner.** When the work involves
external state (DNS, env vars, email clients, etc.), a 5-second `curl`,
`dig`, or `grep` after the fact catches the silent-failure class of bug
that Playwright screenshots and TypeScript can't see.
