# AI Signal v2

Periodic synthesis brief for Indian AI builders, PMs, and founders. One throughline per issue, 2-3 attached proof points, keep/skip, do-this, closure.

See [`ai-signal-v2-build-spec.md`](./ai-signal-v2-build-spec.md) for the full spec, and [`CLAUDE.md`](./CLAUDE.md) for build rules.

## Phase 1 — Minimum issue generator

Stages 1→3 + human gate + Stage 4 draft, outputting markdown. Run locally; no production deploy yet.

### Setup

```bash
pnpm install        # or npm install
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#         SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
```

Run the Supabase migration in `db/migrations/0001_init.sql` against your project (paste into the SQL editor or use the Supabase CLI).

### Local dev (full pipeline — once steps 5-10 are built)

```bash
# Terminal 1
pnpm dev

# Terminal 2
npx inngest-cli@latest dev
```

Trigger an issue, then open `http://localhost:3000/review/<issueId>` to pick the throughline.

### Stage 1 smoke test (works now)

```bash
pnpm smoke:source
```

Pulls the last 48h (7d for Tier C) from all configured feeds and writes them to `raw_items`. Prints per-source counts.
