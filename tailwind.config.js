/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#121110',
        card: '#1C1A18',
        line: '#2E2A26',
        text: '#F2EDE6',
        muted: '#A39B91',
        ember: '#E8833A',
        ok: '#4CC38A',
        warn: '#E3B341',
        bad: '#F06A5F',
      },
    },
  },
  plugins: [],
};
