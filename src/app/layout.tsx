import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AI Signal — Weekly AI brief from Bangalore, for builders anywhere',
    template: '%s — AI Signal',
  },
  description:
    'Monday-morning AI synthesis for builders, PMs, and founders worldwide. Frontier APIs, regulation, talent, enterprise deals — written from Bangalore with INR math + DPDP/RBI context you won\'t get in Bay Area newsletters.',
  keywords: [
    'AI newsletter',
    'India AI',
    'AI builders',
    'LLM router',
    'AI for PMs',
    'AI engineering interview',
    'Anthropic',
    'OpenAI',
    'Sarvam',
    'agentic AI',
    'enterprise AI India',
    'DPDP AI',
    'RBI AI regulation',
    'weekly AI brief',
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-signal-v2.vercel.app'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'AI Signal — Weekly AI brief from Bangalore',
    description:
      'Monday-morning AI synthesis for builders, PMs, founders worldwide. One shift, six layers, INR + global context.',
    siteName: 'AI Signal',
    locale: 'en_US',
    alternateLocale: ['en_IN', 'en_GB'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Signal — Weekly AI brief from Bangalore',
    description:
      'Monday-morning AI synthesis for builders worldwide. Frontier APIs + Indian regulation + INR math.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Browser chrome matches the cream-premium bg so masthead extends
  // edge-to-edge on iOS Safari. Site is light-first now (Lenny's-style).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfbf8' },
    { media: '(prefers-color-scheme: dark)', color: '#fcfbf8' },
  ],
}

// Pre-paint script: actively WIPE any stale theme attribute or
// localStorage flag from prior dark-Figr deploys. Users who once had
// data-theme="dark" cached were seeing the dark palette leak under the
// new cream Lenny redesign — this script removes it on every load until
// the dark-Figr cohort cycles out (run for at least 90 days).
const themeInitScript = `(function(){try{document.documentElement.removeAttribute('data-theme');localStorage.removeItem('aisignal_theme');}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Wipe stale dark-theme caches BEFORE first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Performance — preconnect to Google Fonts before CSS parses @import */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Accessibility — skip link to main */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-lime-bright focus:px-4 focus:py-2 focus:text-fg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
