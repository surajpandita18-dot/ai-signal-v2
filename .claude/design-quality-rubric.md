# Design Quality Rubric
> A reusable standard to check any design against before shipping — web, desktop, mobile, and email. Score each parameter 1–5. Concrete thresholds, not vibes. Hard gates at the bottom must all pass regardless of score.

**How to use:** score each parameter. **Ship gate: nothing below 3, and every "HARD GATE" (§11) passes.** Aim for an average ≥4.0 for "premium". Re-check on real rendered output (screenshots at real widths), not in your head.

---

## 1 · Typography & Readability
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 1.1 | **Body size** | ≥15px body on web; ≥16px ideal for long-form | 16–18px, comfortable |
| 1.2 | **Line height** | 1.5–1.8 for body prose | 1.6–1.75, consistent |
| 1.3 | **Line length (measure)** | 45–90 characters per line | 60–75 cpl, capped via max-width |
| 1.4 | **Font pairing** | ≤2–3 families, clear roles (headline / body / UI) | a refined serif headline + clean body + mono where needed |
| 1.5 | **Tracking** | not cramped; labels/caps get letter-spacing | airy display, tracked uppercase labels |
| 1.6 | **Hierarchy of sizes** | clear step between H1/H2/body/caption | a deliberate type scale, not random sizes |

## 2 · Colour & Contrast
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 2.1 | **Body contrast** | ≥4.5:1 text-on-background (verify ancestor-resolved) | comfortably above, warm not harsh |
| 2.2 | **Large-text contrast** | ≥3:1 for ≥24px / bold ≥18.66px | — |
| 2.3 | **Palette discipline** | ≤1 primary accent + neutrals | muted base, one accent used sparingly |
| 2.4 | **Accent restraint** | accent on focus moments only, not everywhere | rare, intentional pops |
| 2.5 | **No pure black on pure white** | softened (warm ink / off-white) | warm, editorial neutrals |

## 3 · Spacing & Layout
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 3.1 | **Whitespace** | content breathes; sections separated | generous, confident negative space |
| 3.2 | **Consistent rhythm** | spacing follows a scale (4/8px or similar) | one spacing system throughout |
| 3.3 | **Alignment** | elements align to a grid; no stray edges | strong, invisible grid |
| 3.4 | **Density** | nothing crammed; no wall-of-text | "removed 30%" — calm, not busy |
| 3.5 | **Padding inside containers** | comfortable inner padding | balanced, optical-not-just-mathematical |

## 4 · Hierarchy & Focus
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 4.1 | **First read** | eye lands on the right thing first | unmistakable focal point |
| 4.2 | **Scannability** | clear labels/sections; skimmable | structured for a 5-sec skim AND a deep read |
| 4.3 | **One job per element** | nothing competes for attention | every element earns its place |
| 4.4 | **CTA clarity** | primary action obvious, secondary quieter | single clear primary action |

## 5 · Premium Feel (restraint)
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 5.1 | **Restraint** | not over-decorated | could remove 30% and lose nothing |
| 5.2 | **Distinctiveness** | not a generic template | ownable, intentional look |
| 5.3 | **Anti-slop** | no purple gradients, default glassmorphism, AI-template clichés | considered, editorial |
| 5.4 | **Detail polish** | aligned corners, even gaps, no orphans | pixel-level care |
| 5.5 | **Cohesion** | feels like one system | recognisable in a glance |

## 6 · Responsive — Desktop → Mobile
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 6.1 | **No horizontal overflow** | zero on mobile (test at 360–390px) | — |
| 6.2 | **Grids stack** | multi-column → single column on mobile | reflows naturally, nothing crushed |
| 6.3 | **Min text column** | no text wrapping every 2–3 words | comfortable measure on mobile too |
| 6.4 | **Tap targets** | ≥44×44px interactive areas | thumb-friendly spacing |
| 6.5 | **Desktop not regressed** | mobile rules scoped, desktop intact | both feel native, not one squeezed |
| 6.6 | **Readable mobile sizes** | body still ≥15px on mobile | — |

## 7 · Email-specific (if shipping email)
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 7.1 | **Table layout** | structure via tables, not flex/grid | bulletproof across clients |
| 7.2 | **Inline styles** | critical styles inline | — |
| 7.3 | **Email-safe fonts** | system/web-safe (Georgia, Arial) with fallbacks | serif echo of the brand via Georgia |
| 7.4 | **No JS, no external images for layout** | layout survives blocked images | — |
| 7.5 | **No overflow at 360px** | fits narrow mobile email | — |
| 7.6 | **Brand parity with web** | same identity, not a different look | clearly the same product |

## 8 · Words & Microcopy
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 8.1 | **Clarity** | plain, jargon glossed on first use | effortless to read |
| 8.2 | **Concision** | no filler; every line earns its place | tight, confident |
| 8.3 | **Voice consistency** | one consistent tone | a distinct, human voice |
| 8.4 | **Labels & CTAs** | specific verbs, not "click here" / "submit" | action-oriented, precise |
| 8.5 | **Scannable structure** | headings/labels guide the eye | reads well skimmed or full |

## 9 · Consistency & Brand
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 9.1 | **Token discipline** | colours/spacing/type from a defined set | a real design-token system |
| 9.2 | **Component consistency** | same patterns reused | one component language |
| 9.3 | **Logo/wordmark** | clear, correct sizing & clear-space | distinctive, well-set |
| 9.4 | **Cross-surface** | web/email/mobile feel like one brand | seamless identity |

## 10 · Accessibility
| # | Parameter | Pass criteria (3+) | Premium (5) |
|---|---|---|---|
| 10.1 | **Contrast** | meets §2 thresholds | — |
| 10.2 | **Focus states** | keyboard focus visible | clear, styled focus |
| 10.3 | **Alt text / labels** | images & controls labelled | — |
| 10.4 | **Reduced motion** | respects `prefers-reduced-motion` | — |
| 10.5 | **Semantic structure** | proper headings, landmarks | screen-reader friendly |

---

## 11 · HARD GATES (must all pass — no exceptions)
- [ ] Body text ≥15px and contrast ≥4.5:1 (verified on rendered output, ancestor-resolved)
- [ ] Zero horizontal overflow on mobile (360–390px)
- [ ] Multi-column grids stack on mobile; desktop not regressed
- [ ] Email (if any): table layout, inline styles, email-safe fonts, survives blocked images, no overflow at 360px
- [ ] ≤2–3 type families, ≤1 primary accent colour
- [ ] No placeholder / demo / `#` links in production
- [ ] No console errors; all interactions work
- [ ] Tap targets ≥44px

---

## 12 · 60-Second Pre-Ship Checklist
1. Screenshot it at **1200px and 390px** (and email at 600px + 360px). Look at the real render, not the code.
2. Squint — does the **hierarchy** still read? Does one thing lead?
3. Could you **remove 30%** and lose nothing? If yes, remove it.
4. Is the **accent** used sparingly, or everywhere?
5. **Read a paragraph** — comfortable size, spacing, line length?
6. **Resize to mobile** — anything crushed, overflowing, or wrapping every 2 words?
7. Any **placeholder text/links** left?
8. Does it look like **one cohesive system**, or assembled parts?

> Principle behind all of it: **premium = restraint + clarity + consistency.** Space is confidence. Every element earns its place. Verify on the real render, every time.
