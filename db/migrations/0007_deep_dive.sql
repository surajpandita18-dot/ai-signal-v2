-- AI Signal v2 — Migration 0007
-- Additive support for the deep-dive content track. Weekly brief schema
-- is untouched. Existing rows default to issue_type='weekly_brief'.

alter table issues
  add column if not exists issue_type text not null default 'weekly_brief'
  check (issue_type in ('weekly_brief', 'deep_dive'));

create index if not exists issues_type_idx on issues(issue_type);

-- Deep-dive topic discovery candidates. Topic discovery agent writes
-- 5 rows per fortnight; owner picks one at /review/deep-dive.
create table if not exists deep_dive_candidates (
  id uuid primary key default gen_random_uuid(),
  discovered_at timestamptz not null default now(),
  assumption_challenged text not null,
  one_paragraph_hook text not null,
  evidence_anchor_urls jsonb not null default '[]'::jsonb,
  score int check (score between 1 and 10),
  chosen boolean not null default false,
  chosen_issue_id uuid references issues(id),
  rejection_reason text
);

create index if not exists ddc_chosen_idx on deep_dive_candidates(chosen);
create index if not exists ddc_discovered_at_idx on deep_dive_candidates(discovered_at desc);
