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

export interface Source {
  id: string
  name: string
  tier: Tier
  weight: 1 | 2 | 3 | 4 | 5
  beat: Beat
  feedUrl: string
  windowHours: number
  kind: SourceKind
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
  { id: 'simon-willison', name: 'Simon Willison',        tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://simonwillison.net/atom/everything/', windowHours: H_48, kind: 'rss' },
  { id: 'latent-space',   name: 'Latent Space (Swyx)',   tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.latent.space/feed',              windowHours: H_48, kind: 'rss' },
  { id: 'interconnects',  name: 'Interconnects (Lambert)', tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.interconnects.ai/feed',        windowHours: H_48, kind: 'rss' },
  { id: 'ethan-mollick',  name: 'One Useful Thing',      tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://www.oneusefulthing.org/feed',        windowHours: H_48, kind: 'rss' },
  { id: 'lilian-weng',    name: 'Lilian Weng',           tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://lilianweng.github.io/index.xml',     windowHours: H_48, kind: 'rss' },
  { id: 'karpathy',       name: 'Andrej Karpathy',       tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://karpathy.github.io/feed.xml',        windowHours: H_48, kind: 'rss' },
  { id: 'chip-huyen',     name: 'Chip Huyen',            tier: 'A', weight: 4, beat: 'frontier-api', feedUrl: 'https://huyenchip.com/feed.xml',             windowHours: H_48, kind: 'rss' },

  // Frontier analysis (weekly)
  { id: 'import-ai',         name: 'Import AI (Jack Clark)',          tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://importai.substack.com/feed',           windowHours: H_7D, kind: 'rss' },
  { id: 'ahead-of-ai',       name: 'Ahead of AI (Raschka)',           tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://magazine.sebastianraschka.com/feed',    windowHours: H_7D, kind: 'rss' },
  { id: 'the-gradient',      name: 'The Gradient',                    tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://thegradient.pub/rss/',                  windowHours: H_7D, kind: 'rss' },
  { id: 'gary-marcus',       name: 'Gary Marcus (skeptic)',           tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://garymarcus.substack.com/feed',          windowHours: H_7D, kind: 'rss' },
  { id: 'ai-snake-oil',      name: 'AI Snake Oil (Narayanan/Kapoor)', tier: 'C', weight: 3, beat: 'frontier-api', feedUrl: 'https://www.aisnakeoil.com/feed',               windowHours: H_7D, kind: 'rss' },

  // Frontier press / volume
  { id: 'marktechpost',   name: 'MarkTechPost',        tier: 'B', weight: 2, beat: 'frontier-api', feedUrl: 'https://www.marktechpost.com/feed/',                                  windowHours: H_48, kind: 'rss' },
  { id: 'techcrunch-ai',  name: 'TechCrunch AI',       tier: 'B', weight: 2, beat: 'frontier-api', feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',       windowHours: H_48, kind: 'rss' },
  { id: 'mit-tech-review',name: 'MIT Tech Review',     tier: 'B', weight: 2, beat: 'frontier-api', feedUrl: 'https://www.technologyreview.com/feed/',                              windowHours: H_48, kind: 'rss' },
  { id: 'hn-frontpage',   name: 'Hacker News (front)', tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'https://hnrss.org/frontpage',                                          windowHours: H_48, kind: 'rss' },
  { id: 'hn-show',        name: 'Hacker News (Show)',  tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'https://hnrss.org/show',                                               windowHours: H_48, kind: 'rss' },
  { id: 'arxiv-ai',       name: 'arXiv cs.AI',         tier: 'B', weight: 1, beat: 'frontier-api', feedUrl: 'http://export.arxiv.org/rss/cs.AI',                                    windowHours: H_48, kind: 'rss' },
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
  { id: 'scc-online',       name: 'SCC Online Times',         tier: 'C', weight: 3, beat: 'regulation', feedUrl: 'https://www.scconline.com/blog/feed/',                    windowHours: H_7D, kind: 'rss' },
  // Removed (no usable RSS — all return Cloudflare 403 or 404):
  //   indiaai-news      https://indiaai.gov.in/{rss,feed}
  //   medianama-regul   https://www.medianama.com/category/regulation/feed/
  //   mondaq-india-ai   https://www.mondaq.com/india/rss.aspx
  // Phase 2 will add WebFetch-based scrapers for MeitY/PIB/RBI/SEBI. Until then
  // regulation signals reach us via Inc42 + MediaNama main + ET Tech coverage.

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: indic-models — Sarvam / AI4Bharat / BharatGen / Gnani / Two AI
  // ─────────────────────────────────────────────────────────────────────
  { id: 'bharatgen',        name: 'BharatGen (IIT Bombay)',   tier: 'A', weight: 5, beat: 'indic-models', feedUrl: 'https://bharatgen.com/feed/',                            windowHours: H_7D, kind: 'rss' },
  // Removed (no usable RSS):
  //   sarvam-blog       no RSS on sarvam.ai/blogs (HTML head has no <link rel="alternate">)
  //   ai4bharat         ai4bharat.iitm.ac.in fails public DNS resolution
  //   analytics-india   Cloudflare JS challenge — serves HTML not XML
  // Sarvam/AI4Bharat coverage flows through MediaNama + Inc42 + ET Tech instead.
  // Phase 2: build WebFetch-based scraper to read sarvam.ai/blogs HTML page weekly.

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: talent-comp — funding tracker, hiring, comp benchmarks
  // ─────────────────────────────────────────────────────────────────────
  { id: 'inc42-funding',    name: 'Inc42 — Funding Tracker',  tier: 'A', weight: 4, beat: 'talent-comp', feedUrl: 'https://inc42.com/buzz/feed/',                            windowHours: H_48, kind: 'rss' },
  { id: 'pragmatic-engineer', name: 'The Pragmatic Engineer', tier: 'C', weight: 3, beat: 'talent-comp', feedUrl: 'https://newsletter.pragmaticengineer.com/feed',           windowHours: H_7D, kind: 'rss' },
  // Indian VC + ops voices
  { id: 'sajith-pai',       name: 'Sajith Pai (Blume)',       tier: 'C', weight: 3, beat: 'talent-comp', feedUrl: 'https://sajithpai.substack.com/feed',                    windowHours: H_7D, kind: 'rss' },
  { id: 'ben-evans',        name: 'Benedict Evans',           tier: 'C', weight: 3, beat: 'talent-comp', feedUrl: 'https://www.ben-evans.com/benedictevans?format=rss',     windowHours: H_7D, kind: 'rss' },
  { id: 'stratechery',      name: 'Stratechery (free)',       tier: 'C', weight: 3, beat: 'talent-comp', feedUrl: 'https://stratechery.com/feed/',                          windowHours: H_7D, kind: 'rss' },

  // ─────────────────────────────────────────────────────────────────────
  // BEAT: enterprise-deals — vendor newsrooms + Indian enterprise AI buyer stories
  // ─────────────────────────────────────────────────────────────────────
  { id: 'microsoft-india',  name: 'Microsoft India Newsroom', tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://news.microsoft.com/en-in/feed/',            windowHours: H_48, kind: 'rss' },
  // Removed: anthropic-news — confirmed no RSS (HTML has no <link rel="alternate">).
  //          Anthropic India enterprise wins reach us via Microsoft/AWS coverage + TechCrunch AI.
  { id: 'venturebeat-ai',   name: 'VentureBeat AI',           tier: 'B', weight: 2, beat: 'enterprise-deals', feedUrl: 'https://venturebeat.com/category/ai/feed/',         windowHours: H_48, kind: 'rss' },
  { id: 'aws-ml',           name: 'AWS ML Blog',              tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://aws.amazon.com/blogs/machine-learning/feed/', windowHours: H_48, kind: 'rss' },
  { id: 'nvidia-dev',       name: 'NVIDIA Developer Blog',    tier: 'A', weight: 4, beat: 'enterprise-deals', feedUrl: 'https://developer.nvidia.com/blog/feed/',           windowHours: H_48, kind: 'rss' },
]

export function sourcesByTier(tier: Tier): Source[] {
  return SOURCES.filter((s) => s.tier === tier)
}

export function sourcesByBeat(beat: Beat): Source[] {
  return SOURCES.filter((s) => s.beat === beat)
}
