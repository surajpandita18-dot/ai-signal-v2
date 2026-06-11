-- AI Signal v2 — Migration 0005
-- Email subscribers. No auth — opt-in only via /subscribe form.

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced')),
  unsubscribe_token uuid not null default gen_random_uuid(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists subscribers_status_idx on subscribers (status);
create index if not exists subscribers_email_idx on subscribers (email);
