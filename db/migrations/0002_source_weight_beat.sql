-- AI Signal v2 — Migration 0002
-- Adds weight + beat snapshot to raw_items so clustering can compute weighted
-- convergence without re-reading sources.ts at runtime. Also gives historical
-- correctness — re-weighting a source later won't retroactively shift past issues.

alter table raw_items
  add column if not exists weight smallint not null default 1
    check (weight between 1 and 5),
  add column if not exists beat text not null default 'unknown'
    check (beat in (
      'models',
      'agents-tooling',
      'eval-safety',
      'policy',
      'business-funding',
      'india',
      'research',
      'skeptics',
      'unknown'
    ));

create index if not exists raw_items_weight_idx on raw_items (weight desc);
create index if not exists raw_items_beat_idx on raw_items (beat);
