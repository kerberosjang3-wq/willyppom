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
          50:  '#f3f6fa',
          100: '#e3eaf4',
          200: '#c4d3e8',
          300: '#97b3d4',
          400: '#6e95bf',
          500: '#507aaa',
          600: '#3d6290',
          700: '#2e4d74',
          800: '#1f3554',
          900: '#131f33',
        },
        surface: {
          DEFAULT: '#131316',
          card:    '#1c1c21',
          hover:   '#242429',
          border:  '#2e2e35',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'Noto Sans KR', 'sans-serif',
        ],
      },
      opacity: {
        '55': '0.55',
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
