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
        mist: '#F4F7FA',
        warm: '#FBFAF7',
        coral: '#F2765B',
        ink: '#1B2A3A',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,33,55,.04), 0 6px 20px -8px rgba(13,33,55,.08)',
        lift: '0 2px 4px rgba(13,33,55,.06), 0 18px 40px -12px rgba(13,33,55,.18)',
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.25rem' },
    },
  },
  plugins: [],
};
