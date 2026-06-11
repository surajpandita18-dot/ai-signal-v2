// Mobile preview tool — see /issue and /email rendered side-by-side at iPhone
// widths (375px = iPhone 13/14/15 mini, 414px = iPhone Pro Max).
// Open this on desktop to QA mobile rendering without juggling devices.

import { Logo } from '@/components/Logo'

export const dynamic = 'force-dynamic'

const WIDTHS = [375, 414] as const

export default async function MobilePreview({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-ink text-paper">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-6">
          <span className="text-paper">
            <Logo />
          </span>
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-paper/80">
            Mobile preview · issue {issueId.slice(0, 8)}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8">
        <p className="meta">
          Two iframes side by side. Left = the web reader page (`/issue/[id]`).
          Right = the rendered HTML email (`/preview/email/[id]`). Both at
          phone widths so you can spot truncation, overflow, font issues.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {/* WEB READER */}
          <Panel
            title="Web reader page"
            url={`/issue/${issueId}`}
            issueId={issueId}
            kind="web"
          />

          {/* EMAIL */}
          <Panel
            title="HTML email"
            url={`/preview/email/${issueId}`}
            issueId={issueId}
            kind="email"
          />
        </div>
      </main>
    </div>
  )
}

function Panel({
  title,
  url,
  issueId,
  kind,
}: {
  title: string
  url: string
  issueId: string
  kind: 'web' | 'email'
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-heading text-[18px] font-semibold text-ink">
          {title}
        </h2>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent hover:underline"
        >
          Open full →
        </a>
      </div>
      <div className="space-y-6">
        {WIDTHS.map((w) => (
          <div key={w}>
            <p className="mb-2 meta">
              {w}px {w === 375 ? '· iPhone 13 mini / SE' : '· iPhone Pro Max'}
            </p>
            <div
              className="rounded-2xl border-2 border-ink/20 bg-ink/5 p-3 shadow-sm"
              style={{ width: w + 24 }}
            >
              <iframe
                src={url}
                title={`${title} at ${w}px`}
                width={w}
                height={780}
                className="rounded-xl border border-line bg-paper"
                style={{ display: 'block', maxWidth: '100%' }}
                loading="lazy"
                aria-label={`${title} preview at ${w} pixel width`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 meta">Scroll within the frame to see the full page.</p>
    </section>
  )
}
