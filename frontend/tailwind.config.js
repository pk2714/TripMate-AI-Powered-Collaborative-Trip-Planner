/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf6",
          100: "#d6f9e8",
          500: "#0f9d68",
          600: "#0b7d53",
          700: "#0a6444",
        },
      },
    },
  },
  plugins: [],
};
