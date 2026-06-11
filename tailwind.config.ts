import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        'paper-elev': 'rgb(var(--paper-elev) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-2': 'rgb(var(--accent-2) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        serif: 'var(--font-serif-body)',
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
