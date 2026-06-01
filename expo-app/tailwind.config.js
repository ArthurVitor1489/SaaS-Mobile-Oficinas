module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#3b66ff', // Match the web simulator branding
          600: '#2544e6',
        }
      }
    },
  },
  plugins: [],
}
