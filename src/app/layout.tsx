import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AI Signal — The India AI Builder’s Brief',
    template: '%s — AI Signal',
  },
  description:
    'A weekly Monday-morning synthesis for Indian AI builders, PMs, and founders. One shift, six layers, INR-grounded.',
  metadataBase: new URL('https://getaisignal.org'),
  openGraph: {
    title: 'AI Signal — The India AI Builder’s Brief',
    description:
      'Mondays. ~1500 words. For Indian AI builders, PMs, founders.',
    siteName: 'AI Signal',
    locale: 'en_IN',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // matches paper light + ink dark — browser chrome blends with the page
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Performance — preconnect to Google Fonts before CSS parses @import */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Accessibility — skip link to main */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
