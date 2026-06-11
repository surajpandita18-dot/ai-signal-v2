-- AI Signal v2 — Phase 1 schema
-- Four tables. No RLS yet (service-role only in Phase 1).
-- Public reads / subscribers / auth come in Phase 4.

create extension if not exists "pgcrypto";

-- 1. raw_items — every normalized item pulled from a feed
create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid,                                   -- nullable; set when an issue claims this window
  source text not null,                            -- e.g. 'openai', 'marktechpost', 'hn-frontpage'
  tier text not null check (tier in ('A', 'B', 'C')),
  url text not null,
  title text not null,
  excerpt text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (url)
);

create index if not exists raw_items_issue_id_idx on raw_items (issue_id);
create index if not exists raw_items_published_at_idx on raw_items (published_at desc);
create index if not exists raw_items_tier_idx on raw_items (tier);

-- 2. clusters — semantic groupings produced in Stage 2
create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null,
  label text not null,                             -- short human-readable name for the cluster
  item_ids jsonb not null default '[]'::jsonb,     -- array of raw_items.id
  convergence_score int not null default 0,        -- count of distinct sources in cluster
  set_aside boolean not null default false,        -- true = not used for candidates ("what we set aside")
  created_at timestamptz not null default now()
);

create index if not exists clusters_issue_id_idx on clusters (issue_id);

-- 3. candidates — the 2-3 throughline options produced in Stage 3
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null,
  position int not null,                           -- 1, 2, 3
  throughline text not null,                       -- the one-line shift
  proof_cluster_ids jsonb not null default '[]'::jsonb,
  reasoning text not null,                         -- "why these dots point here"
  obvious_or_not text not null check (obvious_or_not in ('obvious', 'non-obvious', 'unclear')),
  obvious_reason text,                             -- the synthesizer's self-justification
  chosen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists candidates_issue_id_idx on candidates (issue_id);

-- 4. issues — the run itself, status machine + final output pointer
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'sourcing' check (status in (
    'sourcing',
    'clustering',
    'synthesizing',
    'awaiting_human',
    'drafting',
    'drafted',
    'failed',
    'no_signal'                                    -- "this week is genuinely quiet" (CLAUDE.md rule #3)
  )),
  chosen_candidate_id uuid,                        -- FK to candidates when human picks
  chosen_throughline_override text,                -- set if Suraj writes his own, rejecting all 3
  markdown_path text,                              -- e.g. 'output/issues/issue-001.md'
  failure_reason text,
  set_aside_count int default 0,                   -- surfaced in Stage 3
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at autobump
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists issues_updated_at on issues;
create trigger issues_updated_at
before update on issues
for each row execute function set_updated_at();
