/** @type {import('tailwindcss').Config} */
// Design tokens follow documents/ui_rules.md: monochrome neutrals (slate) plus the
// 4 semantic status colors used through Tailwind's default green/amber/red/blue ramps.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
