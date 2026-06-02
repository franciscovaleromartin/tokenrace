import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':       '#14191F',
        'bg-card':       '#14191F',
        'bg-card-hover': '#1a2028',
        'bg-border':     '#1a1a1a',
        'bg-subtle':     '#14191F',
        'text-primary':  '#ffffff',
        'text-secondary':'#888888',
        'text-muted':    '#444444',
        'accent-green':  '#ff6b35',
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
