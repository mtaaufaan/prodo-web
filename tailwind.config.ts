import type { Config } from 'tailwindcss'

// PRODO is dark-only (docs/design.md). Tokens are stored as bare oklch
// components (L C H) in src/styles/tokens.css and composed here with
// oklch(var(--x) / <alpha-value>) so Tailwind's opacity modifiers
// (e.g. `bg-primary/90`, used throughout shadcn/ui components) work --
// same pattern shadcn's own HSL-triplet scaffold uses, just with oklch.
function oklchVar(name: string) {
  return `oklch(var(${name}) / <alpha-value>)`
}

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // shadcn/ui semantic roles (mapped in src/index.css)
        border: oklchVar('--border'),
        input: oklchVar('--input'),
        ring: oklchVar('--ring'),
        background: oklchVar('--background'),
        foreground: oklchVar('--foreground'),
        primary: {
          DEFAULT: oklchVar('--primary'),
          foreground: oklchVar('--primary-foreground'),
        },
        secondary: {
          DEFAULT: oklchVar('--secondary'),
          foreground: oklchVar('--secondary-foreground'),
        },
        destructive: {
          DEFAULT: oklchVar('--destructive'),
          foreground: oklchVar('--destructive-foreground'),
        },
        muted: {
          DEFAULT: oklchVar('--muted'),
          foreground: oklchVar('--muted-foreground'),
        },
        accent: {
          DEFAULT: oklchVar('--accent'),
          foreground: oklchVar('--accent-foreground'),
        },
        popover: {
          DEFAULT: oklchVar('--popover'),
          foreground: oklchVar('--popover-foreground'),
        },
        card: {
          DEFAULT: oklchVar('--card'),
          foreground: oklchVar('--card-foreground'),
        },

        // Raw PRODO design tokens (docs/design.md §2) -- for direct utility
        // use (e.g. `bg-mint`, `text-text-dim`, `border-line-strong`) where
        // the shadcn semantic roles above don't apply.
        'bg-deep': oklchVar('--bg-deep'),
        panel: oklchVar('--panel'),
        content: oklchVar('--content'),
        raised: oklchVar('--raised'),
        'raised-2': oklchVar('--raised-2'),
        'input-bg': oklchVar('--input-bg'),
        'accent-wash': oklchVar('--accent-wash'),

        line: oklchVar('--line'),
        'line-strong': oklchVar('--line-strong'),
        'line-subtle': oklchVar('--line-subtle'),

        'text-bone': oklchVar('--text-bone'),
        'text-body': oklchVar('--text-body'),
        'text-muted': oklchVar('--text-muted'),
        'text-dim': oklchVar('--text-dim'),
        'text-faint': oklchVar('--text-faint'),

        signal: oklchVar('--signal'),
        'signal-hover': oklchVar('--signal-hover'),
        mint: oklchVar('--mint'),
        violet: oklchVar('--violet'),
        amber: oklchVar('--amber'),
        red: oklchVar('--red'),
        blue: oklchVar('--blue'),
        grey: oklchVar('--grey'),
        'avatar-rd': oklchVar('--avatar-rd'),

        // Platform Admin — separate namespace, not shared with member app
        'pa-bg': oklchVar('--pa-bg'),
        'pa-header': oklchVar('--pa-header'),
        'pa-border': oklchVar('--pa-border'),
        'pa-accent': oklchVar('--pa-accent'),
        'pa-accent-hover': oklchVar('--pa-accent-hover'),
        'pa-step-active': oklchVar('--pa-step-active'),
      },
      borderRadius: {
        // Radius is 0 everywhere per docs/design.md §4 ("Radius: 0. All
        // rectangles.") -- lg/md/sm all collapse to the same value rather
        // than a calc() offset from zero.
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
