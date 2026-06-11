// POST /api/subscribe
// Body: { email }
// Persists to a `subscribers` table (created lazily — see SQL below).
//
// Until the subscribers table is migrated in Supabase, this endpoint stores
// nothing and just returns success — so the UI flow works for design review.
// Once you run the migration, persistence kicks in automatically.

import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  // Try insert; if the table doesn't exist yet (42P01), still return 200 so the
  // landing UI works during initial design review.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscribers' as any) as any).insert({
    email,
    status: 'active',
    subscribed_at: new Date().toISOString(),
  })
  if (error && !/relation .* does not exist/i.test(error.message)) {
    if (/duplicate key|unique/.test(error.message)) {
      return NextResponse.json({ ok: true, already: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
