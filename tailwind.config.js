/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff4ed',
          100: '#ffe8d5',
          200: '#ffccaa',
          300: '#ffa870',
          400: '#ff7a35',
          500: '#ff5a1f',
          600: '#f03d0a',
          700: '#c72d0a',
          800: '#9e2510',
          900: '#7f2111',
        },
        surface: {
          DEFAULT: '#111111',
          card:    '#1c1c1e',
          hover:   '#252527',
          border:  '#2c2c2e',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'Noto Sans KR', 'sans-serif',
        ],
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-in-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'pulse-fast':'pulse 1s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
