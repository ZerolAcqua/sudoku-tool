/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: 'var(--color-accent)',
        'accent-dark': 'var(--color-accent-dark)',
        'given-num': 'var(--color-given-num)',
        'user-num': 'var(--color-user-num)',
        'cand': 'var(--color-cand)',
      },
    },
  },
  plugins: [],
}

