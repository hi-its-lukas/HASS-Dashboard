import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0b0f1a',
          secondary: '#111827',
          card: '#151c2c',
          cardHover: '#1a2235',
        },
        accent: {
          yellow: '#fbbf24',
          cyan: '#22d3ee',
          green: '#22c55e',
          pink: '#ec4899',
          orange: '#f97316',
          purple: '#a855f7',
          red: '#ef4444',
          blue: '#3b82f6',
        },
        text: {
          primary: '#ffffff',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-yellow': '0 0 20px rgba(251, 191, 36, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
