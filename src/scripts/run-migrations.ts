// Apply pending migrations from db/migrations/*.sql.
//
// Derives the Postgres connection string from NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_DB_PASSWORD (Supabase Dashboard → Settings → Database). Tracks
// applied migrations in a `_migrations` table so re-runs are idempotent.
//
// Usage:
//   npx tsx src/scripts/run-migrations.ts          # apply all pending
//   npx tsx src/scripts/run-migrations.ts --check  # list pending, no apply
//
// One-time setup: add SUPABASE_DB_PASSWORD to .env.local. After that,
// every new migration auto-applies on next `run-migrations` invocation.

import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { Client } from 'pg'
import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

loadDotenv({ path: '.env.local', override: true })

function getConnectionString(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!url) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
    process.exit(1)
  }
  if (!password) {
    console.error(`
Missing SUPABASE_DB_PASSWORD in .env.local — one-time setup needed.

1. Supabase Dashboard → Settings → Database
2. Copy your database password (the one you set when creating the project)
3. Add to .env.local:

   SUPABASE_DB_PASSWORD=<paste here>

After this, all future migrations auto-apply with no manual SQL Editor.
`)
    process.exit(1)
  }
  // Extract project ref from URL: https://<ref>.supabase.co
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (!m) {
    console.error(`Cannot extract project ref from ${url}`)
    process.exit(1)
  }
  const ref = m[1]
  // Use the connection pooler so we can connect from outside Supabase egress.
  // Session-mode (port 5432 for direct, 6543 for transaction pooler).
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
}

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations')

async function main() {
  const check = process.argv.includes('--check')
  const connectionString = getConnectionString()
  const client = new Client({ connectionString })
  await client.connect()

  try {
    // Ensure tracking table exists
    await client.query(`
      create table if not exists _migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `)

    const allFiles = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    const { rows: appliedRows } = await client.query<{ filename: string }>(
      'select filename from _migrations'
    )
    const applied = new Set(appliedRows.map((r) => r.filename))

    const pending = allFiles.filter((f) => !applied.has(f))

    if (pending.length === 0) {
      console.log(`✓ All ${allFiles.length} migrations applied. Nothing to do.`)
      return
    }

    console.log(`Pending migrations (${pending.length}):`)
    for (const f of pending) console.log(`  - ${f}`)

    if (check) {
      console.log('\n(--check mode, not applying)')
      return
    }

    for (const filename of pending) {
      const path = join(MIGRATIONS_DIR, filename)
      const sql = readFileSync(path, 'utf-8')
      console.log(`\n▶ Applying ${basename(filename)}…`)
      try {
        await client.query('begin')
        await client.query(sql)
        await client.query('insert into _migrations (filename) values ($1)', [filename])
        await client.query('commit')
        console.log(`  ✓ ${filename}`)
      } catch (err) {
        await client.query('rollback')
        const msg = err instanceof Error ? err.message : String(err)
        // If the table/column already exists from a manual run, register the
        // migration as applied so we don't keep retrying.
        if (/already exists/i.test(msg)) {
          await client.query(
            'insert into _migrations (filename) values ($1) on conflict do nothing',
            [filename]
          )
          console.log(`  ⊙ ${filename} — schema already present, marked applied`)
          continue
        }
        console.error(`  ✗ ${filename} — ${msg}`)
        throw err
      }
    }
    console.log(`\n✓ Applied ${pending.length} migration(s).`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
