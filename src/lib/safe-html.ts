// Shared HTML escapers + URL safe-list + markdown inline-render used by
// every surface (web payload-adapter + weekly email + deep-dive email).
// Centralizing these helpers ensures synthesizer-emitted markdown renders
// the same way across web and email, and that URL allow-listing happens in
// exactly one place.
//
// Used by:
//   - src/components/article/payload-adapter.ts (re-exports locally for now)
//   - src/lib/email-template.ts
//   - src/lib/deep-dive-email.ts

// Escapes all five XML/HTML special characters — element bodies AND attribute
// contexts (`href="${escapeHtml(url)}"`) both require quote escaping to be
// safe against untrusted synthesizer output.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Allow-list URL schemes that flow into `href="..."` via
// dangerouslySetInnerHTML. escapeHtml() neutralizes attribute breakout but
// not `javascript:` / `data:` schemes. The /issue/[id] page is publicly
// archived after send — a malicious synthesizer-supplied source URL would
// otherwise become a live XSS sink.
export function safeUrl(url: string): string {
  const trimmed = url.trim()
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return '#'
}

// Multi-paragraph inline render for the email surface. Splits on blank-line
// paragraph breaks, runs inline() on each piece, and emits REAL <p> tags so
// Outlook (Word engine) doesn't collapse consecutive <br> tags into a single
// line break. Call sites pass the inline style string used on every <p>;
// callers should NOT wrap the result in their own <p>.
export function paraInline(
  s: string | null | undefined,
  inlineStyle = '',
  className = ''
): string {
  if (!s) return ''
  const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : ''
  const classAttr = className ? ` class="${className}"` : ''
  return s
    .split(/\n\s*\n/)
    .map((p) => inline(p.trim()))
    .filter(Boolean)
    .map((html) => `<p${styleAttr}${classAttr}>${html}</p>`)
    .join('')
}

// Tiny markdown → HTML for inline [text](url), _em_, **strong**. Escapes
// first, then tokenizes links into HTML-comment sentinels (immune to the
// `_` / `**` regex sweeps that would otherwise corrupt URLs containing
// underscores or asterisks), runs em/strong on remaining text, then re-emits.
//
// Optional `anchorClass` — when set, every emitted `<a>` gets `class="..."`.
// Email surfaces pass `'body-link'` so the inline-style `<style>` rule colors
// links lime (Gmail/Yahoo default-blue otherwise overrides body color).
export function inline(s: string, anchorClass?: string): string {
  const escaped = escapeHtml(s)
  const stash: string[] = []
  const classAttr = anchorClass ? ` class="${anchorClass}"` : ''
  const withPlaceholders = escaped.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text: string, rawUrl: string) => {
      // rawUrl was already escapeHtml'd — unescape only what we produced so
      // safeUrl sees the original scheme, then re-escape after the allow-list.
      const unescapedForCheck = rawUrl
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      const safe = escapeHtml(safeUrl(unescapedForCheck))
      const idx = stash.length
      stash.push(
        `<a href="${safe}"${classAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
      )
      return `<!--__LINK_${idx}__-->`
    }
  )
  const withMarks = withPlaceholders
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
  return withMarks.replace(
    /<!--__LINK_(\d+)__-->/g,
    (_m, n: string) => stash[Number(n)]
  )
}
