# AI Signal — Design System v12 (Editorial Workshop)

This file is the canonical design system. Every render, every component,
every page reads against these tokens. When in doubt, the rules here win.

The pattern comes from `Dammyjay93/interface-design` skill — persistent
system.md so design decisions don't reset between sessions. The rules
follow `anthropics/frontend-design` discipline (anti-AI-slop) + industry
workflow consensus (Karthik Mulugu / Felix Lee / Pasquale Pillitteri).

---

## 1. The brief (one sentence)

A weekly editorial brief for AI builders worldwide, written from
Bangalore. The page should read like a craft journal — opinionated,
text-led, signature in one place — not like a SaaS landing.

---

## 2. The 3 AI-slop clusters we DO NOT ship

Anthropic's frontend-design skill names these explicitly. Any future
change that re-introduces any of them gets reverted on review.

1. ❌ Warm cream bg (#F4F1EA) + high-contrast serif + terracotta accent
2. ❌ Near-black bg + acid-green OR vermilion accent
3. ❌ Broadsheet hairline rules + zero border-radius + dense newspaper columns

Our v3, v4 / cream Lenny, and v11 Stratechery all fell into one of these.
The fix is below.

---

## 3. Banned fonts

`Inter`, `Roboto`, `Open Sans`, `Lato`, `Source Sans Pro`. Default system
fonts. Anything that signals "I'm an AI default."

## 4. Locked typography

| Role | Family | Weights | When |
|---|---|---|---|
| Display | **Bricolage Grotesque** (variable) | 500 / 600 / 700 / 800 | Headlines, h1, h2, signature numerals |
| Body | **Source Serif 4** (variable, opsz 8–60) | 400 / 500 / 600 italic 400/500 | All body prose, dek, italics for em |
| Data / labels | **JetBrains Mono** | 400 / 500 / 600 | All-caps eyebrows, dates, numeric data, marginal annotations |

Type scale (use 3× jumps, not 1.5×):
- Display h1: 64px desktop / 40px mobile, leading 1.04, tracking -0.02
- Display h2: 32px / 28px, leading 1.15, tracking -0.015
- Display h3: 24px / 22px, leading 1.2
- Body p: 19px / 17px, leading 1.7
- Eyebrow label: 13px uppercase tracking 0.08, JetBrains Mono 500
- Marginal annotation: 11px JetBrains Mono 500

---

## 5. Locked palette (5 colors, named)

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#f4f0e8` | Body background. Warm-paper, NOT cream (#F4F1EA is banned, this is greener). |
| `--ink` | `#1a1815` | Primary text. Soft warm black, NOT pure black. |
| `--mid` | `#6b6862` | Secondary text, muted prose. |
| `--signal` | `#a8442b` | Burnt sienna accent — Indian-monsoon-saturated, NOT terracotta. Used for the SIGNATURE moment only. |
| `--annotation` | `#284b8a` | Deep cobalt for links, marginal labels, secondary accent. |

Boldness budget: spend `--signal` once per page. Everything else uses
`--ink`, `--mid`, `--annotation`. No washes. No tints. No gradients.

---

## 6. The signature element (the one memorable thing)

**Marginal annotations** (Edward Tufte–style). On desktop, a thin
column to the RIGHT of the main body holds JetBrains Mono labels for
each section: `§01 SHIFT`, `§02 MATH`, `§03 CALLS`, etc. They run
alongside the paragraphs they label. On mobile, the marginal labels
collapse into eyebrow-style labels above each section heading.

This is the only thing that's distinctive about the layout. Everything
else is restraint: single column body, no decorative borders, no
section-color identities.

---

## 7. Spacing & layout

- Container max-width: 1100px on desktop with a 200px right-rail for
  marginal annotations → body column ~720px
- Mobile: single column, 20px gutters
- Section vertical rhythm: 56px between sections, 24px between paragraphs
- Border-radius: 0 for inline elements; 4px for buttons (mixed, not zero-everywhere)
- Backgrounds: solid `--paper`. No gradients, no patterns.
- Hairlines: 1px `--mid` at 20% opacity for section dividers only

---

## 8. Motion

- One orchestrated page-load: 80ms staggered fade-in on the title block
  (title → dek → meta → first paragraph).
- NO hover micro-interactions on body content.
- Hover lift on subscribe buttons only.
- Respect `prefers-reduced-motion: reduce` everywhere.

---

## 9. Copy discipline

- Sentence case in UI; title case never except for proper nouns.
- Active voice ("Subscribe to AI Signal", not "Get signed up").
- No "delve / leverage / utilize / holistic / cutting-edge."
- No "essentially / fundamentally" in explainers (Feynman discipline).

---

## 10. Quality floor

Before any deploy, the page must:
- [ ] Render readable at 360px viewport
- [ ] Have visible :focus-visible state on every interactive element
- [ ] Pass `prefers-reduced-motion` (no motion when reduced)
- [ ] Contain real content (no `Lorem`, no placeholder)
- [ ] Have at least one signature moment (the marginal annotations on /issue)
- [ ] Not contain any of the 3 banned palette/font combinations from §2

---

## 11. References (drop screenshots here)

`Reference/` folder convention from Pasquale's guide. When designing,
screenshot the reference, save to that folder, and prompt with the
filename so the model has visual context.

Targets to use as inspiration:
- `Reference/stratechery-2024-end-of-the-beginning.png` — body discipline,
  serif rhythm, restraint
- `Reference/whitespace-sajith-pai.png` — Indian editorial voice +
  framework-naming
- `Reference/the-ken-longform.png` — Indian premium editorial layout
- `Reference/tufte-envisioning-information.png` — marginal annotations,
  small multiples

---

## 12. Change log

- 2026-06-18 v12 created. Triggered by user feedback "bakwas" after
  v3 (dark Figr), v4 (cream Lenny), v11 (Stratechery clone) all fell
  into one of the 3 banned AI-slop clusters. Anthropic frontend-design
  skill + Pasquale's 18-skill guide + Felix Lee's workflow + Karthik
  Mulugu's shadcn/Playwright loop consulted.
