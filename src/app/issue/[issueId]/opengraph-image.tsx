// Dynamic OpenGraph card for /issue/[issueId] — Figr palette v3.
// Renders 1200x630 PNG via next/og ImageResponse.
// Inline styles only — next/og does not support Tailwind. Every div with more
// than one direct child sets display:'flex' (next/og requires it).

import { ImageResponse } from 'next/og'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type {
  DeepDivePayload,
  IssuePayload,
  IssueType,
} from '../../../../db/types/database'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'AI Signal — One AI shift that matters'

// Figr palette
const BG = '#0b0d0a'
const CREAM = '#ece7dd'
const CREAM_DIM = '#cfc9bd'
const LIME = '#c2f53d'
const LIME_SOFT = '#9fd44a'
const FG_SUBTLE = '#6b7062'

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

// Signal-bars glyph — render as 4 small lime rectangles (no animation, OG is static)
function SignalBarsStatic() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      <div style={{ width: 4, height: 16, backgroundColor: LIME, borderRadius: 1 }} />
      <div style={{ width: 4, height: 26, backgroundColor: LIME, borderRadius: 1 }} />
      <div style={{ width: 4, height: 20, backgroundColor: LIME, borderRadius: 1 }} />
      <div style={{ width: 4, height: 12, backgroundColor: LIME, borderRadius: 1 }} />
    </div>
  )
}

async function renderImage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params

  let payload: IssuePayload | DeepDivePayload | null = null
  let issueType: IssueType = 'weekly_brief'
  let createdAt: string | null = null

  try {
    const supabase = createAdminSupabaseClient()
    const { data: issue } = await supabase
      .from('issues')
      .select('id, payload, issue_type, created_at')
      .eq('id', issueId)
      .single()
    payload = (issue?.payload as IssuePayload | DeepDivePayload | null) ?? null
    issueType = (issue?.issue_type as IssueType) ?? 'weekly_brief'
    createdAt = issue?.created_at ?? null
  } catch {
    // fall through to fallback
  }

  const frauncesData = await loadFraunces()
  const serifFamily = frauncesData ? 'Fraunces, Georgia, serif' : 'Georgia, serif'

  // Fallback — brand-only card
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
            backgroundColor: BG,
            padding: '80px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: CREAM,
            }}
          >
            <SignalBarsStatic />
            <span>AI SIGNAL</span>
          </div>
          <div
            style={{
              marginTop: 32,
              fontFamily: serifFamily,
              fontSize: 56,
              fontWeight: 700,
              color: CREAM,
              textAlign: 'center',
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            One AI shift that matters. Every Monday.
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

  // Compute issue number
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
    /* keep fallback */
  }

  // Extract title + dek per content type
  const headline =
    issueType === 'deep_dive'
      ? (payload as DeepDivePayload).title
      : (payload as IssuePayload).headline ??
        firstNWords((payload as IssuePayload).throughline ?? '', 7)
  const dek = truncate(
    issueType === 'deep_dive'
      ? (payload as DeepDivePayload).subtitle ?? ''
      : (payload as IssuePayload).throughline ?? '',
    140
  )

  const kindLabel = issueType === 'deep_dive' ? 'DEEP DIVE' : 'MON BRIEF'
  const issueMeta = `ISSUE ${issueNumberPadded} · ${kindLabel}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: BG,
          padding: '72px 80px',
        }}
      >
        {/* Top: wordmark + kind badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: CREAM,
            }}
          >
            <SignalBarsStatic />
            <span>AI SIGNAL</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: LIME,
              border: `1px solid rgba(194,245,61,0.4)`,
              padding: '6px 12px',
            }}
          >
            {kindLabel}
          </div>
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
              color: CREAM,
              lineHeight: 1.04,
              letterSpacing: '-0.015em',
              maxWidth: 1040,
            }}
          >
            {headline}
          </div>
          {dek.length > 0 ? (
            <div
              style={{
                marginTop: 26,
                fontFamily: 'Georgia, serif',
                fontSize: 30,
                fontStyle: 'italic',
                color: CREAM_DIM,
                lineHeight: 1.32,
                maxWidth: 1000,
              }}
            >
              {dek}
            </div>
          ) : null}
        </div>

        {/* Bottom strip: lime rule + meta */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ width: 220, height: 4, backgroundColor: LIME }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 16,
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '0.16em',
                color: LIME_SOFT,
                textTransform: 'uppercase',
              }}
            >
              {issueMeta}
            </div>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 14,
                letterSpacing: '0.14em',
                color: FG_SUBTLE,
                textTransform: 'uppercase',
              }}
            >
              ai-signal-v2.vercel.app
            </div>
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
