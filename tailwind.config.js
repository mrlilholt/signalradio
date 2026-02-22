/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        signal:
          '0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      colors: {
        signal: {
          accent: '#fb7185',
          glow: '#f43f5e',
        },
      },
    },
  },
  plugins: [],
}
