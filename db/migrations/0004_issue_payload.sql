-- AI Signal v2 — Migration 0004
-- Add structured payload columns to issues for the locked 6-section format.
--
-- payload        — auto-generated content (throughline, 6-layer diff, persona, SHK candidates, keep/skip)
-- chosen_calls   — the 3 Ship/Hold/Kill items the human picked at the review step
--
-- Both are JSONB for fast iteration. Final shape lives in code (db/types/database.ts).

alter table issues
  add column if not exists payload jsonb,
  add column if not exists chosen_calls jsonb;

create index if not exists issues_payload_gin on issues using gin (payload);
