import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 14px 40px -24px rgba(2, 6, 23, 0.82)",
        colored: "0 18px 40px -20px rgba(255, 77, 125, 0.5)",
      },
      colors: {
        brand: {
          navy: "#040815",
          pink: "#ff4d7d",
          orange: "#f5ac28",
          coral: "#9b88f5",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
};

export default config;
