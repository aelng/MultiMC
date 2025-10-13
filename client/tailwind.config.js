/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'base': '1.5rem',
      },
      fontFamily: {
        'minecraft': ['Minecraft', 'monospace'],
        'sans': ['Minecraft', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

