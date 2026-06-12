-- AI Signal v2 — Migration 0006
-- Editorial QA logs. Captures each evaluator pass over an issue payload
-- (Stage 3.5 between synthesize and human review) so we can track drift
-- in headline / persona / INR math / production hack / keep-skip / cohesion
-- quality across issues over time.
--
-- One row per FINAL attempt per issue (after auto-regeneration loop).
-- `attempt` records how many evaluator passes the loop took to converge
-- (1 if first pass scored all >= 8, up to maxRetries+1 otherwise).

create table if not exists issue_quality_logs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  attempt int not null default 1,
  headline_score int check (headline_score between 1 and 10),
  persona_score int check (persona_score between 1 and 10),
  math_score int check (math_score between 1 and 10),
  hack_score int check (hack_score between 1 and 10),
  keep_skip_score int check (keep_skip_score between 1 and 10),
  cohesion_score int check (cohesion_score between 1 and 10),
  overall_pass boolean not null,                -- true iff all six scores >= 8
  feedback jsonb not null,                       -- { headline: "...", persona: "...", overall_diagnosis: "...", regenerated: ["persona","keep_skip"] }
  evaluator_model text not null,
  cache_usage jsonb,                             -- aggregate token usage across evaluator + regenerator calls
  created_at timestamptz not null default now()
);

create index if not exists issue_quality_logs_issue_id_idx on issue_quality_logs(issue_id);
