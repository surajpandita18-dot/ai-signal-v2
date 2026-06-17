// Decorative banner for the "Explained Simply" section. 1600x400 PNG.
//
// The hand-drawn-style "illustration" is built from primitive shapes laid out
// via next/og's div primitives (Satori has no <svg> renderer):
//
//   - 3 stacked concentric rings on the right — reads as a "concept core +
//     orbit" diagram (faint dashed outer, dim mid, ink-on-cream inner core)
//   - A small ink dot on the outer orbit as the caret/origin marker
//   - A thin lime tag-bar next to the eyebrow label
//   - A long hairline rule running under the eyebrow → into the concept core
//
// The concept comes from payload.explained_simply.concept. If missing, the
// route falls back to a generic "Explained simply" banner so the <img> never
// 404s and the page can render the section banner unconditionally.
//
// Deterministic: same concept string → same PNG.

import { ImageResponse } from 'next/og'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import type { IssuePayload } from '../../../../../db/types/database'

export const runtime = 'nodejs'

const SIZE = { width: 1600, height: 400 }

const BG = '#ffffff'
const BG_TINT = '#fcfbf8'
const INK = '#1a1a1a'
const INK_DIM = '#525250'
const LIME = '#c2f53d'
const LIME_SOFT = '#5a7a18'
const LINE = '#eaeae6'
const LINE_FAINT = '#f1f0ec'
const FG_SUBTLE = '#a8a8a3'

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params

  let concept = 'Explained simply'
  try {
    const supabase = createAdminSupabaseClient()
    const { data: issue } = await supabase
      .from('issues')
      .select('payload')
      .eq('id', issueId)
      .single()
    const payload = issue?.payload as IssuePayload | null
    const c = payload?.explained_simply?.concept
    if (c && typeof c === 'string') concept = c.replace(/\.$/, '')
  } catch {
    /* fallback */
  }

  const frauncesData = await loadFraunces()
  const serifFamily = frauncesData ? 'Fraunces, Georgia, serif' : 'Georgia, serif'

  const conceptText = truncate(concept, 64)
  const conceptSize = conceptText.length > 36 ? 64 : conceptText.length > 22 ? 80 : 96

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: BG,
          backgroundImage: `radial-gradient(ellipse at bottom right, ${BG_TINT}, ${BG})`,
        }}
      >
        {/* LEFT — eyebrow + concept name + dek */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px 80px',
            width: 1100,
            height: '100%',
          }}
        >
          {/* Eyebrow stack */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: LIME_SOFT,
              textTransform: 'uppercase',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 28,
                height: 4,
                backgroundColor: LIME,
              }}
            />
            <div style={{ display: 'flex' }}>Explained simply</div>
          </div>

          {/* Concept name. Satori needs an explicit width on text-only divs
              with multi-line content so it can compute wrap + reserve
              vertical space; without width the renderer treats the text as
              a single overflow row which collides with the dek below. */}
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontFamily: serifFamily,
              fontSize: conceptSize,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.04,
              letterSpacing: '-0.018em',
              width: 980,
            }}
          >
            {conceptText}.
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontFamily: 'Georgia, serif',
              fontSize: 22,
              fontStyle: 'italic',
              color: INK_DIM,
              lineHeight: 1.4,
              width: 880,
            }}
          >
            In plain English, no jargon — the way you&apos;d say it to a
            friend over chai.
          </div>

          {/* Faint provenance tag at the foot of the left column */}
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.18em',
              color: FG_SUBTLE,
              textTransform: 'uppercase',
            }}
          >
            AI Signal · {issueId.slice(0, 8)}
          </div>
        </div>

        {/* RIGHT — concept-core diagram. Concentric rings nested as a flex
            column so every parent has at most one child where possible. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 500,
            height: '100%',
          }}
        >
          {/* Outer dashed ring */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 340,
              height: 340,
              borderRadius: 999,
              border: `1px dashed ${LINE}`,
            }}
          >
            {/* Mid solid ring */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 240,
                height: 240,
                borderRadius: 999,
                border: `1px solid ${LINE_FAINT}`,
              }}
            >
              {/* Inner ink ring */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 140,
                  height: 140,
                  borderRadius: 999,
                  border: `2px solid ${INK_DIM}`,
                  backgroundColor: BG_TINT,
                }}
              >
                {/* Lime core */}
                <div
                  style={{
                    display: 'flex',
                    width: 60,
                    height: 60,
                    borderRadius: 999,
                    backgroundColor: LIME,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
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
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Type': 'image/png',
      },
    }
  )
}
