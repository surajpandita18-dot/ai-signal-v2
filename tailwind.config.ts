import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // v3 Figr tokens — canonical
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-raised': 'rgb(var(--bg-raised) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)',
        'cream-dim': 'rgb(var(--cream-dim) / <alpha-value>)',
        lime: 'rgb(var(--lime) / <alpha-value>)',
        'lime-soft': 'rgb(var(--lime-soft) / <alpha-value>)',
        'lime-bright': 'rgb(var(--lime-bright) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--fg-subtle) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',

        // v7 section-accent palette
        'accent-signal': 'rgb(var(--accent-signal) / <alpha-value>)',
        'accent-signal-soft': 'rgb(var(--accent-signal-soft) / <alpha-value>)',
        'accent-explainer': 'rgb(var(--accent-explainer) / <alpha-value>)',
        'accent-explainer-soft': 'rgb(var(--accent-explainer-soft) / <alpha-value>)',
        'accent-standup': 'rgb(var(--accent-standup) / <alpha-value>)',
        'accent-standup-soft': 'rgb(var(--accent-standup-soft) / <alpha-value>)',
        'accent-archive': 'rgb(var(--accent-archive) / <alpha-value>)',
        'accent-archive-soft': 'rgb(var(--accent-archive-soft) / <alpha-value>)',

        // v2 compat — legacy components map through globals.css var mappings
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
      letterSpacing: {
        label: '0.14em',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        serif: 'var(--font-serif-body)',
        mono: 'var(--font-mono)',
      },
      maxWidth: {
        shell: '1180px',
        read: '680px',
        reader: '720px',
        email: '600px',
      },
    },
  },
  plugins: [],
}

export default config
