import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':       '#0b1218',
        'bg-card':       '#141d26',
        'bg-card-hover': '#18222d',
        'bg-border':     '#2a3947',
        'bg-subtle':     '#141d26',
        'bg-sidebar':    '#080d12',
        'text-primary':  '#c8d6dd',
        'text-secondary':'#8fa3b0',
        'text-muted':    '#5a6e7a',
        'accent-cyan':   '#00a8e8',
        'accent-green':  '#6bcb77',
        'accent-blue':   '#74cff7',
        'accent-purple': '#c592f0',
        'accent-orange': '#ff8266',
        'accent-teal':   '#00d4aa',
        'accent-yellow': '#f5d36b',
        'accent-red':    '#ff5e5e',
        'link-subtle':   '#3b82a8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
} satisfies Config
