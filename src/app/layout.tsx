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
