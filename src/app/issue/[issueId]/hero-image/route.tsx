// Dynamic hero banner for /issue/[issueId] — Lenny/Stratechery-style premium
// editorial header rendered via next/og. 1600x500 PNG (banner aspect).
//
// Design intent:
// - Pure white bg with a faint warm radial gradient → cream-premium texture
// - Issue NNN + mono dateline top-left, "AI SIGNAL" wordmark top-right
// - Title HUGE in Fraunces serif, left-aligned, multi-line (auto-wraps)
// - Single lime accent: a vertical stripe on the right edge
// - Byline at bottom: "S" lime-bright avatar + name + city + read time
//
// Deterministic: same payload → same PNG. No LLM image gen.
//
// Satori constraints (next/og's renderer):
// - Every parent with >1 child needs explicit display:'flex' + flexDirection
// - Gradients use `backgroundImage` not `background`
// - Positioned children must declare their own position context

import { ImageResponse } from 'next/og'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type {
  DeepDivePayload,
  IssuePayload,
  IssueType,
} from '../../../../../db/types/database'

export const runtime = 'nodejs'

const SIZE = { width: 1600, height: 500 }

// Cream-premium palette mirrors opengraph-image.tsx
const BG = '#ffffff'
const BG_TINT = '#fcfbf8' // warm cream highlight in the gradient
const INK = '#1a1a1a'
const INK_DIM = '#525250'
const LIME = '#c2f53d'
const LIME_SOFT = '#5a7a18'
const FG_SUBTLE = '#a8a8a3'
const LINE = '#eaeae6'

async function loadFraunces(): Promise<ArrayBuffer | null> {
  try {
    const url =
      'https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap'
    const css = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    }).then((r) => r.text())
    const match = css.match(/url\((https:\/\/[^)]+\.woff2)\)/)
    if (!match) return null
    return await fetch(match[1]).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice
  return cut.trimEnd().replace(/[,.;:—-]$/, '') + '…'
}

function firstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ')
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase()
}

// Word-count → read-time estimate. Same heuristic used in payload-adapter for
// deep dives. Kept local so this route handler stays standalone (next/og runs
// in an isolated worker and we don't want to drag the adapter graph in).
function estimateRead(payload: IssuePayload | DeepDivePayload): string {
  const joined = JSON.stringify(payload)
  const words = joined.split(/\s+/).length
  const min = Math.max(3, Math.round(words / 220))
  return `${min} MIN`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
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

  // Compute issue number — same logic as opengraph-image so the hero matches
  // what the page header displays.
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

  const headline = payload
    ? issueType === 'deep_dive'
      ? (payload as DeepDivePayload).title
      : (payload as IssuePayload).headline ??
        firstNWords((payload as IssuePayload).throughline ?? '', 7)
    : 'AI Signal'

  const kindLabel = issueType === 'deep_dive' ? 'DEEP DIVE' : 'MON BRIEF'
  const dateLabel = fmtDate(createdAt)
  const readLabel = payload ? estimateRead(payload) : '6 MIN'

  const titleText = truncate(headline, 110)
  const titleSize = titleText.length > 60 ? 76 : titleText.length > 40 ? 92 : 108

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: BG,
          backgroundImage: `radial-gradient(ellipse at top left, ${BG_TINT}, ${BG})`,
        }}
      >
        {/* Content column — fills width minus the lime stripe on the right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 1586,
            height: '100%',
            padding: '56px 80px 48px 80px',
          }}
        >
          {/* Top row: issue meta (left) + wordmark (right) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '0.16em',
                color: LIME_SOFT,
                textTransform: 'uppercase',
              }}
            >
              <div style={{ display: 'flex', color: LIME_SOFT }}>
                ISSUE {issueNumberPadded}
              </div>
              <div style={{ display: 'flex', color: FG_SUBTLE }}>·</div>
              <div style={{ display: 'flex', color: INK_DIM }}>{kindLabel}</div>
              {dateLabel ? (
                <>
                  <div style={{ display: 'flex', color: FG_SUBTLE }}>·</div>
                  <div style={{ display: 'flex', color: INK_DIM }}>
                    {dateLabel}
                  </div>
                </>
              ) : null}
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: INK,
              }}
            >
              AI SIGNAL
            </div>
          </div>

          {/* Middle: huge serif title — wraps naturally inside the column.
              flexDirection column makes Satori wrap multi-line text on word
              boundaries instead of cramming it into a single row. */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: serifFamily,
              fontSize: titleSize,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.02,
              letterSpacing: '-0.018em',
              maxWidth: 1320,
            }}
          >
            {titleText}
          </div>

          {/* Bottom row: avatar + byline + read time, separated by a hairline */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: 1,
                backgroundColor: LINE,
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                marginTop: 22,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  backgroundColor: LIME,
                  fontFamily: serifFamily,
                  fontSize: 26,
                  fontWeight: 700,
                  color: INK,
                }}
              >
                S
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontFamily: serifFamily,
                    fontSize: 22,
                    fontWeight: 700,
                    color: INK,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Suraj Pandita
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: 4,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: '0.12em',
                    color: INK_DIM,
                    textTransform: 'uppercase',
                  }}
                >
                  Bangalore · {readLabel} read
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right-edge lime stripe — single functional accent. */}
        <div
          style={{
            display: 'flex',
            width: 14,
            height: '100%',
            backgroundColor: LIME,
          }}
        />
      </div>
    ),
    {
      width: SIZE.width,
      height: SIZE.height,
      fonts: frauncesData
        ? [
            {
              name: 'Fraunces',
              data: frauncesData,
              style: 'normal',
              weight: 700,
            },
          ]
        : undefined,
      headers: {
        // Deterministic per issue payload — CDN can hold the image for a day,
        // SWR for a week. Page edits will not invalidate; that's acceptable
        // since the hero only reflects headline + meta which are stable.
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Type': 'image/png',
      },
    }
  )
}
