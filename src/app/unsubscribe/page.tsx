// /unsubscribe?token=... or ?email=...
// Referenced from every email footer's List-Unsubscribe link.
// Marks the subscriber inactive then renders confirmation.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Unsubscribed',
  description: 'You’ve been removed from AI Signal.',
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; issue?: string }>
}) {
  const params = await searchParams
  const token = params.token
  const email = params.email
  let outcome: 'removed' | 'already' | 'invalid' | 'error' = 'invalid'

  if (token || email) {
    const supabase = createAdminSupabaseClient()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('subscribers' as any) as any)
        .select('email, status')
        .or(
          token
            ? `unsubscribe_token.eq.${token}`
            : `email.eq.${email}`
        )
        .limit(1)
        .single()
      if (!existing) {
        outcome = 'invalid'
      } else if (existing.status !== 'active') {
        outcome = 'already'
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updErr } = await (supabase.from('subscribers' as any) as any)
          .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
          .eq('email', existing.email)
        outcome = updErr ? 'error' : 'removed'
      }
    } catch {
      outcome = 'error'
    }
  }

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <SiteNav />

      <main className="mx-auto max-w-read px-5 py-20 sm:px-8 sm:py-28">
        <div className="font-mono text-[11px] tracking-label text-lime-soft">
          ONE-TAP UNSUBSCRIBE
        </div>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-fg sm:text-[52px]">
          {outcome === 'removed' && 'You’re out.'}
          {outcome === 'already' && 'Already off the list.'}
          {outcome === 'invalid' && 'That link expired.'}
          {outcome === 'error' && 'Something broke.'}
        </h1>

        <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-fg-muted">
          {outcome === 'removed' &&
            'No more Mondays. No goodbye email. You can resubscribe any time. If you’re leaving because the brief stopped being useful, reply to any past issue and tell me why — I read every one.'}
          {outcome === 'already' &&
            'You were already unsubscribed. Nothing to do. Resubscribe any time below.'}
          {outcome === 'invalid' &&
            'The unsubscribe token didn’t match any active subscriber. If you’re still getting emails, paste your address below or reply to any issue and I’ll remove you manually.'}
          {outcome === 'error' &&
            'The database refused the update. Reply to any past issue and I’ll remove you manually.'}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/"
            className="group inline-flex min-h-[44px] items-center gap-2 bg-lime-bright px-6 py-3.5 font-mono text-[13px] font-semibold tracking-[0.04em] text-fg"
          >
            BACK TO AI SIGNAL
            <ArrowRight
              size={15}
              strokeWidth={2.25}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          {outcome === 'removed' || outcome === 'already' ? (
            <Link
              href="/subscribe"
              className="inline-flex min-h-[44px] items-center self-center font-mono text-[12px] tracking-label text-fg-muted transition-colors hover:text-fg"
            >
              CHANGED YOUR MIND? RESUBSCRIBE →
            </Link>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
