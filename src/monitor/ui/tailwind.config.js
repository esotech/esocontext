/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom color palette for the monitor UI
        monitor: {
          bg: {
            primary: '#0f172a',    // slate-900
            secondary: '#1e293b',  // slate-800
            tertiary: '#334155',   // slate-700
          },
          accent: {
            blue: '#3b82f6',       // blue-500
            green: '#22c55e',      // green-500
            yellow: '#eab308',     // yellow-500
            red: '#ef4444',        // red-500
            purple: '#a855f7',     // purple-500
            cyan: '#06b6d4',       // cyan-500
          },
          text: {
            primary: '#f8fafc',    // slate-50
            secondary: '#cbd5e1',  // slate-300
            muted: '#64748b',      // slate-500
          },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
