/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          950: '#0B0F19', // Deep midnight/navy base background
          900: '#111827', // Charcoal panel surface
          850: '#151E32', // Elevated panel surface
          800: '#1E293B', // Slate borders & dividers
          750: '#283548', // Subtle border highlight
          700: '#334155', // Muted text & outlines
          600: '#475569', // Secondary text
          500: '#64748B', // Neutral text
          400: '#94A3B8', // High-contrast secondary text
          300: '#CBD5E1', // Primary body text
          200: '#E2E8F0', // Elevated headers
          100: '#F1F5F9', // Crisp primary titles
          50: '#F8FAFC',
        },
        accent: {
          cyan: '#06B6D4',
          'cyan-hover': '#0891B2',
          'cyan-subtle': 'rgba(6, 182, 212, 0.12)',
          violet: '#8B5CF6',
          'violet-hover': '#7C3AED',
          'violet-subtle': 'rgba(139, 92, 246, 0.12)',
          emerald: '#10B981',
          'emerald-subtle': 'rgba(16, 185, 129, 0.12)',
          coral: '#EF4444',
          'coral-subtle': 'rgba(239, 68, 68, 0.12)',
          amber: '#F59E0B',
          'amber-subtle': 'rgba(245, 158, 11, 0.12)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'SFMono-Regular',
          'Consolas',
          'monospace',
        ],
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'flow-signal': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
