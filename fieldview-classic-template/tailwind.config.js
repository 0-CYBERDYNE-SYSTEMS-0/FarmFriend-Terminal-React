/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Terminal-inspired color palette
        terminal: {
          bg: '#0a0a0a',
          fg: '#e5e5e5',
          cursor: '#00ff00',
          selection: '#333333',
        },
        semantic: {
          user: '#00bcd4',
          assistant: '#ffffff',
          thinking: '#ff00ff',
          tool: '#ffeb3b',
          error: '#ff5252',
          system: '#9e9e9e',
          success: '#4caf50',
          warning: '#ff9800',
          info: '#2196f3',
        },
        // FieldView Classic colors (agriculture theme by default)
        fieldview: {
          primary: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          accent: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
          },
        },
      },
      fontFamily: {
        terminal: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        display: ['Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
      },
      animation: {
        'blink': 'blink 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-border': 'pulseBorder 1s ease-in-out',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(34, 197, 94, 0.5)' },
          '50%': { borderColor: 'rgba(34, 197, 94, 1)' },
        },
      },
    },
  },
  plugins: [],
}