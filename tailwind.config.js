/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vocal: '#f9a8d4',
        dance: '#93c5fd',
        visual: '#fbbf24',
        assist: '#34d399',
      },
    },
  },
  plugins: [],
}
