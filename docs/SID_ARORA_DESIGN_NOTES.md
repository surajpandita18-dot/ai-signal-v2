# Sid Arora — JustAnotherPM design teardown

> One-line summary: **Sid Arora writes JustAnotherPM (japm.substack.com), a PM/AI-product Substack with "tens of thousands of subscribers"; the single move worth stealing is the warm cream paper (`#fffcf6`) + Lora serif body + zero-chrome single 728px column — restraint is the whole brand.**

Verified directly from the live HTML/CSS at `japm.substack.com` and the Substack theme bundle `main.5369f1b1b4826550832f.css` on 2026-06-12.

---

## 1. Identity confirmed

- **Person:** Sid Arora — AI Product Manager (UK-based, India-origin). LinkedIn: `linkedin.com/in/siddhartharoraisb`. Also publishes on Medium as `siddarora`.
- **Newsletter:** **JustAnotherPM (JAPM)** — `https://japm.substack.com`
- **Tagline:** "The most actionable tricks to become a truly excellent product manager."
- **Scale:** Substack's meta description says "tens of thousands of subscribers." Substack profile id `2720860`.
- **Topic mix (last 90 days, from sitemap):** Mixture-of-Experts explainers, Spotify's 6 AI agents, Grab personalisation, AI/LLM observability, Claude vibe-coding, Notion productivity wars, AI agent memory, LinkedIn recommendations, Figma history. India-adjacent posts mixed in: Rapido, Zomato, Blinkit, PhonePe, UPI-goes-global, JioHotstar, ONDC. Cadence ~3–8 posts/month.
- **Why this fits Suraj's reference:** AI-PM newsletter, India-fluent writer, post titles read like the "named shift" format AI Signal aims for. Visually it's the warm-cream-paper aesthetic Suraj already locked.

Candidates ruled out:
- *Sidd Pagidipati / Sid Sahasrabuddhe* — no significant newsletter footprint surfaced.
- *Siddharth Shah's Newsletter* (`siddharthsshah.substack.com`) — early-stage VC, not a Sid Arora.
- *Siddharth Singh* (`qiro.substack.com`) — unrelated.
- *Siddharth Agarwal "Under Currents"* — personal essays, not PM/AI.

---

## 2. Layout breakdown

- **Architecture:** Standard Substack "Pillar/Classic" theme, customised only via theme tokens. No bespoke React. No sidebar.
- **Homepage:** Cover-hero masthead (publication name as H1 in the publication's serif heading font, balanced text wrap via `balancedText-oQ__Kv`), publication tagline below, single big email-capture form (`full-email-form`), then a vertical archive list. No tag chips, no grid, no author photo dominating the fold.
- **Post page:** Single column, centred. Substack's `.single-post-container` uses `max-width: 728px` for the body (and `max-width: 680px` for cover images). Margins collapse to ~16px gutters on mobile (`width: calc(100vw - 30px)` on tooltips, mirroring body padding).
- **Mobile:** True mobile-first. Viewport meta is `width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover`. Subscribe CTA is a full-width tap target. No two-column states at any breakpoint — the layout simply re-flows.
- **Above-the-fold of a post:** `H1 post-title` → `H3 subtitle` (the "deck"/subhead — this is where Sid drops the promise of the issue, set in a lighter weight grey) → byline row with small avatar + name + date → cover image → body.

---

## 3. Typography

Sourced from the rendered HTML + Substack's `main.css`.

- **Body serif:** **`Lora`** (Google Fonts, served from `fonts.gstatic.com`). 27 references to `font-family:'Lora'` in a single post's HTML. Lora is a Cyrillic-friendly transitional serif — warmer than Georgia, more screen-tuned than Merriweather.
- **Headings:** Inherit `--font_family_headings_preset` → falls through to `--font-family-title`. On JAPM this resolves to **Lora** as well (both heading and body are Lora — a single-family stack). The cover post-title variant (`post-title--the-pillar`) explicitly overrides to `Georgia, serif` at `40px / 48px`.
- **UI/chrome text:** system stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", …`.
- **Sizes (from `main.css`, defaults):**
  - Post title: `font-size: var(--font-size-32)` / `line-height: var(--line-height-36)` (≈32/36 px on desktop, scales up on the "Pillar" variant to 40/48 px).
  - Subtitle / deck: `19px / 28px`, `font-weight: 400`, colour `var(--print_secondary)` (the muted grey).
  - Body paragraphs: `font-size: var(--font-size-20)` (≈20 px) at desktop, with `line-height ~1.5–1.6em`. Mobile remains ≥17 px — never collapses to 14.
  - Weights observed in HTML: 400 (body), 500 (UI), 600 (subheads/byline name), 700 (title only). No 800/900.
- **Italics & emphasis:** Lora's italic is the workhorse. Drop caps not used. No small-caps tricks.

---

## 4. Colour palette

Extracted hex codes by frequency from a rendered post's HTML:

| Hex | Role | Notes |
|-----|------|-------|
| `#fffcf6` | **Paper / web bg** | The whole brand. Set as `theme-color` meta, so iOS Safari address bar matches. Warmer & lighter than AI Signal's locked `#F5F1E8`. |
| `#363737` | Primary ink | Near-black with a green-grey cast (not pure `#000`). |
| `#51504e` | Body secondary | Used for deck/subtitle and meta lines. |
| `#757575` / `#868683` / `#92918d` | Muted greys | Byline date, footer, divider text. |
| `#b6b6b6` / `#b7b5b1` / `#dddad5` / `#e6e3dd` / `#f0ede7` | Tonal greys | Hairline borders, hover states, image placeholders — all warm-tinted to match the paper. |
| `#FF6719` / `#ff6b00` | Substack brand orange | Only on the Substack logo/wordmark — Sid hasn't customised away from default. |
| `#f8a848` / `#f79c2f` / `#a77700` | Amber accents | Appear in Substack chrome (chat, recommendations widgets). Not used in editorial. |
| `#ffffff` | Pure white | Used **only** in inverted UI (buttons, modals), never as page background. |

Editorial palette is essentially **three colours**: cream paper, near-black ink, one muted grey. That's it. Substack's orange is the only chromatic accent and Sid hasn't replaced it — meaning a *custom* AI Signal accent (indigo `#1E3A8A` / clay `#9A3412`) would be a clear visual differentiator while keeping the same restraint.

---

## 5. Five specific moves worth stealing

### 1. The cream `#fffcf6` paper, locked to `theme-color`
**What:** Single warm-cream background everywhere, declared as `<meta name="theme-color" content="#fffcf6">` so iOS Safari's status bar/address bar matches and the page feels physical edge-to-edge.
**Why for AI Signal:** Our locked palette already has `--paper #F5F1E8`. JAPM proves the move works at scale on small screens. Add `theme-color` to `/issue/[id]` and the email's preview pane.
**Difficulty:** Trivial — one meta tag. The web/email already uses warm paper.

### 2. Single-family Lora stack (one serif everywhere)
**What:** Body, H1, H2, subtitle, byline — all Lora. The Substack CSS lets you override per-element, but Sid doesn't bother. The whole post reads as one typographic voice with weight (400/600/700) doing all the hierarchy work.
**Why for AI Signal:** We currently spec Merriweather body + Geist heading + Geist Mono meta — three families. Trying Lora as a single-stack experiment for the web archive could feel more "newsletter" and less "SaaS dashboard." (Keep Georgia in email — Lora isn't safe there.)
**Difficulty:** Medium. Means revisiting the locked design system. Worth A/B with Merriweather body + Geist heading.

### 3. The H3 deck/subtitle in `#51504e` at 19/28
**What:** Every post has a one-sentence "deck" between H1 and byline, set in the same serif at 19 px / 28 px line-height, weight 400, in a softer ink (`#51504e`) than the body. It's the throughline restated — and it sells the click.
**Why for AI Signal:** This is exactly where the "throughline" sits in our locked structure. Right now the spec says H1 throughline → 3-bullet Executive Skim. A muted serif deck between H1 and the bullets would do real work for skimmability without adding chrome.
**Difficulty:** Low. One additional schema field (`deck` / `subhead`) + one CSS rule.

### 4. Zero per-section icons, zero emoji, zero gradients
**What:** Across multiple posts there are **no** emoji in section headers, no icons next to H2s, no coloured boxes, no card backgrounds within the article column. Every visual idea is carried by typography + the single hairline divider (`#dddad5`).
**Why for AI Signal:** Our spec's visual anti-patterns list this exactly. JAPM is the proof point: a high-subscriber newsletter doing zero decoration. It also means our 6-layer diff can drop the urge to give each beat an icon — labels in mono + a hairline rule is enough.
**Difficulty:** Free. It's a discipline, not a feature.

### 5. Sitemap as the public archive
**What:** `japm.substack.com/sitemap.xml` exposes ~120 post slugs with `lastmod` dates. The post slugs read as full sentences ("why-is-spotify-using-6-ai-agents", "stop-using-the-biggest-ai-model-for"). The titles are the SEO.
**Why for AI Signal:** Two things — (a) slug discipline. Our issue URLs at `/issue/[id]` could be `/issue/2026-06-15-the-india-ai-builders-brief-frontier-api-collapse` style for free organic discovery + LinkedIn share previews. (b) A static `/sitemap.xml` is one Next.js route. Substack-cheap SEO without Substack.
**Difficulty:** Low. Next.js `app/sitemap.ts` is ~20 lines.

---

## 6. What NOT to steal

- **Substack's default Subscribe popup intro.** It interrupts on first scroll. We control our own email signup — keep it inline, never modal.
- **The Substack orange (`#FF6719`).** It's their brand, not Sid's. Our indigo + clay accents are *more* defensible because they say "not Substack."
- **The single big cover image at the top of every post.** Substack defaults to this and it nudges writers toward generic stock or AI-generated imagery. Our locked spec explicitly avoids stock photography — keep that. A typographic masthead beats a cover image for editorial credibility.
- **728 px column width.** It's fine for casual reading but a touch wide for an 8-min synthesis brief with INR-math tables. We should test 640–680 px — the dense-data zone where The Economist and Stratechery sit.
- **Single-family Lora in email.** Lora isn't a web-safe email font and will fall back to a stack we don't control. Keep Georgia for email body even if we adopt Lora for web.
- **No mono/meta typography.** JAPM has nowhere for "the 6-layer diff" labels — they'd benefit from a mono kicker (`FRONTIER-API · 2026-06-12`). That's a place we should *diverge* from Sid, not copy him.
- **Tagline on hero ("most actionable tricks").** Generic PM-influencer voice. Our masthead voice should stay editorial-restrained.

---

## Source URLs (for reference)

- `https://japm.substack.com/`
- `https://japm.substack.com/about`
- `https://japm.substack.com/sitemap.xml`
- `https://japm.substack.com/p/everything-you-must-know-about-mixture` (sample post inspected)
- `https://japm.substack.com/p/why-is-spotify-using-6-ai-agents` (sample post inspected)
- `https://substackcdn.com/bundle/theme/main.5369f1b1b4826550832f.css` (theme bundle)
- `https://uk.linkedin.com/in/siddhartharoraisb` (author identity)

Word count ≈ 1,380.
