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
  // Browser chrome matches the Figr v3 dark bg so masthead extends
  // edge-to-edge on iOS Safari.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b0d0a' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d0a' },
  ],
}

// Inline pre-paint script — applies stored theme to <html> BEFORE React
// hydrates so we never flash the wrong palette. Reads localStorage; absent
// or 'system' lets the @media query in globals.css pick the theme.
const themeInitScript = `(function(){try{var t=localStorage.getItem('aisignal_theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Apply theme BEFORE first paint to avoid flash-of-wrong-theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Performance — preconnect to Google Fonts before CSS parses @import */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Accessibility — skip link to main */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-lime focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
