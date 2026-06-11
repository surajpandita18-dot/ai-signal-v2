// Server-only — reads the subscription cookie set by /api/subscribe.
// Use this in server components to suppress Subscribe CTAs across the site
// once the visitor has subscribed (or visited subscribe again).

import { cookies } from 'next/headers'

export async function isSubscribed(): Promise<boolean> {
  const c = await cookies()
  return c.get('aisignal_sub')?.value === '1'
}
