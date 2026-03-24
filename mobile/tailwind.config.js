/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFFFFF',
          dark: '#F5F5F5'
        },
        secondary: {
          red: '#FF0000',
          navy: '#000080'
        },
        tertiary: {
          brown: '#3A2525'
        }
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
