import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        accent: 'var(--accent)',
        clay: 'var(--clay)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        'accent-soft': 'var(--accent-soft)',
      },
      fontFamily: {
        body: 'var(--font-body)',
        heading: 'var(--font-heading)',
        mono: 'var(--font-mono)',
      },
      maxWidth: {
        reader: '720px',
        email: '600px',
      },
    },
  },
  plugins: [],
}

export default config
