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
          primary: '#1c1c1e',
          secondary: '#2c2c2e',
          card: 'rgba(44, 44, 46, 0.7)',
          cardHover: 'rgba(58, 58, 60, 0.8)',
          glass: 'rgba(255, 255, 255, 0.08)',
          glassHover: 'rgba(255, 255, 255, 0.12)',
        },
        accent: {
          yellow: '#ffd60a',
          cyan: '#64d2ff',
          green: '#30d158',
          pink: '#ff375f',
          orange: '#ff9f0a',
          purple: '#bf5af2',
          red: '#ff453a',
          blue: '#0a84ff',
        },
        text: {
          primary: '#ffffff',
          secondary: 'rgba(255, 255, 255, 0.7)',
          muted: 'rgba(255, 255, 255, 0.5)',
        },
        border: {
          glass: 'rgba(255, 255, 255, 0.1)',
        },
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 8px 32px rgba(0, 0, 0, 0.3)',
        glass: '0 4px 16px rgba(0, 0, 0, 0.2)',
        glow: '0 0 20px rgba(100, 210, 255, 0.3)',
        'glow-green': '0 0 20px rgba(48, 209, 88, 0.3)',
        'glow-yellow': '0 0 16px rgba(255, 214, 10, 0.4)',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.02em',
      },
      fontWeight: {
        title: '600',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
      },
    },
  },
  plugins: [],
}
export default config
