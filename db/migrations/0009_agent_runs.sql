-- AI Signal v2 — Migration 0009
-- Multi-agent editorial pipeline audit trail. Each run of an agent stage
-- (analyst / chief / fact-checker / readability / persona panel /
-- correction loop iteration) appends ONE row here so a mid-pipeline crash
-- leaves forensics + we can debug voice drift / cost spikes across issues.
--
-- Spec: .claude/architecture-multi-agent-pipeline.md → Section D.
--
-- Distinct from `issue_quality_logs` which is the FINAL rubric scoring;
-- this table is per-AGENT per-ROUND, much more granular.

create table if not exists issue_agent_runs (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  agent text not null,                          -- 'analyst' | 'editorial' | 'chief' | 'factcheck' | 'readability' | 'persona:priya' | 'persona:marcus' | …
  round int not null default 0,                 -- 0 = initial pass, 1+ = correction-loop iteration
  output jsonb not null,                        -- full agent return value (structured)
  model text not null,                          -- e.g. 'claude-opus-4-7'
  input_tokens int default 0,
  output_tokens int default 0,
  cache_creation_tokens int default 0,
  cache_read_tokens int default 0,
  latency_ms int,
  created_at timestamptz not null default now()
);

create index if not exists issue_agent_runs_issue_id_idx
  on issue_agent_runs(issue_id);
create index if not exists issue_agent_runs_agent_idx
  on issue_agent_runs(issue_id, agent, round);

-- Snapshot the pre-rerun payload before agents overwrite it, so
-- `rerun-pipeline.ts --skip-editorial` and the diff view at
-- /review/<id>?compare=previous can show what changed.
create table if not exists issue_payload_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  snapshot jsonb not null,
  reason text not null,                         -- 'rerun-pipeline' | 'editorial-v2' | …
  archived_at timestamptz not null default now()
);

create index if not exists issue_payload_history_issue_id_idx
  on issue_payload_history(issue_id, archived_at desc);
