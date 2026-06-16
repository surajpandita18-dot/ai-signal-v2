// Hand-typed Database shape mirroring db/migrations/0001_init.sql.
// Regenerate from `supabase gen types typescript` once we have a remote project linked.
//
// Shape note: @supabase/supabase-js expects each table to expose Row / Insert /
// Update / Relationships, and the schema to expose Views / Functions / Enums /
// CompositeTypes (even when empty). Don't drop these keys.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Tier = 'A' | 'B' | 'C'
// 6-layer product taxonomy locked June 2026 (see CLAUDE.md / project_positioning_locked memory).
export type Beat =
  | 'frontier-api'
  | 'india-infra'
  | 'regulation'
  | 'indic-models'
  | 'talent-comp'
  | 'enterprise-deals'
export type IssueStatus =
  | 'sourcing'
  | 'clustering'
  | 'synthesizing'
  | 'awaiting_human'
  | 'drafting'
  | 'drafted'
  | 'failed'
  | 'no_signal'

// Content track — every issue is either the weekly Monday brief or a
// long-form deep-dive essay. Added 2026-06-12 (migration 0007).
export type IssueType = 'weekly_brief' | 'deep_dive'

// Primary audience leaning for a deep-dive candidate. CLAUDE.md positions
// the brief for builders, PMs, AND founders co-equally — the discovery
// agent must yield a mix so we don't drift into single-archetype content.
// Added 2026-06-12 (migration 0008).
export type DeepDiveAudience = 'builder' | 'pm' | 'founder' | 'cross-cutting'
export type ObviousOrNot = 'obvious' | 'non-obvious' | 'unclear'

export interface Database {
  public: {
    Tables: {
      raw_items: {
        Relationships: []
        Row: {
          id: string
          issue_id: string | null
          source: string
          tier: Tier
          url: string
          title: string
          excerpt: string | null
          published_at: string | null
          fetched_at: string
          weight: number
          beat: Beat
        }
        Insert: {
          id?: string
          issue_id?: string | null
          source: string
          tier: Tier
          url: string
          title: string
          excerpt?: string | null
          published_at?: string | null
          fetched_at?: string
          weight?: number
          beat?: Beat
        }
        Update: {
          id?: string
          issue_id?: string | null
          source?: string
          tier?: Tier
          url?: string
          title?: string
          excerpt?: string | null
          published_at?: string | null
          fetched_at?: string
          weight?: number
          beat?: Beat
        }
      }
      clusters: {
        Relationships: []
        Row: {
          id: string
          issue_id: string
          label: string
          item_ids: Json
          convergence_score: number
          set_aside: boolean
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          label: string
          item_ids?: Json
          convergence_score?: number
          set_aside?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          label?: string
          item_ids?: Json
          convergence_score?: number
          set_aside?: boolean
          created_at?: string
        }
      }
      candidates: {
        Relationships: []
        Row: {
          id: string
          issue_id: string
          position: number
          throughline: string
          proof_cluster_ids: Json
          reasoning: string
          obvious_or_not: ObviousOrNot
          obvious_reason: string | null
          chosen: boolean
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          position: number
          throughline: string
          proof_cluster_ids?: Json
          reasoning: string
          obvious_or_not: ObviousOrNot
          obvious_reason?: string | null
          chosen?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          position?: number
          throughline?: string
          proof_cluster_ids?: Json
          reasoning?: string
          obvious_or_not?: ObviousOrNot
          obvious_reason?: string | null
          chosen?: boolean
          created_at?: string
        }
      }
      issues: {
        Relationships: []
        Row: {
          id: string
          status: IssueStatus
          issue_type: IssueType
          chosen_candidate_id: string | null
          chosen_throughline_override: string | null
          markdown_path: string | null
          failure_reason: string | null
          set_aside_count: number | null
          // Payload shape varies by issue_type:
          //   weekly_brief → IssuePayload (locked 6-section)
          //   deep_dive    → DeepDivePayload + research_pack + candidate_meta
          // Row type stays IssuePayload | null for backwards compatibility with
          // the existing weekly pipeline. Deep-dive consumers cast via
          // `payload as unknown as DeepDivePayload` after branching on issue_type.
          payload: IssuePayload | null
          chosen_calls: ChosenCalls | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: IssueStatus
          issue_type?: IssueType
          chosen_candidate_id?: string | null
          chosen_throughline_override?: string | null
          markdown_path?: string | null
          failure_reason?: string | null
          set_aside_count?: number | null
          payload?: IssuePayload | DeepDivePayload | null
          chosen_calls?: ChosenCalls | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: IssueStatus
          issue_type?: IssueType
          chosen_candidate_id?: string | null
          chosen_throughline_override?: string | null
          markdown_path?: string | null
          failure_reason?: string | null
          set_aside_count?: number | null
          payload?: IssuePayload | DeepDivePayload | null
          chosen_calls?: ChosenCalls | null
          created_at?: string
          updated_at?: string
        }
      }
      deep_dive_candidates: {
        Relationships: []
        Row: {
          id: string
          discovered_at: string
          assumption_challenged: string
          one_paragraph_hook: string
          primary_audience: DeepDiveAudience
          evidence_anchor_urls: Json
          score: number | null
          chosen: boolean
          chosen_issue_id: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          discovered_at?: string
          assumption_challenged: string
          one_paragraph_hook: string
          primary_audience?: DeepDiveAudience
          evidence_anchor_urls?: Json
          score?: number | null
          chosen?: boolean
          chosen_issue_id?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          discovered_at?: string
          assumption_challenged?: string
          one_paragraph_hook?: string
          primary_audience?: DeepDiveAudience
          evidence_anchor_urls?: Json
          score?: number | null
          chosen?: boolean
          chosen_issue_id?: string | null
          rejection_reason?: string | null
        }
      }
      issue_quality_logs: {
        Relationships: []
        Row: {
          id: string
          issue_id: string
          attempt: number
          headline_score: number | null
          persona_score: number | null
          math_score: number | null
          hack_score: number | null
          keep_skip_score: number | null
          cohesion_score: number | null
          overall_pass: boolean
          feedback: Json
          evaluator_model: string
          cache_usage: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          attempt?: number
          headline_score?: number | null
          persona_score?: number | null
          math_score?: number | null
          hack_score?: number | null
          keep_skip_score?: number | null
          cohesion_score?: number | null
          overall_pass: boolean
          feedback: Json
          evaluator_model: string
          cache_usage?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          attempt?: number
          headline_score?: number | null
          persona_score?: number | null
          math_score?: number | null
          hack_score?: number | null
          keep_skip_score?: number | null
          cohesion_score?: number | null
          overall_pass?: boolean
          feedback?: Json
          evaluator_model?: string
          cache_usage?: Json | null
          created_at?: string
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Convenience row types
export type RawItem = Database['public']['Tables']['raw_items']['Row']
export type Cluster = Database['public']['Tables']['clusters']['Row']
export type Candidate = Database['public']['Tables']['candidates']['Row']
export type Issue = Database['public']['Tables']['issues']['Row']
export type IssueQualityLog = Database['public']['Tables']['issue_quality_logs']['Row']
export type DeepDiveCandidate = Database['public']['Tables']['deep_dive_candidates']['Row']

// ─────────────────────────────────────────────────────────────────────
// Issue payload — locked 6-section product format (June 2026)
// ─────────────────────────────────────────────────────────────────────

export interface DiffLayerEntry {
  beat: Beat
  bullet: string            // 40-80 words
  cluster_ids: string[]     // cited proof clusters
}

export interface ShkCall {
  label: string             // one-line concrete action (e.g. "Migrate voice bot to Sarvam 105B")
  rationale: string         // 1-3 sentences with the WHY + numbers
  cluster_ids: string[]     // proof clusters supporting this call
}

export interface IssuePayload {
  headline: string                          // ≤8 words, catchy magazine-cover title (NEW)
  throughline: string                       // one full statement, ≤25 words (becomes the subhead/dek)
  throughline_lead: string                  // ~60-100 word lead landing in the throughline
  six_layer_diff: DiffLayerEntry[]          // ideally 6, one per beat; may be fewer if a beat is quiet this week
  persona: {
    archetype: string                       // primary archetype this week
    translation: string                     // 120-180 words deep treatment
    inr_math: string                        // worked INR calculation, concrete numbers
  }
  also_for?: Array<{
    archetype: string                       // a different builder archetype
    take: string                            // 40-60 word implication for THIS archetype
  }>                                        // 2-3 short briefs serving the broader builder audience
  production_hack?: {
    title: string                           // ≤7 words — concrete technique name
    why_it_matters: string                  // 40-70 words — Indian-builder framing, what production pain it fixes
    how_to_apply: string                    // 40-70 words — concrete steps the builder can ship this week
    source_label: string                    // paper title / repo / blog name
    source_url: string                      // canonical URL
  } | null                                  // weekly production hack pulled from research/OSS — null if nothing solid this week
  shk_candidates: {
    ship: ShkCall[]                         // 3-5 candidates — human picks ONE in review
    hold: ShkCall[]                         // 3-5 candidates — human picks ONE
    kill: ShkCall[]                         // 3-5 candidates — human picks ONE
  }
  keep_skip: {
    keep: string[]                          // 2-3 signal-adjacent items to internalise
    skip: string[]                          // 3-5 NAMED-SPECIFICALLY noise items to skip
  }
  set_aside_observation: string | null      // optional one-sentence note on what dominated the noise
  no_signal: boolean                        // true when week is genuinely quiet
  no_signal_reason: string | null
}

// What the human picks at the review step — three labels (or 'override' text) — one per kind.
// `source` is the rule #1 provenance flag: 'human' = Suraj explicitly picked at
// /review; 'ai' = cron auto-promoted shk_candidates[0] under the ≥9 QA tiered
// auto-send rule. The Ship-tier bright-lime visual treatment is reserved for
// `source === 'human'` only — AI-picked rows render in demoted style even when
// they fill the Ship slot, preserving the moat per CLAUDE.md rule #1.
export interface ChosenCall {
  label: string
  rationale: string
  source: 'human' | 'ai'
}

export interface ChosenCalls {
  ship: ChosenCall | null
  hold: ChosenCall | null
  kill: ChosenCall | null
}

// ─────────────────────────────────────────────────────────────────────
// Deep-dive payload — locked 7-section essay format (June 2026)
// Sits in the same issues.payload JSONB. Renderer dispatches on
// issue_type: 'deep_dive' to use this shape.
// ─────────────────────────────────────────────────────────────────────

export interface EvidenceTriple {
  url: string
  quote: string                // ≤200 words direct excerpt anchoring the claim
  claim_supported: string      // one-sentence claim the quote backs
}

export interface CounterPosition {
  claim: string                // strongest opposing view, charitable phrasing
  best_link: string            // canonical URL for that opposing view
  steel_man: string            // ≤80-word steel-man so the writer is honest
}

export interface IndiaContextAnchor {
  fact: string                 // INR / DPDP / Indic / GCC fact
  source: string               // URL or named source
}

// Output of stage 1 (deep-dive-research). Persisted to payload.research_pack.
export interface DeepDiveResearchPack {
  evidence_triples: EvidenceTriple[]
  counter_positions: CounterPosition[]
  india_context_anchors: IndiaContextAnchor[]
}

// A minimal snapshot of the discovery candidate so the writer + QA stages
// don't need to re-read deep_dive_candidates. Persisted as payload.candidate_meta.
export interface DeepDiveCandidateMeta {
  candidate_id: string
  assumption_challenged: string
  one_paragraph_hook: string
  primary_audience: DeepDiveAudience
  evidence_anchor_urls: string[]
}

export interface DeepDiveEvidenceSection {
  heading: string              // ≤8 words
  body: string                 // includes inline [text](url) markdown links
}

export interface DeepDiveMondayAction {
  number: number               // 1, 2, 3
  action: string               // ≤2 sentences; names file/team/contract
}

export interface DeepDiveFurtherReading {
  url: string
  annotation: string           // one-line annotation
}

export interface DeepDivePayload {
  // optional discriminator — renderer primarily dispatches on issues.issue_type
  // but this field lets payload-only consumers branch without re-reading the row.
  kind?: 'deep_dive'
  title: string                // ≤8 words, sharp, contrarian
  subtitle: string             // 1 sentence, ≤20 words
  cold_open: string            // 120-180 words
  assumption: string           // 80-120 words — italicize the belief
  evidence_sections: DeepDiveEvidenceSection[]  // 3-5 sub-sections, 1800-2800 total
  india_twist: string          // 350-500 words
  monday_actions: DeepDiveMondayAction[]        // 3 numbered actions
  counter_positions: CounterPosition[]          // honest steel-mans for section 6
  further_reading: DeepDiveFurtherReading[]     // 5-8 links
  primary_audience: DeepDiveAudience

  // Intermediate artifacts kept on the payload for QA + reruns.
  // Optional because the research stage writes them before the writer stage
  // adds the essay fields.
  research_pack?: DeepDiveResearchPack
  candidate_meta?: DeepDiveCandidateMeta
}

// The full union of shapes that can be persisted into issues.payload.
// Consumers branch on issues.issue_type then cast as the appropriate shape.
export type IssuePayloadAny = IssuePayload | DeepDivePayload
