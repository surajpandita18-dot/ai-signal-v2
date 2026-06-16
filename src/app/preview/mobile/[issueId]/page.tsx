// Mobile preview tool — see /issue and /email rendered side-by-side at iPhone
// widths. Open on desktop to QA mobile rendering without juggling devices.
// Figr palette v3.

import { Logo } from '@/components/Logo'

export const dynamic = 'force-dynamic'

const WIDTHS = [390, 414] as const

export default async function MobilePreview({
  params,
}: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await params
  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <header className="border-b border-line bg-bg-raised">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-6">
          <Logo />
          <p className=" text-[11px] font-medium tracking-[0.08em] text-lime-soft">
            MOBILE PREVIEW · ISSUE {issueId.slice(0, 8)}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8">
        <p className=" text-[11px] font-medium tracking-[0.08em] text-fg-subtle">
          Two iframes side by side. Left = the web reader page (/issue/[id]).
          Right = the rendered HTML email (/preview/email/[id]). Both at
          phone widths so you can spot truncation, overflow, font issues.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <Panel title="WEB READER" url={`/issue/${issueId}`} />
          <Panel title="HTML EMAIL" url={`/preview/email/${issueId}`} />
        </div>
      </main>
    </div>
  )
}

function Panel({ title, url }: { title: string; url: string }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className=" text-[12px] font-medium tracking-[0.08em] text-fg">{title}</h2>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className=" text-[11px] font-medium tracking-[0.08em] text-lime hover:text-fg"
        >
          OPEN FULL →
        </a>
      </div>
      <div className="space-y-6">
        {WIDTHS.map((w) => (
          <div key={w}>
            <p className="mb-2  text-[11px] font-medium tracking-[0.08em] text-fg-subtle">
              {w}PX · {w === 390 ? 'IPHONE 13' : 'IPHONE PRO MAX'}
            </p>
            <div
              className="border border-line-strong bg-card p-3"
              style={{ width: w + 24 }}
            >
              <iframe
                src={url}
                title={`${title} at ${w}px`}
                width={w}
                height={780}
                className="block border border-line bg-bg"
                style={{ maxWidth: '100%' }}
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3  text-[11px] font-medium tracking-[0.08em] text-fg-subtle">
        SCROLL WITHIN THE FRAME TO SEE THE FULL PAGE.
      </p>
    </section>
  )
}
