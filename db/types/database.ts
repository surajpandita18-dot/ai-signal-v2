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
          chosen_candidate_id: string | null
          chosen_throughline_override: string | null
          markdown_path: string | null
          failure_reason: string | null
          set_aside_count: number | null
          payload: IssuePayload | null
          chosen_calls: ChosenCalls | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: IssueStatus
          chosen_candidate_id?: string | null
          chosen_throughline_override?: string | null
          markdown_path?: string | null
          failure_reason?: string | null
          set_aside_count?: number | null
          payload?: IssuePayload | null
          chosen_calls?: ChosenCalls | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: IssueStatus
          chosen_candidate_id?: string | null
          chosen_throughline_override?: string | null
          markdown_path?: string | null
          failure_reason?: string | null
          set_aside_count?: number | null
          payload?: IssuePayload | null
          chosen_calls?: ChosenCalls | null
          created_at?: string
          updated_at?: string
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
export interface ChosenCalls {
  ship: { label: string; rationale: string } | null
  hold: { label: string; rationale: string } | null
  kill: { label: string; rationale: string } | null
}
