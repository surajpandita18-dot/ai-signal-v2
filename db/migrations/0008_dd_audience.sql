-- AI Signal v2 — Migration 0008
-- Add primary_audience to deep_dive_candidates so the discovery agent's
-- audience mix (builder / pm / founder / cross-cutting) is queryable
-- + visible on the /review/deep-dive page. CLAUDE.md positioning says
-- PMs are co-equal to builders/founders — we need to enforce balance.

alter table deep_dive_candidates
  add column if not exists primary_audience text default 'cross-cutting'
  check (primary_audience in ('builder', 'pm', 'founder', 'cross-cutting'));

create index if not exists ddc_audience_idx
  on deep_dive_candidates(primary_audience);
