/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: {
          light: "#edf2e9",
          dark: "#090d12",
        },
        surface: {
          light: "#f8fbf5",
          dark: "#121821",
        },
        soft: {
          light: "#e2e9dc",
          dark: "#18212c",
        },
        soft2: {
          light: "#d8e1d1",
          dark: "#253140",
        },
        ink: {
          light: "#121a2d",
          dark: "#f4f7ef",
        },
        muted: {
          light: "#7c8578",
          dark: "#8f9aa8",
        },
        accent: {
          DEFAULT: "#2563eb",
          dark: "#60a5fa",
        },
        lime: "#a9e84b",
        yellow: "#f7dc19",
        navy: "#172442",
        mint: "#bde4c0",
        lilac: "#ddd3f2",
      },
      fontFamily: {
        urbanist: ["Urbanist_600SemiBold", "sans-serif"],
        "urbanist-bold": ["Urbanist_700Bold", "sans-serif"],
        "urbanist-extrabold": ["Urbanist_800ExtraBold", "sans-serif"],
      },
    },
  },
  plugins: [],
};
