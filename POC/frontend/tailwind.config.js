/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        museum: {
          dark: '#0f172a',
          card: '#1e293b',
          gold: '#f59e0b',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
