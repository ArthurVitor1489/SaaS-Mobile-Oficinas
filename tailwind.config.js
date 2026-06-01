/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern premium colors
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#adc2ff',
          400: '#7599ff',
          500: '#3b66ff', // Rich Royal Blue
          600: '#2544e6',
          700: '#1c30bf',
          800: '#1a2799',
          900: '#1b247a',
          950: '#10144d',
        },
        success: {
          50: '#ecfdf5',
          500: '#10b981', // Emerald Green
          600: '#059669',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b', // Amber/Orange
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444', // Coral Red
          600: '#dc2626',
        },
        dark: {
          50: '#f6f6f7',
          100: '#eef0f3',
          200: '#d8dce2',
          300: '#b5bdc9',
          400: '#8c98aa',
          500: '#6e7a8e',
          600: '#586376',
          700: '#485060',
          800: '#2c313c',
          900: '#1d2026', // Deep Charcoal
          950: '#0f1115', // Pure Slate Dark
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'premium': '0 10px 30px -10px rgba(59, 102, 255, 0.15)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
