import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':       '#000000',
        'bg-card':       '#0d0d0d',
        'bg-card-hover': '#141414',
        'bg-border':     '#1a1a1a',
        'bg-subtle':     '#111111',
        'text-primary':  '#ffffff',
        'text-secondary':'#888888',
        'text-muted':    '#444444',
        'accent-green':  '#00ff88',
        'accent-blue':   '#4da6ff',
        'accent-purple': '#a855f7',
        'accent-orange': '#ff6b35',
        'accent-teal':   '#00d4aa',
        'accent-yellow': '#fbbf24',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
} satisfies Config
