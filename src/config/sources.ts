// Source taxonomy locked June 2026 — see CLAUDE.md + project_positioning_locked memory.
//
// 6 beats, mapped to the locked issue structure's "6-Layer Diff" section:
//   frontier-api      — global model API moves: OpenAI/Anthropic/Google/DeepSeek pricing + capability
//   india-infra       — Yotta/E2E/Jarvislabs/Krutrim Cloud/IndiaAI Mission + Indian cloud capacity
//   regulation        — MeitY/PIB/RBI/SEBI/IRDAI/CDSCO/DPDP gazette + advisories
//   indic-models      — Sarvam/AI4Bharat/BharatGen/Gnani/Two AI/Krutrim tech blog
//   talent-comp       — funding tracker + hiring trends + comp benchmarks (Inc42, Zinnov)
//   enterprise-deals  — Anthropic/Microsoft/Google India newsroom + Indian enterprise AI buyer stories
//
// Weight 1-5 = source quality / load-bearing-ness for synthesis:
//   5 = official first-party (the lab/company/regulator itself)
//   4 = high-signal individual or serious eng/analysis blog
//   3 = editorial analysis / "what does it MEAN" layer
//   2 = aggregators + broad press (TechCrunch, Verge, MarkTechPost)
//   1 = volume / community (HN, arXiv listings) — convergence signal only
//
// Window: most feeds = trailing 48h; analysis/weekly newsletters = 7d.
//
// IMPORTANT: feed URLs break. `pnpm smoke:source` surfaces dead feeds; fix in
// one round and move on. Sources flagged "TBD URL" need confirmation in smoke test.

import type { Beat } from '../../db/types/database'

export type Tier = 'A' | 'B' | 'C'
export type SourceKind = 'rss'
// Which content track a source feeds. Most existing sources feed the
// weekly brief ('news'). Long-form essays + research feeds feed the
// deep-dive track ('long-form'). A few sources feed both. Default ['news']
// when unspecified — preserves existing behavior.
export type ContentTrack = 'news' | 'long-form'

export interface Source {
  id: string
  name: string
  tier: Tier
  weight: 1 | 2 | 3 | 4 | 5
  beat: Beat
  feedUrl: string
  windowHours: number
  kind: SourceKind
  tracks?: ContentTrack[] // defaults to ['news']
}

const H_48 = 48
const H_7D = 24 * 7

export const SOURCES: Source[] = [
  // ─────────────────────────────────────────────────────────────────────
  // BEAT: frontier-api — global model API moves
  // ─────────────────────────────────────────────────────────────────────
  { id: 'openai',         name: 'OpenAI News',     tier: 'A', weight: 5, beat: 'frontier-api', feedUrl: 'https://openai.com/news/rss.xml',           windowHours: H_48, kind: 'rss' },
  { id: 'deepmind',       name: 'Google DeepMind', tier: 'A', weight: 5, beat: 'frontier-api', feedUrl: 'https://deepmind.google/blog/rss.xml',      windowHours: H_48, kind: 'rss' },
  { id: 'google-ai',      name: 'Google AI Blog',  tier: 'A', weight: 5, beat: 'frontier-api', feedUrl: 'https://blog.google/technology/ai/rss/',    windowHours: H_48, kind: 'rss' },
  { id: 'huggingface',    name: 'Hugging Face',    tier: 'A', weight: 5, beat: 'frontier-api', feedUrl: 'https://huggingface.co/blog/feed.xml',      windowHours: H_48, kind: 'rss' },
  // Removed: microsoft-ai — Cloudflare 403 across all blogs.microsoft.com feed paths.
  //          Microsoft AI announcements still reach us via TechCrunch AI + MarkTechPost.

  // High-signal frontier individuals
  { id: 'simon-willison', name: 'Simon Willison',        tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://simonwillison.net/atom/everything/', windowHours: H_48, kind: 'rss', tracks: ['news', 'long-form'] },
  { id: 'latent-space',   name: 'Latent Space (Swyx)',   tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.latent.space/feed',              windowHours: H_48, kind: 'rss' },
  { id: 'interconnects',  name: 'Interconnects (Lambert)', tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.interconnects.ai/feed',        windowHours: H_48, kind: 'rss' },
  { id: 'ethan-mollick',  name: 'One Useful Thing',      tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.oneusefulthing.org/feed',        windowHours: H_48, kind: 'rss' },
  { id: 'lilian-weng',    name: 'Lilian Weng',           tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://lilianweng.github.io/index.xml',     windowHours: H_48, kind: 'rss' },
  { id: 'karpathy',       name: 'Andrej Karpathy',       tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://karpathy.github.io/feed.xml',        windowHours: H_48, kind: 'rss' },
  { id: 'chip-huyen',     name: 'Chip Huyen',            tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://huyenchip.com/feed.xml',             windowHours: H_48, kind: 'rss' },

  // Anthropic News (community mirror — Anthropic has no official RSS)
  { id: 'anthropic-news-mirror', name: 'Anthropic News (mirror)', tier: 'A', weight: 5, beat: 'frontier-api', feedUrl: 'https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml', windowHours: H_48, kind: 'rss' },

  // High-signal long-form lab interviews + curated papers
  { id: 'dwarkesh',       name: 'Dwarkesh Podcast',         tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.dwarkesh.com/feed',         windowHours: H_7D, kind: 'rss' },
  { id: 'hf-papers-takara', name: 'HF Daily Papers (Takara)', tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://papers.takara.ai/api/feed', windowHours: H_48, kind: 'rss' },
  // Re-tagged talent-comp -> frontier-api (2026-06-12 audit): actual content is platform/lab analysis.
  { id: 'stratechery',    name: 'Stratechery (free)',       tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://stratechery.com/feed/',         windowHours: H_7D, kind: 'rss' },

  // Frontier analysis (weekly)
  { id: 'import-ai',         name: 'Import AI (Jack Clark)',          tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://importai.substack.com/feed',           windowHours: H_7D, kind: 'rss' },
  { id: 'ahead-of-ai',       name: 'Ahead of AI (Raschka)',           tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://magazine.sebastianraschka.com/feed',    windowHours: H_7D, kind: 'rss' },
  { id: 'the-gradient',      name: 'The Gradient',                    tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://thegradient.pub/rss/',                  windowHours: H_7D, kind: 'rss' },
  // Down-weighted 3 -> 2 (2026-06-12 audit): volume of skeptic posts skews convergence.
  { id: 'gary-marcus',       name: 'Gary Marcus (skeptic)',           tier: 'C', weight: 2, beat: 'frontier-api', feedUrl: 'https://garymarcus.substack.com/feed',          windowHours: H_7D, kind: 'rss' },
  { id: 'ai-snake-oil',      name: 'AI Snake Oil (Narayanan/Kapoor)', tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://www.aisnakeoil.com/feed',               windowHours: H_7D, kind: 'rss' },

  // Frontier press / volume
  { id: 'marktechpost',   name: 'MarkTechPost',        tier: 'B', weight: 2, beat: 'frontier-api', feedUrl: 'https://www.marktechpost.com/feed/',                                  windowHours: H_48, kind: 'rss' },
  { id: 'techcrunch-ai',  name: 'TechCrunch AI',       tier: 'B', weight: 2, beat: 'frontier-api', feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',       windowHours: H_48, kind: 'rss' },
  // Down-weighted 2 -> 1 (2026-06-12 audit): long-form, rarely first.
  { id: 'mit-tech-review',name: 'MIT Tech Review',     tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'https://www.technologyreview.com/feed/',                              windowHours: H_48, kind: 'rss' },
  { id: 'hn-frontpage',   name: 'Hacker News (front)', tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'https://hnrss.org/frontpage',                                          windowHours: H_48, kind: 'rss' },
  // Removed (2026-06-12 audit): hn-show — Show HN noise overwhelms signal; hn-frontpage covers AI tier.
  // Removed (2026-06-12 audit): arxiv-ai — overlaps heavily with cs.LG; cs.LG + cs.CL retained.
  { id: 'arxiv-lg',       name: 'arXiv cs.LG',         tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'http://export.arxiv.org/rss/cs.LG',                                    windowHours: H_48, kind: 'rss' },
  { id: 'arxiv-cl',       name: 'arXiv cs.CL',         tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'http://export.arxiv.org/rss/cs.CL',                                    windowHours: H_48, kind: 'rss' },

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: india-infra — Indian cloud / GPU / IndiaAI Mission
  // ─────────────────────────────────────────────────────────────────────
  { id: 'inc42',           name: 'Inc42 (tech)',            tier: 'A', weight: 4, beat: 'india-infra', feedUrl: 'https://inc42.com/feed/',                                  windowHours: H_48, kind: 'rss' },
  { id: 'yourstory',       name: 'YourStory',               tier: 'A', weight: 4, beat: 'india-infra', feedUrl: 'https://yourstory.com/feed',                               windowHours: H_48, kind: 'rss' },
  { id: 'et-tech',         name: 'ET Tech',                 tier: 'A', weight: 4, beat: 'india-infra', feedUrl: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms', windowHours: H_48, kind: 'rss' },
  { id: 'medianama',       name: 'MediaNama (India tech)',  tier: 'A', weight: 4, beat: 'india-infra', feedUrl: 'https://www.medianama.com/feed/',                          windowHours: H_48, kind: 'rss' },
  { id: 'krutrim-tech',    name: 'Krutrim Tech Blog',       tier: 'A', weight: 4, beat: 'india-infra', feedUrl: 'https://tech.olakrutrim.com/feed',                         windowHours: H_7D, kind: 'rss' },
  // Removed: e2e-blog — no RSS feed found at expected paths. E2E infra/pricing news
  //          reaches us via Inc42 + ET Tech + MediaNama coverage.

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: regulation — DPDP / MeitY / RBI / SEBI / IRDAI / CDSCO
  // ─────────────────────────────────────────────────────────────────────
  // Primary regulator feeds (added 2026-06-12 audit) — load-bearing for fintech/AI procurement context.
  { id: 'rbi-press',         name: 'RBI Press Releases',       tier: 'A', weight: 5, beat: 'regulation', feedUrl: 'https://www.rbi.org.in/pressreleases_rss.xml',           windowHours: H_48, kind: 'rss' },
  { id: 'rbi-notifications', name: 'RBI Notifications',        tier: 'A', weight: 5, beat: 'regulation', feedUrl: 'https://www.rbi.org.in/notifications_rss.xml',          windowHours: H_48, kind: 'rss' },
  // Authoritative DPDP litigation / IT-Rules interpretation.
  { id: 'sflc-in',           name: 'SFLC.in',                  tier: 'A', weight: 4, beat: 'regulation', feedUrl: 'https://sflc.in/feed/',                                  windowHours: H_7D, kind: 'rss' },
  // Best mainstream Indian paper for MeitY/DPDP reportage.
  { id: 'indian-express-tech', name: 'Indian Express Tech',    tier: 'A', weight: 3, beat: 'regulation', feedUrl: 'https://indianexpress.com/section/technology/feed/',    windowHours: H_48, kind: 'rss' },
  { id: 'scc-online',        name: 'SCC Online Times',         tier: 'C', weight: 3, beat: 'regulation', feedUrl: 'https://www.scconline.com/blog/feed/',                   windowHours: H_7D, kind: 'rss' },
  // Removed (no usable RSS — all return Cloudflare 403 or 404):
  //   indiaai-news      https://indiaai.gov.in/{rss,feed}
  //   medianama-regul   https://www.medianama.com/category/regulation/feed/
  //   mondaq-india-ai   https://www.mondaq.com/india/rss.aspx
  // Phase 2 will add WebFetch-based scrapers for MeitY/PIB/SEBI. Until then
  // regulation signals reach us via Inc42 + MediaNama main + ET Tech coverage.

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: indic-models — Sarvam / AI4Bharat / BharatGen / Gnani / Two AI
  // ─────────────────────────────────────────────────────────────────────
  { id: 'bharatgen',        name: 'BharatGen (IIT Bombay)',   tier: 'A', weight: 5, beat: 'indic-models', feedUrl: 'https://bharatgen.com/feed/',                            windowHours: H_7D, kind: 'rss' },
  // Removed (no usable RSS):
  //   sarvam-blog       no RSS on sarvam.ai/blogs (HTML head has no <link rel="alternate">)
  //   ai4bharat         ai4bharat.iitm.ac.in fails public DNS resolution
  //   analytics-india   Cloudflare JS challenge — serves HTML not XML
  // Failed verification 2026-06-12 audit (HuggingFace org /feed endpoints require auth — 401):
  //   ai4bharat-hf      https://huggingface.co/ai4bharat/feed
  //   krutrim-ai-hf     https://huggingface.co/krutrim-ai-labs/feed
  //   bharatgen-hf      https://huggingface.co/bharatgenai/feed
  // Sarvam/AI4Bharat coverage flows through MediaNama + Inc42 + ET Tech instead.
  // Phase 2: build WebFetch-based scraper to read sarvam.ai/blogs HTML page weekly,
  // and switch to HF JSON API (https://huggingface.co/api/models?author=X) for org releases.

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: talent-comp — funding tracker, hiring, comp benchmarks
  // ─────────────────────────────────────────────────────────────────────
  { id: 'inc42-funding',    name: 'Inc42 — Funding Tracker',  tier: 'A', weight: 4, beat: 'talent-comp', feedUrl: 'https://inc42.com/buzz/feed/',                            windowHours: H_48, kind: 'rss' },
  { id: 'pragmatic-engineer', name: 'The Pragmatic Engineer', tier: 'C', weight: 3, beat: 'talent-comp', feedUrl: 'https://newsletter.pragmaticengineer.com/feed',           windowHours: H_7D, kind: 'rss' },
  // Indian VC + ops voices — Sajith Pai bumped C/3 -> A/4 (2026-06-12 audit): only Indian VC consistently doing INR-grounded analysis.
  { id: 'sajith-pai',       name: 'Sajith Pai (Blume)',       tier: 'A', weight: 4, beat: 'talent-comp', feedUrl: 'https://sajithpai.substack.com/feed',                    windowHours: H_7D, kind: 'rss', tracks: ['news', 'long-form'] },
  { id: 'ben-evans',        name: 'Benedict Evans',           tier: 'C', weight: 3, beat: 'talent-comp', feedUrl: 'https://www.ben-evans.com/benedictevans?format=rss',     windowHours: H_7D, kind: 'rss' },
  // Stratechery re-tagged talent-comp -> frontier-api (2026-06-12 audit): actual content is platform/lab analysis.

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: enterprise-deals — vendor newsrooms + Indian enterprise AI buyer stories
  // ─────────────────────────────────────────────────────────────────────
  { id: 'microsoft-india',  name: 'Microsoft India Newsroom', tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://news.microsoft.com/en-in/feed/',            windowHours: H_48, kind: 'rss' },
  // Indian enterprise / fintech distribution reporting (added 2026-06-12 audit).
  { id: 'the-ken',          name: 'The Ken',                  tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://the-ken.com/feed/',                          windowHours: H_7D, kind: 'rss' },
  { id: 'tigerfeathers',    name: 'Tigerfeathers',            tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://tigerfeathers.substack.com/feed',            windowHours: H_7D, kind: 'rss' },
  { id: 'the-generalist',   name: 'The Generalist',           tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://www.generalist.com/feed',                   windowHours: H_7D, kind: 'rss' },
  // Strong procurement signal (HDFC/SBI/Infosys AI).
  { id: 'livemint-tech',    name: 'Livemint Tech',            tier: 'A', weight: 3, beat: 'enterprise-deals', feedUrl: 'https://www.livemint.com/rss/technology',           windowHours: H_48, kind: 'rss' },
  // Removed: anthropic-news — confirmed no RSS (HTML has no <link rel="alternate">).
  //          Anthropic India enterprise wins reach us via Microsoft/AWS coverage + TechCrunch AI.
  { id: 'venturebeat-ai',   name: 'VentureBeat AI',           tier: 'B', weight: 2, beat: 'enterprise-deals', feedUrl: 'https://venturebeat.com/category/ai/feed/',         windowHours: H_48, kind: 'rss' },
  // Down-weighted A/4 -> A/3 (2026-06-12 audit): vendor blogs are marketing; A/4 belongs to The Ken / Livemint / Indian Express.
  { id: 'aws-ml',           name: 'AWS ML Blog',              tier: 'A', weight: 3, beat: 'enterprise-deals', feedUrl: 'https://aws.amazon.com/blogs/machine-learning/feed/', windowHours: H_48, kind: 'rss' },
  { id: 'nvidia-dev',       name: 'NVIDIA Developer Blog',    tier: 'A', weight: 3, beat: 'enterprise-deals', feedUrl: 'https://developer.nvidia.com/blog/feed/',           windowHours: H_48, kind: 'rss' },

  // ─────────────────────────────────────────────────────────────────────
  // DEEP-DIVE CANON — feeds for the long-form essay track (Thursday cadence,
  // 3000-5000 word pieces challenging builder assumptions). All curl-verified
  // 200 on 2026-06-12. window=30d because long-form publishes irregularly.
  // tracks: ['long-form'] means the weekly sourcer ignores these.
  // ─────────────────────────────────────────────────────────────────────
  { id: 'hamel-husain',     name: 'Hamel Husain (evals)',     tier: 'A', weight: 5, beat: 'frontier-api',     feedUrl: 'https://hamel.dev/index.xml',                       windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'eugene-yan',       name: 'Eugene Yan',               tier: 'A', weight: 5, beat: 'frontier-api',     feedUrl: 'https://eugeneyan.com/rss/',                        windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'sebastian-raschka',name: 'Ahead of AI (Raschka)',    tier: 'A', weight: 4, beat: 'frontier-api',     feedUrl: 'https://magazine.sebastianraschka.com/feed',        windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'answer-ai',        name: 'Answer.AI',                tier: 'A', weight: 4, beat: 'frontier-api',     feedUrl: 'https://www.answer.ai/index.xml',                   windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'aman-chadha',      name: 'aman.ai',                  tier: 'A', weight: 4, beat: 'frontier-api',     feedUrl: 'https://aman.ai/feed.xml',                          windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'drew-breunig',     name: 'Drew Breunig',             tier: 'A', weight: 4, beat: 'frontier-api',     feedUrl: 'https://www.dbreunig.com/feed.xml',                 windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'zvi-mowshowitz',   name: 'Zvi Mowshowitz',           tier: 'B', weight: 3, beat: 'frontier-api',     feedUrl: 'https://thezvi.substack.com/feed',                  windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'ai-snake-oil',     name: 'AI Snake Oil',             tier: 'B', weight: 3, beat: 'frontier-api',     feedUrl: 'https://www.aisnakeoil.com/feed',                   windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'alignment-forum',  name: 'Alignment Forum',          tier: 'B', weight: 3, beat: 'frontier-api',     feedUrl: 'https://www.alignmentforum.org/feed.xml',           windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
  { id: 'japm-sid-arora',   name: 'JustAnotherPM (Sid Arora)',tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://japm.substack.com/feed',                    windowHours: H_7D * 4, kind: 'rss', tracks: ['long-form'] },
]

export function sourcesByTier(tier: Tier): Source[] {
  return SOURCES.filter((s) => s.tier === tier)
}

export function sourcesByBeat(beat: Beat): Source[] {
  return SOURCES.filter((s) => s.beat === beat)
}
