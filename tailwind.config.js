/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090b',
          900: '#0d0f12',
          800: '#12151a',
          700: '#181c23',
          600: '#1e242d',
          500: '#252d38',
          400: '#2e3846',
        },
        steel: {
          DEFAULT: '#3d8ef0',
          light: '#6aaff5',
          dim: 'rgba(61,142,240,0.15)',
          border: 'rgba(61,142,240,0.25)',
        },
        wire: {
          DEFAULT: '#1f2937',
          light: '#253040',
        },
        signal: {
          green:  '#22c55e',
          yellow: '#eab308',
          orange: '#f97316',
          red:    '#ef4444',
          blue:   '#3d8ef0',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans:    ['var(--font-geist)', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.35s ease forwards',
        'slide-up': 'slideUp 0.35s ease forwards',
        'blink':    'blink 1.2s step-end infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        blink:    { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        pulseDot: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.5, transform: 'scale(0.85)' } },
      },
    },
  },
  plugins: [],
}
