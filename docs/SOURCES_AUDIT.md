# AI Signal v2 — Sources Audit

_Decision document. Read against `src/config/sources.ts` and `src/inngest/stages/cluster.ts`. All feed URLs HEAD-checked 2026-06-12._

## 1. Current state

`src/config/sources.ts` declares ~35 RSS feeds across the 6 locked beats; weighting is a flat 1–5 integer. `frontier-api` is well-covered (lab blogs + 6 individuals + arXiv + press). The India beats are thin: `india-infra` leans on 4 generalist Indian outlets and no colo/GPU operator; `regulation` is a single C-tier blog (SCC Online) after IndiaAI, MediaNama-regulation and Mondaq were dropped as dead; `indic-models` has only BharatGen (Sarvam/AI4Bharat blogs have no RSS); `talent-comp` over-indexes on global VC voices; `enterprise-deals` over-indexes on US vendor blogs (AWS ML, NVIDIA Dev). Critically: no Twitter/X, no primary RBI/MeitY feeds, no Anthropic — the brief's defensibility moat is unsourced.

| beat | num_sources | weight_distribution | gaps_observed |
|---|---|---|---|
| frontier-api | 21 | A:11 B:5 C:5 | no Anthropic, no HF Daily Papers, no Dwarkesh |
| india-infra | 5 | A:5 | no Yotta/CtrlS/E2E primary, no IndiaAI mission gov |
| regulation | 1 | C:1 | NO primary regulator feeds — biggest gap |
| indic-models | 1 | A:1 | Sarvam, AI4Bharat, Krutrim-AI-Labs missing |
| talent-comp | 5 | A:1 C:4 | weak on Indian comp/hiring signal |
| enterprise-deals | 4 | A:3 B:1 | no Indian bank/GCC buyer reporting |

## 2. Concrete additions — Tier A (HIGH PRIORITY)

| # | source | URL | T | W | beat | reason |
|---|---|---|---|---|---|---|
| 1 | RBI Press Releases | `https://www.rbi.org.in/pressreleases_rss.xml` | A | 5 | regulation | Primary regulator feed; load-bearing for fintech/AI procurement context. |
| 2 | RBI Notifications | `https://www.rbi.org.in/notifications_rss.xml` | A | 5 | regulation | Catches AI-in-banking circulars before press picks them up. |
| 3 | The Ken | `https://the-ken.com/feed/` | A | 4 | enterprise-deals | Only Indian outlet doing deep enterprise/bank reporting at journalist depth (paywalled body, free headlines — still useful for cluster signal). |
| 4 | Tigerfeathers | `https://tigerfeathers.substack.com/feed` | A | 4 | enterprise-deals | Cleanest narrative on Indian fintech/UPI distribution — directly relevant to Visa-on-ChatGPT-style deals. |
| 5 | Sajith Pai (raise) | `https://sajithpai.substack.com/feed` | A | 4 | talent-comp | Currently C/3 — only Indian VC voice consistently doing INR-grounded analysis. |
| 6 | The Generalist | `https://www.generalist.com/feed` | A | 4 | enterprise-deals | Top global longform on platform/enterprise dynamics; comp for India deals. |
| 7 | HF Daily Papers (Takara) | `https://papers.takara.ai/api/feed` | A | 4 | frontier-api | Curated Daily Papers — feeds the weekly "production hack" slot in `IssuePayload`. |
| 8 | Anthropic News (mirror) | `https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml` | A | 5 | frontier-api | Anthropic has no official RSS; community mirror is updating. Critical lab missing today. |
| 9 | AI4Bharat HF org | `https://huggingface.co/ai4bharat/feed` | A | 5 | indic-models | First-party release feed for IndicTrans2 / IndicConformerASR. |
| 10 | Krutrim AI Labs HF | `https://huggingface.co/krutrim-ai-labs/feed` | A | 5 | indic-models | First-party model release feed; replaces dead blog. |
| 11 | BharatGen HF | `https://huggingface.co/bharatgenai/feed` | A | 5 | indic-models | Patram-7B etc. ship to HF before any blog post. |
| 12 | Indian Express Tech | `https://indianexpress.com/section/technology/feed/` | A | 3 | regulation | Best mainstream Indian paper for MeitY/DPDP reportage. |
| 13 | Livemint Tech | `https://www.livemint.com/rss/technology` | A | 3 | enterprise-deals | Strong procurement signal (HDFC/SBI/Infosys AI). |
| 14 | SFLC.in | `https://sflc.in/feed/` | A | 4 | regulation | Authoritative on DPDP litigation / IT-Rules interpretation. |
| 15 | Dwarkesh Podcast | `https://www.dwarkesh.com/feed` | A | 4 | frontier-api | Highest-signal long-form lab interviews; Indian builders read this weekly. |

HF org Atom feed pattern is `https://huggingface.co/{org}/feed` — verify in one `pnpm smoke:source` round.

## 3. Concrete additions — Tier B/C (MEDIUM)

| # | source | URL | T | W | beat | reason |
|---|---|---|---|---|---|---|
| 16 | Pratik Desai | `https://pratikdesai.substack.com/feed` | B | 3 | indic-models | Active Indian builder voice on Indic LLMs / on-device. |
| 17 | Aakash Gupta | `https://www.news.aakashg.com/feed` | C | 2 | talent-comp | PM/AI-PM voice; useful for the PM persona. |
| 18 | Lenny's Newsletter | `https://www.lennysnewsletter.com/feed` | C | 2 | talent-comp | Comp/hiring + product framing. |
| 19 | SemiAnalysis | `https://semianalysis.com/feed` | C | 3 | india-infra | Best public GPU/cloud capacity analysis; rare India coverage but landmark. |
| 20 | Snigdha Poonam | `https://snigdhapoonam.substack.com/feed` | C | 2 | enterprise-deals | India tech-and-society reporting; sharpens consumer-AI angle. |
| 21 | The Hindu Sci-Tech | `https://www.thehindu.com/sci-tech/technology/feeder/default.rss` | B | 2 | regulation | Mainstream paper with good policy beat. |
| 22 | YourStory AI | `https://yourstory.com/category/artificial-intelligence/feed` | B | 2 | india-infra | Narrower than the root feed; less noise. |
| 23 | Analytics India Mag | `https://analyticsindiamag.com/feed/` | B | 2 | indic-models | Volume + occasional Indic-model scoops; convergence-only weight. |

Dead/blocked, do not add: Entrackr (`/feed` and `/news/feed/` both 404); Moneycontrol tech (Akamai 403 to node UA); IFF (`/rss/` 404); Mistral, Cohere, OpenAI research (no public RSS).

## 4. Removals or down-weighting

- `gary-marcus` (C/3): keep, **down-weight to 2** — volume of skeptic posts skews convergence.
- `hn-show` (B/1): **remove** — Show HN noise overwhelms signal; `hn-frontpage` already gives the AI tier.
- `arxiv-ai`: **remove**; cs.LG and cs.AI overlap heavily. Keep cs.LG + cs.CL (Indic relevance).
- `mit-tech-review` (B/2): **down-weight to 1** — long-form, rarely first.
- `aws-ml`, `nvidia-dev` (A/4 each): **down-weight to 3** — vendor blogs are marketing; A/4 belongs to The Ken / Livemint / Indian Express after they're added.
- `stratechery` (currently `talent-comp`, weight 3): **re-tag to `frontier-api`** — its actual content. Keep weight.

## 5. Proposed weighting rubric upgrade

Today: `convergence = Σ unique_source_weights`. Flat. Recency only filters items into the prompt (`itemScore`), not into the convergence signal the synthesizer reads.

**Proposed**: per-item composed score, then summed per cluster as today.

```
item_score = base_authority × recency_decay × beat_alignment
cluster_convergence = Σ item_score over distinct sources + convergence_bonus
```

- **`base_authority`** ∈ {1..5} — the existing static `weight`. Keep rubric (5 = primary, 4 = high-signal individual, 3 = analysis, 2 = press, 1 = volume).
- **`recency_decay`** = `exp(-age_hours / 72)` for 48h-window sources, `exp(-age_hours / 168)` for 7d sources. Range ~0.51–1.0 inside window; smooth beats hard cutoff.
- **`beat_alignment`** ∈ {1.0, 0.5} — 1.0 if item's matched beat = source's primary beat; 0.5 for soft match via a hand-curated ~20-keyword list per beat (e.g. `Hindi|Indic|Bhasha` reroutes an arXiv item to `indic-models`).
- **`convergence_bonus`**: for each pair of distinct Tier-A sources in a cluster whose items are within 48h of each other, add `min(base_authority(s1), base_authority(s2))` to the cluster score. So OpenAI(5) + DeepMind(5) on the same shift within 48h adds +5 on top of the base — exactly the "two Tier-A labs said it" lift the synthesizer needs.

```
bonus = 0
for pair (s1,s2) of distinct Tier-A sources in cluster
       where |published(s1) − published(s2)| ≤ 48h:
  bonus += min(base_authority(s1), base_authority(s2))
```

O(n²) per cluster, fine at ≤30 items. All inside `cluster.ts`. No DB migration.

## 6. ML-style ranking — where it would help and where it wouldn't

**Rule-based wins now.** The brief's editorial moat is *interpretable* weighting — Suraj must be able to look at a cluster and say "OpenAI(5) + DeepMind(5) + Karpathy(4) — that's why it ranked." An ML classifier obscures that. Six beats are narrow, ~50 sources is below the threshold where embeddings beat human-readable cluster labels. The synthesizer already re-weighs evidence in its prompt.

**Where ML helps later.** (1) Embedding cosine to merge Haiku clusters that describe the same shift under different labels (observable failure mode worth measuring after 5–10 issues). (2) A relevance classifier trained on Suraj's keep/skip decisions: 20 issues × ~30 decisions ≈ 600 labels, enough for a small fine-tune. (3) Personalization — irrelevant at one reader.

**Recommendation:** Ship Section 5 first (1 PR, deterministic). Defer ML. Add a `keep_skip_log` table *now* so data accrues from day one.

## 7. Tier A Twitter/X handles

Cannot reliably scrape X (Nitter >50% downtime; RSSHub Twitter now needs a logged-in session; X API paid tier violates free-only).

- frontier-api: `@karpathy`, `@sama`, `@DarioAmodei`, `@swyx`, `@simonw`, `@_jasonwei`, `@miramurati`
- india-infra: `@Yotta_Official`, `@AshwiniVaishnaw`
- regulation: `@MEITY`, `@RBI`, `@SFLCin`, `@internetfreedom`
- indic-models: `@SarvamAI`, `@ai4bharat`, `@krutrimAI`, `@bharatgen_ai`, `@PratikDesai`
- talent-comp: `@sajithpai`, `@deedydas`
- enterprise-deals: `@RahulSanghi_` (Tigerfeathers), `@DeepakAbbot` (UPI/fintech)

**Recommendation: (c) manually curated weekly digest.** Concrete: a 5-minute Sunday-night UI where Suraj pastes 5–10 standout tweets into a `twitter_picks` table; synthesizer reads them as `source='twitter-curated'`, `weight=4`, `tier='A'`. Curation IS the moat — automating it adds noise. Reuse the same input UI later for pull-quote nominations.

## 8. Next concrete actions (top 5)

1. **Add the 8 verified Tier-A feeds** (#1–8 above: RBI press/notif, The Ken, Tigerfeathers, Sajith Pai bump, The Generalist, HF Papers Takara, Anthropic mirror). One PR. Run `pnpm smoke:source` and fix dead feeds in the same PR.
2. **Add HF org Atom feeds** for AI4Bharat / Krutrim / BharatGen (#9–11). Pattern `https://huggingface.co/{org}/feed`. Restores first-party Indic-model signal.
3. **Implement the new convergence formula** (Section 5) in `cluster.ts`. Add `published_at` to `CompactItem` so the 48h corroboration check works. Same `convergence_score` column; only computation changes.
4. **Add `twitter_picks` table + minimal /admin input page** for the Sunday 5-minute curation step. Surfaces the Twitter ecosystem without scraping.
5. **Add a `keep_skip_log` table** capturing every `/review` decision with `cluster_id`, `decision`, `reason_text`, `timestamp`. Pure logging; powers the deferred ML classifier in Section 6.

---
_~1490 words. Free RSS / public Atom only per spec rule. Dead feeds noted inline._
