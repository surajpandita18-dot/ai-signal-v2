// Dynamic OpenGraph card for /issue/[issueId].
// Renders 1200x630 PNG via next/og ImageResponse using locked design tokens:
//   paper #F4EFE6, ink #121212, peacock #0F4C3A.
// Inline styles only — next/og does not support Tailwind. Every div with more
// than one direct child sets display:'flex' (next/og requires it).

import { ImageResponse } from 'next/og'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { IssuePayload } from '../../../../db/types/database'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'AI Signal — The India AI Builder’s Brief'

const PAPER = '#F4EFE6'
const INK = '#121212'
const PEACOCK = '#0F4C3A'
const INK_70 = 'rgba(18,18,18,0.7)'

async function loadFraunces(): Promise<ArrayBuffer | null> {
  try {
    const url = 'https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap'
    const css = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text())
    const match = css.match(/url\((https:\/\/[^)]+\.woff2)\)/)
    if (!match) return null
    return await fetch(match[1]).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function firstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ')
}

async function renderImage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params

  let payload: IssuePayload | null = null
  let createdAt: string | null = null

  try {
    const supabase = createAdminSupabaseClient()
    const { data: issue } = await supabase
      .from('issues')
      .select('id, payload, created_at')
      .eq('id', issueId)
      .single()
    payload = (issue?.payload as IssuePayload | null) ?? null
    createdAt = issue?.created_at ?? null
  } catch {
    // env not configured or query failed — fall through to fallback below
  }

  const frauncesData = await loadFraunces()
  const serifFamily = frauncesData ? 'Fraunces, Georgia, serif' : 'Georgia, serif'

  // Fallback image: issue/payload missing → brand-only card.
  if (!payload) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PAPER,
            padding: '80px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: INK,
            }}
          >
            <span>AI SIGNAL</span>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: PEACOCK,
                marginLeft: 10,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 32,
              fontFamily: serifFamily,
              fontSize: 56,
              fontWeight: 700,
              color: INK,
              textAlign: 'center',
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            The India AI Builder’s Brief
          </div>
        </div>
      ),
      {
        width: size.width,
        height: size.height,
        fonts: frauncesData
          ? [{ name: 'Fraunces', data: frauncesData, style: 'normal', weight: 700 }]
          : undefined,
      }
    )
  }

  // Compute issue number — count drafted/awaiting_human issues created at or before this one.
  let issueNumberPadded = '001'
  try {
    const supabase = createAdminSupabaseClient()
    const { count } = await supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .in('status', ['drafted', 'awaiting_human'])
      .lte('created_at', createdAt ?? new Date().toISOString())
    issueNumberPadded = String(count ?? 1).padStart(3, '0')
  } catch {
    // keep fallback
  }

  const headline =
    payload.headline && payload.headline.trim().length > 0
      ? payload.headline
      : firstNWords(payload.throughline ?? '', 7)
  const dek = truncate(payload.throughline ?? '', 140)
  const issueMeta = `ISSUE #${issueNumberPadded} · THE INDIA AI BUILDER'S BRIEF`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: PAPER,
          padding: '80px',
        }}
      >
        {/* Top: wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: INK,
          }}
        >
          <span>AI SIGNAL</span>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: PEACOCK,
              marginLeft: 8,
            }}
          />
        </div>

        {/* Hero: headline + dek */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontFamily: serifFamily,
              fontSize: 72,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            {headline}
          </div>
          {dek.length > 0 ? (
            <div
              style={{
                marginTop: 24,
                fontFamily: 'Georgia, serif',
                fontSize: 30,
                fontStyle: 'italic',
                color: INK_70,
                lineHeight: 1.3,
                maxWidth: 980,
              }}
            >
              {dek}
            </div>
          ) : null}
        </div>

        {/* Bottom strip: peacock rule + meta */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ width: 200, height: 6, backgroundColor: PEACOCK }} />
          <div
            style={{
              marginTop: 16,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '0.16em',
              color: PEACOCK,
              textTransform: 'uppercase',
            }}
          >
            {issueMeta}
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts: frauncesData
        ? [{ name: 'Fraunces', data: frauncesData, style: 'normal', weight: 700 }]
        : undefined,
    }
  )
}

export default renderImage
