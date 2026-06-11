# Retention & Interactivity Audit — /issue/[id]

Scope: the live issue page (https://ai-signal-v2.vercel.app/issue/d6037c54-…).
Frame: 8-minute phone read on Monday morning, Stratechery/Air Mail register, locked palette.

---

## 1. What the current page does well

- **Editorial spine is intact.** Cover → 3-bullet skim → 6-layer diff → persona → calls → reading list → closure reads like a magazine feature, not a SaaS dashboard. The sticky chapter nav reinforces this without becoming a UI element you "use".
- **Single moment of colour per layer.** The 6-layer cards use beat colour as a small marker, not a fill — keeps Stratechery-grade restraint while still letting the eye scan beats.
- **Numbers are typographically heavy.** The INR math table reads as the page's center of gravity, which matches the brand promise ("we do the math you don't").
- **Steal-this hack got just enough polish.** Terminal dots + `$` prompt give one moment of texture without becoming theme-park.
- **Closure works.** The italic-on-dark band followed by a two-CTA stack (subscribe / forward) is honest — it asks for the right action at the right moment, after the read.

## 2. Current retention risks (phone)

- **No scroll feedback between chapters.** The sticky nav tells you "where to jump", but nothing tells you "how much further" — at minute 4, a phone reader has no felt sense of progress. This is the single highest skim-drop risk.
- **The 6-layer diff is six identical cards.** Without a way to visually weight them, a reader who only cares about `regulation` and `frontier-api` has to scroll past four equally-styled cards to find the two that matter.
- **INR math table is static.** The numeric reveal that defines the brief (₹X → ₹Y delta) lands as text. On phone, eyes glide past it.
- **No "save this quote" moment.** Readers who want to forward "one line to a coworker" (the locked brand promise) have to manually select → copy → paste → format. That's 3–4 taps too many.
- **Chapter 04 (Steal this) and Chapter 05 (The calls) read at similar weight.** A reader skimming will not know which is the opinionated call vs. the production hack.

## 3. Ranked additions

| rank | name | description | retention/conversion effect | effort | risk | dep |
|---|---|---|---|---|---|---|
| 1 | Reading progress bar | 2px peacock line at top of viewport, fills as you scroll the article body (not whole doc) | Closes the "how far am I" gap — endowed-progress effect is well-documented on long reads ([CSS-Tricks](https://css-tricks.com/reading-position-indicator/), [UX Collective](https://uxdesign.cc/pros-and-cons-of-progress-indicator-as-a-scroll-bar-345f19967cb6)) | S | low | none (scroll + CSS var) |
| 2 | INR count-up on math table | Each ₹ value animates 0 → final, 600ms easeOut, fires once when row enters viewport | Turns the page's defining moment into a micro-event; mirrors NYT-interactive numeric reveal pattern | S | low | none (`IntersectionObserver` + `requestAnimationFrame`, ~30 LOC) |
| 3 | Highlight-to-share popover | Select text → small floating bar with "Copy", "WhatsApp", "X" (uses native `Selection` + `share:` urls) | Directly serves the "forward one line to a coworker" promise — pattern proven by Medium ([Thinkmill writeup](https://www.thinkmill.com.au/blog/share-text-selection-to-twitter)) | M | low | none (Selection API + popper math, ~80 LOC) |
| 4 | Anonymous bookmark (localStorage) | Tiny bookmark glyph on each chapter heading + Ship/Hold/Kill card; saves `{issueId, anchor}` to `localStorage` and renders a "Saved" list on `/saved` | Pulls readers back mid-week without auth; aligns with anonymous-first constraint | M | low | none |
| 5 | Sticky reading-time-remaining | Replace "8 min read" once you scroll into article: `~4 min left` updates per chapter, integrated into existing sticky nav | Reinforces progress bar with a number; pattern from Medium/Substack | S | low | none |
| 6 | Inline sidenote / footnote pop | `sup` link → inline expand (mobile) or right-margin sidenote (≥1024px), Tufte-style. Use for source citations on each diff card | Adds journalistic credibility without leaving the page; ([Tufte CSS](https://edwardtufte.github.io/tufte-css/), [gwern.net/sidenote](https://gwern.net/sidenote)) | M | low | none (CSS + `<details>` fallback) |
| 7 | Diff-layer visual weight (NOT a filter) | Add a subtle "Most active this week" badge (terracotta dot, no fill) to the 1–2 beats with the densest evidence, ranked by Stage 4. No toggle. | Solves "6 equal cards" problem without breaking editorial spine. A filter would let users hide the throughline — refuse. | S | low | none |
| 8 | Smooth-scroll + chapter pulse on nav tap | Tap chapter dot → smooth scroll + the chapter heading does a 220ms peacock underline pulse | Confirms tap registered on phone where scroll-jump can feel jarring | S | low | none (CSS keyframe) |
| 9 | Dark-mode crossfade | Replace instant theme swap with 180ms `color`/`background` transition on `:root` (respect `prefers-reduced-motion`) | Tiny polish that signals craft on a moment users notice | S | low | none |
| 10 | "Forward this issue" prefilled WhatsApp/email at closure | Closure CTA "Forward to one builder" → opens WA/email with subject + first-3-bullet skim prefilled, no app install | Direct conversion lift on the brand-promise CTA; doesn't require any account | S | low | none (`https://wa.me/?text=` + `mailto:`) |

Deliberately rejected: SpeechSynthesis read-out (browser voices are uncanny on Indian English; ElevenLabs adds ~₹4–8/issue × 50K subscribers — not worth it pre-launch); diff-layer filter (lets users hide the editorial throughline — breaks rule #2); Framer Motion (34 KB standard, 4.6 KB with `LazyMotion` per [motion.dev](https://motion.dev/docs/react-reduce-bundle-size) — still unnecessary; everything ranked above is CSS + native APIs).

## 4. Visual ideas worth experimenting with (max 5)

1. **Drop-cap on cover lead paragraph** — Fraunces, ~3.5 line-height, ink colour, hangs in left margin on `≥768px`. One per issue, on the lead only. Magazine-DNA cue.
2. **Beat-coloured chapter-close glyph** — at the end of each chapter, a single 8px dot in the beat's accent colour, centered, with 48px vertical breathing room. Quietly separates chapters without a `<hr>`.
3. **Tiny inline INR delta bar** — beside each math row, a 40px-wide horizontal bar showing before/after ratio in terracotta. No axis, no label. Sparkline-style. Yes if the row already has two ₹ values; otherwise skip.
4. **Pull-quote with terracotta left rule** — exactly one per issue, picked by the synthesizer (not auto). Already in design system; just enforce "one max, between chapter 03 and 04".
5. **Devanagari ornament on closure** — a single Mukta SemiBold "॥" glyph above the closure italic line, peacock, low opacity. One per issue, masthead echo. Skip if it feels precious in a test.

The rest (parallax cover, animated SVG diffs, scroll-driven cover, beat-colour gradient hero) are **no**. They read as "look how interactive" and undermine restraint.

## 5. What NOT to build

- **No comments / discussion section.** Community moderation costs Suraj editorial hours, and a comment thread on a Monday brief invites takes, not signal. The reply channel is email reply.
- **No diff-layer filter.** Letting readers hide layers (e.g. mute `regulation`) means a Bengaluru founder skips the GST update that breaks their pricing model. The brief's spine is "we picked these six on purpose."
- **No scroll-driven cover animation / parallax.** Monday morning, phone, train commute — a moving cover feels gimmicky and slows first paint. The cover earns trust through restraint.

## 6. Recommended top 3 to implement next

1. **Reading progress bar (#1).** Highest retention impact per LOC. Zero deps, zero risk, directly addresses the highest skim-drop point (no felt sense of progress at minute 4). One afternoon.
2. **INR count-up on math table (#2).** Turns the brief's defining differentiation (INR math) into the page's most memorable moment, with zero new deps and ~30 LOC. Compounds the brand promise.
3. **Highlight-to-share popover (#3).** Directly serves the "forward to one builder" CTA at the closure, which is the only growth loop the product has pre-paid acquisition. A reader sharing a highlighted line is a higher-intent referral than the generic Forward CTA.

Implement in that order; ship behind no flag — all three are <100 LOC each and degrade gracefully.

---

**Sources consulted:** [Tufte CSS](https://edwardtufte.github.io/tufte-css/), [Gwern on sidenotes](https://gwern.net/sidenote), [CSS-Tricks reading position indicator](https://css-tricks.com/reading-position-indicator/), [UX Collective progress-bar tradeoffs](https://uxdesign.cc/pros-and-cons-of-progress-indicator-as-a-scroll-bar-345f19967cb6), [Thinkmill select-to-tweet React build](https://www.thinkmill.com.au/blog/share-text-selection-to-twitter), [Motion bundle-size docs](https://motion.dev/docs/react-reduce-bundle-size), [Bundlephobia framer-motion v12.38](https://bundlephobia.com/package/framer-motion), [ElevenLabs API pricing](https://elevenlabs.io/pricing/api), [The Generalist on Substack](https://www.generalist.com/), [Lenny's Newsletter](https://www.lennysnewsletter.com/).
