-- AI Signal v2 — Migration 0003
-- Re-cast the beat enum on raw_items to match the locked 6-layer product positioning.
--
-- OLD: models · agents-tooling · eval-safety · policy · business-funding · india · research · skeptics
-- NEW: frontier-api · india-infra · regulation · indic-models · talent-comp · enterprise-deals
--
-- Old-to-new mapping for existing rows:
--   models, agents-tooling      → frontier-api
--   eval-safety, research       → frontier-api
--   policy                      → regulation
--   business-funding            → enterprise-deals
--   india                       → india-infra
--   skeptics                    → frontier-api
--   unknown                     → frontier-api
--
-- ORDER MATTERS: drop the old constraint BEFORE running UPDATEs that set the new
-- enum values. Otherwise the UPDATEs fail under the still-active old check.

-- 1. Drop the old check constraint FIRST so UPDATEs to new values are allowed.
alter table raw_items drop constraint if exists raw_items_beat_check;

-- 2. Map existing rows to new vocabulary.
update raw_items set beat = 'frontier-api'      where beat in ('models', 'agents-tooling', 'eval-safety', 'research', 'skeptics', 'unknown');
update raw_items set beat = 'regulation'        where beat = 'policy';
update raw_items set beat = 'enterprise-deals'  where beat = 'business-funding';
update raw_items set beat = 'india-infra'       where beat = 'india';

-- 3. Install the new check constraint.
alter table raw_items add constraint raw_items_beat_check check (beat in (
  'frontier-api',
  'india-infra',
  'regulation',
  'indic-models',
  'talent-comp',
  'enterprise-deals'
));

-- 4. Default for newly-inserted rows.
alter table raw_items alter column beat set default 'frontier-api';
