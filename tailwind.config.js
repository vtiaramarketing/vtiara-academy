/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0D2137', 700: '#14304d', 600: '#1b3f62' },
        teal: { DEFAULT: '#1A6B8A', dark: '#14566f' },
        accent: { DEFAULT: '#2A9DBB', dark: '#2289a5' },
        gold: { DEFAULT: '#F5C300', soft: '#FFF6CC' },
        pale: '#EEF6FA',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,33,55,.05), 0 8px 24px -8px rgba(13,33,55,.10)',
        lift: '0 2px 4px rgba(13,33,55,.06), 0 18px 40px -12px rgba(13,33,55,.18)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
    },
  },
  plugins: [],
};
