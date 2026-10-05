/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fbf8f3",
          100: "#f5eee2",
          200: "#e9dac2",
          300: "#dabf99",
          400: "#ca9d6d",
          500: "#bf834b",
          600: "#b1703f",
          700: "#935936",
          800: "#774932",
          900: "#603d2b",
          950: "#341e16",
        },
        navy: {
          900: "#0b1329",
          950: "#050914",
        },
        wine: {
          DEFAULT: "#7a2e35",
          dark: "#5c2026",
          light: "#9c3f47",
        },
        gold: {
          DEFAULT: "#c9a45c",
          light: "#dfbf7a",
          dark: "#a3813c",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
