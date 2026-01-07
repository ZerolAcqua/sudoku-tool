/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#007acc',
        'user-num': '#0066cc',
        'given-num': '#000000',
        'candidate': '#888888',
      },
    },
  },
  plugins: [],
}

